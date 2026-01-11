import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

// Verify user is a creator (has a creator shop)
async function assertCreator(token: string) {
    const admin = getSupabaseAdminClient();
    const { data: userRes, error } = await admin.auth.getUser(token);
    if (error || !userRes.user) return null;

    // Check if user has a creator shop
    const { data: shop } = await admin
        .from('creator_shops')
        .select('id')
        .eq('user_id', userRes.user.id)
        .maybeSingle();

    return shop ? userRes.user : null;
}

function buildPrompt(templateType: string) {
    return `You are an expert at creating product metadata for digital templates sold on a creative marketplace.

Given the template type: "${templateType}"

Generate compelling and SEO-optimized content for this template. Return a JSON object with these exact keys:
{
  "name": "A catchy, professional title (max 60 chars)",
  "subtitle": "A brief tagline that highlights the value (max 100 chars)",
  "description": "A detailed product description (150-300 chars) explaining what the template includes and its use cases",
  "tags": ["array", "of", "5-10", "relevant", "search", "keywords"],
  "features": ["array", "of", "4-8", "key", "features", "like", "4K Resolution", "No Plugins Required", "Easy Customization"],
  "software": ["array", "of", "compatible", "software", "like", "After Effects 2024", "Premiere Pro"],
  "plugins": ["array", "of", "required", "plugins", "or", "empty", "if", "none"]
}

Make the content professional, engaging, and optimized for discoverability. Focus on benefits to the buyer.
Respond ONLY with the JSON object, no additional text.`;
}

export async function POST(req: Request) {
    try {
        const auth = req.headers.get('authorization') || '';
        const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
        if (!token) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const me = await assertCreator(token);
        if (!me) {
            return NextResponse.json({ ok: false, error: 'Forbidden - Creator shop required' }, { status: 403 });
        }

        const { templateType } = await req.json();
        if (!templateType || typeof templateType !== 'string' || templateType.trim().length === 0) {
            return NextResponse.json({ ok: false, error: 'Template type is required' }, { status: 400 });
        }

        const admin = getSupabaseAdminClient();

        // Load API key from Supabase settings table only
        let apiKey = '';
        try {
            const { data } = await admin.from('settings').select('value').eq('key', 'GEMINI_FLASH_API_KEY').maybeSingle();
            if (data?.value) apiKey = data.value;
        } catch { }

        if (!apiKey) {
            return NextResponse.json({ ok: false, error: 'Missing Gemini API key' }, { status: 500 });
        }

        const prompt = buildPrompt(templateType.trim());

        // Initialize Google GenAI client
        const ai = new GoogleGenAI({ apiKey });

        // Gemini 2.5 Flash API call using SDK
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const candidates = response.text || '';

        let parsed: any = null;
        try {
            parsed = JSON.parse(candidates);
        } catch {
            // Try to extract JSON block from response
            const match = candidates.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    parsed = JSON.parse(match[0]);
                } catch { }
            }
        }

        if (!parsed || typeof parsed !== 'object') {
            return NextResponse.json({ ok: false, error: 'Failed to parse Gemini response' }, { status: 500 });
        }

        // Normalize and validate the response
        const result = {
            name: String(parsed.name || '').slice(0, 100),
            subtitle: String(parsed.subtitle || '').slice(0, 150),
            description: String(parsed.description || '').slice(0, 500),
            tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: any) => String(t).trim()).filter(Boolean) : [],
            features: Array.isArray(parsed.features) ? parsed.features.map((t: any) => String(t).trim()).filter(Boolean) : [],
            software: Array.isArray(parsed.software) ? parsed.software.map((t: any) => String(t).trim()).filter(Boolean) : [],
            plugins: Array.isArray(parsed.plugins) ? parsed.plugins.map((t: any) => String(t).trim()).filter(Boolean) : [],
        };

        return NextResponse.json({ ok: true, result });
    } catch (e: any) {
        console.error('Autofill error:', e);
        return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
    }
}
