import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';

async function assertAdmin(token: string) {
  const admin = getSupabaseAdminClient();
  const { data: userRes, error } = await admin.auth.getUser(token);
  if (error || !userRes.user) return null;
  const { data } = await admin.from('admins').select('user_id').eq('user_id', userRes.user.id).maybeSingle();
  return data ? userRes.user : null;
}

function buildPrompt(input: { name?: string; subtitle?: string; description?: string; tags?: string[]; features?: string[]; slug?: string }) {
  const { name = '', subtitle = '', description = '', tags = [], features = [], slug = '' } = input;
  return `You are an SEO assistant. Given an After Effects template product, propose (do NOT rename the core product name; preserve the brand/series words as-is):
 - A high-CTR title
 - A succinct subtitle (one line)
 - An SEO meta title (may match title)
 - An SEO meta description under 155 chars
 - A clean, hyphenated, URL-safe slug (lowercase, a-z0-9 and '-')
 - 5-10 search-optimized tags
 - 4-8 concise feature bullets
Also return an overall SEO score (0-100) and a brief rationale.
Respond strictly in JSON with these exact keys:
{
  "score": number,
  "title": string,
  "subtitle": string,
  "metaTitle": string,
  "metaDescription": string,
  "slug": string,
  "tags": string[],
  "features": string[],
  "rationale": string
}

Current data:
Title: ${name}
Subtitle: ${subtitle}
Description: ${description}
Existing slug: ${slug}
Tags: ${tags.join(', ')}
Features: ${features.join('; ')}`;
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    const me = await assertAdmin(token);
    if (!me) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const { name, subtitle, description, tags, features, slug } = await req.json();
    const admin = getSupabaseAdminClient();
    // Load API key from settings or env
    let apiKey = process.env.GEMINI_FLASH_API_KEY || '';
    try {
      const { data } = await admin.from('settings').select('value').eq('key', 'GEMINI_FLASH_API_KEY').maybeSingle();
      if (data?.value) apiKey = data.value;
    } catch { }
    if (!apiKey) return NextResponse.json({ ok: false, error: 'Missing Gemini API key' }, { status: 500 });

    const prompt = buildPrompt({ name, subtitle, description, tags, features, slug });

    // Gemini 2.5 Flash API call
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ ok: false, error: `Gemini error: ${text}` }, { status: 500 });
    }
    const data = await resp.json();
    const candidates = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed: any = null;
    try {
      parsed = JSON.parse(candidates);
    } catch {
      // Try to extract JSON block
      const match = candidates.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { }
      }
    }
    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json({ ok: false, error: 'Failed to parse Gemini response' }, { status: 500 });
    }

    const result = {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      title: String(parsed.title || name || ''),
      subtitle: String(parsed.subtitle || subtitle || ''),
      metaTitle: String(parsed.metaTitle || parsed.title || name || ''),
      metaDescription: String(parsed.metaDescription || parsed.description || description || ''),
      slug: String(parsed.slug || slug || ''),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: any) => String(t)).filter(Boolean) : (Array.isArray(tags) ? tags : []),
      features: Array.isArray(parsed.features) ? parsed.features.map((t: any) => String(t)).filter(Boolean) : (Array.isArray(features) ? features : []),
      rationale: String(parsed.rationale || ''),
    };
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


