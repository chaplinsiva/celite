import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { uploadSourceToR2, uploadPreviewToR2, generateSourceKey, generateAudioPreviewKey, generateTemplateFolder } from '../../../../lib/r2Client';

const ELEVENLABS_API_KEY = process.env.ELEVENLABSAPIKEY;
const ELEVENLABS_API_ID = process.env.ELEVENLABSAPIKEYID;
const CREATOR_SHOP_ID = '54297974-d7e7-4b59-9f91-89800be0b3f5';

// Removed unused interface - using inline type for sound effects API

/**
 * Generate sound effect using ElevenLabs Sound Effects API
 */
async function generateSoundEffect(
  prompt: string,
  variation: number = 1,
  duration: number = 3
): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABSAPIKEY environment variable is not set');
  }

  // ElevenLabs Sound Effects API endpoint
  const url = 'https://api.elevenlabs.io/v1/sound-generation';

  // Sound effects API request body
  const requestBody = {
    text: prompt,
    duration_seconds: duration,
    prompt_influence: 0.3, // How closely the output follows the input description (0.0 to 1.0)
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}

/**
 * Create or get Sound Effects category
 */
async function getOrCreateSoundEffectsCategory(admin: any) {
  // Check if category exists
  let { data: category } = await admin
    .from('categories')
    .select('id, slug')
    .eq('slug', 'sound-effects')
    .maybeSingle();

  if (!category) {
    // Create category
    const { data: newCategory, error } = await admin
      .from('categories')
      .insert({
        name: 'Sound Effects',
        slug: 'sound-effects',
        description: 'Professional sound effects for videos, games, and multimedia projects',
        icon: 'Volume2',
      })
      .select('id, slug')
      .single();

    if (error) throw new Error(`Failed to create category: ${error.message}`);
    category = newCategory;
  }

  return category;
}

/**
 * Create or get Whoosh subcategory
 */
async function getOrCreateWhooshSubcategory(admin: any, categoryId: string) {
  // Check if subcategory exists
  let { data: subcategory } = await admin
    .from('subcategories')
    .select('id, slug')
    .eq('category_id', categoryId)
    .eq('slug', 'whoosh')
    .maybeSingle();

  if (!subcategory) {
    // Create subcategory
    const { data: newSubcategory, error } = await admin
      .from('subcategories')
      .insert({
        category_id: categoryId,
        name: 'Whoosh',
        slug: 'whoosh',
        description: 'Whoosh sound effects for transitions, movements, and action sequences',
      })
      .select('id, slug')
      .single();

    if (error) throw new Error(`Failed to create subcategory: ${error.message}`);
    subcategory = newSubcategory;
  }

  return subcategory;
}

/**
 * Generate slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();

    // Verify admin user
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    
    const userId = userRes.user.id;
    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { count = 5, soundType = 'whoosh' } = body;

    // Get or create category and subcategory
    const category = await getOrCreateSoundEffectsCategory(admin);
    const subcategory = await getOrCreateWhooshSubcategory(admin, category.id);

    const results = [];

    // Generate sound effects
    for (let i = 1; i <= count; i++) {
      try {
        const name = `${soundType.charAt(0).toUpperCase() + soundType.slice(1)} Sound Effect ${i}`;
        const slug = `${soundType}-sound-effect-${i}`;
        
        // Generate sound effect using ElevenLabs
        // For whoosh sounds, we'll use descriptive prompts with variations
        const prompts = [
          'Fast whoosh sound effect, quick movement through air',
          'Slow whoosh sound effect, gentle movement through air',
          'Whoosh sound effect with impact, dramatic movement',
          'Whoosh sound effect, spinning movement through air',
          'Whoosh sound effect, rhythmic movement pattern',
        ];
        const prompt = prompts[i - 1] || `Whoosh sound effect, smooth movement through air, variation ${i}`;
        const duration = 2 + (i * 0.5); // Vary duration from 2-4.5 seconds
        
        console.log(`Generating sound effect ${i}/${count}: ${name}`);
        const audioBuffer = await generateSoundEffect(prompt, i, duration);

        // Generate template folder
        const templateFolder = generateTemplateFolder(name);

        // Upload audio preview to R2
        const audioKey = generateAudioPreviewKey(
          category.slug,
          subcategory.slug,
          `${slug}.mp3`,
          null,
          templateFolder
        );

        // Convert Buffer to Uint8Array for File compatibility
        const audioUint8Array = new Uint8Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength);
        const audioFile = new File([audioUint8Array], `${slug}.mp3`, { type: 'audio/mpeg' });
        const audioResult = await uploadPreviewToR2(audioFile, audioKey, 'audio/mpeg');

        // Upload source file to R2 (same audio file as source)
        const sourceKey = generateSourceKey(
          category.slug,
          subcategory.slug,
          null,
          templateFolder,
          `${slug}.mp3`
        );

        const sourceResult = await uploadSourceToR2(audioBuffer, sourceKey, 'audio/mpeg');

        // Create template in database
        const { data: template, error: templateError } = await admin
          .from('templates')
          .insert({
            slug,
            name,
            subtitle: `Professional ${soundType} sound effect`,
            description: `High-quality ${soundType} sound effect perfect for transitions, movements, and action sequences. Generated using AI technology.`,
            category_id: category.id,
            subcategory_id: subcategory.id,
            creator_shop_id: CREATOR_SHOP_ID,
            audio_preview_path: audioResult.url,
            source_path: sourceResult.key,
            features: JSON.stringify(['Royalty-Free', 'High Quality', 'AI Generated', 'Multiple Variations']),
            software: JSON.stringify([]),
            plugins: JSON.stringify([]),
            tags: JSON.stringify([soundType, 'sound-effect', 'audio', 'transition', 'movement']),
            status: 'approved',
            feature: false,
          })
          .select('slug, name')
          .single();

        if (templateError) {
          console.error(`Failed to create template ${i}:`, templateError);
          results.push({
            success: false,
            name,
            error: templateError.message,
          });
        } else {
          console.log(`Successfully created template ${i}: ${template.name}`);
          results.push({
            success: true,
            name: template.name,
            slug: template.slug,
            audioUrl: audioResult.url,
          });
        }

        // Add delay between generations to avoid rate limiting
        if (i < count) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error: any) {
        console.error(`Error generating sound effect ${i}:`, error);
        results.push({
          success: false,
          index: i,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      ok: true,
      message: `Generated ${successCount} sound effects${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results,
      category: {
        id: category.id,
        slug: category.slug,
      },
      subcategory: {
        id: subcategory.id,
        slug: subcategory.slug,
      },
    });
  } catch (e: any) {
    console.error('Bulk upload error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
