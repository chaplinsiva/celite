/**
 * Direct script to generate and upload 5 whoosh sound effects
 * This script runs directly without needing the API server
 * 
 * Usage:
 * 1. Set environment variables in .env.local:
 *    - ELEVENLABSAPIKEY
 *    - ELEVENLABSAPIKEYID (optional)
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 *    - R2_ACCESS_KEY_ID
 *    - R2_SECRET_ACCESS_KEY
 *    - R2_ENDPOINT
 *    - R2_PREVIEWS_BUCKET
 *    - R2_SOURCE_BUCKET
 * 
 * 2. Run: npx tsx scripts/generate-whoosh-direct.ts
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local file manually
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (e) {
  console.warn('Could not load .env.local, using environment variables');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ELEVENLABS_API_KEY = process.env.ELEVENLABSAPIKEY!;
const ELEVENLABS_API_ID = process.env.ELEVENLABSAPIKEYID;
const CREATOR_SHOP_ID = '54297974-d7e7-4b59-9f91-89800be0b3f5';

// R2 Configuration
const R2_ENDPOINT = process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
const R2_PREVIEWS_BUCKET = process.env.R2_PREVIEWS_BUCKET || 'celite-previews';
const R2_SOURCE_BUCKET = process.env.R2_SOURCE_BUCKET || 'celite-source-files';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateTemplateFolder(templateName: string): string {
  return generateSlug(templateName);
}

async function generateSoundEffect(prompt: string, duration: number = 3): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABSAPIKEY environment variable is not set');
  }

  const url = 'https://api.elevenlabs.io/v1/sound-generation';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: duration,
      prompt_influence: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}

async function uploadToR2(buffer: Buffer, key: string, bucket: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  if (bucket === R2_PREVIEWS_BUCKET) {
    const domain = process.env.R2_PREVIEWS_DOMAIN || 'preview.celite.in';
    return `https://${domain}/${key}`;
  }

  return key;
}

async function main() {
  try {
    console.log('🚀 Starting bulk upload of random sound effects...\n');

    // Get or create category
    let { data: category } = await supabase
      .from('categories')
      .select('id, slug')
      .eq('slug', 'sound-effects')
      .maybeSingle();

    if (!category) {
      console.log('📁 Creating Sound Effects category...');
      const { data: newCategory, error } = await supabase
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
      console.log('✅ Category created:', category.slug);
    } else {
      console.log('✅ Category exists:', category.slug);
    }

    // Get or create "Various" subcategory for diverse sound effects
    let { data: subcategory } = await supabase
      .from('subcategories')
      .select('id, slug')
      .eq('category_id', category.id)
      .eq('slug', 'various')
      .maybeSingle();

    if (!subcategory) {
      console.log('📁 Creating Various subcategory...');
      const { data: newSubcategory, error } = await supabase
        .from('subcategories')
        .insert({
          category_id: category.id,
          name: 'Various',
          slug: 'various',
          description: 'Various sound effects including whoosh, impact, click, pop, and more',
        })
        .select('id, slug')
        .single();

      if (error) throw new Error(`Failed to create subcategory: ${error.message}`);
      subcategory = newSubcategory;
      console.log('✅ Subcategory created:', subcategory.slug);
    } else {
      console.log('✅ Subcategory exists:', subcategory.slug);
    }

    // Diverse sound effect prompts for SEO and variety
    const soundEffects = [
      {
        name: 'Whoosh Sound Effect',
        prompt: 'Fast whoosh sound effect, quick movement through air, transition sound',
        tags: ['whoosh', 'transition', 'movement', 'air', 'swipe'],
        description: 'Professional whoosh sound effect perfect for transitions, swipes, and movement animations. High-quality royalty-free audio.',
        duration: 2.5,
      },
      {
        name: 'Impact Hit Sound',
        prompt: 'Impact sound effect, hard hit, collision, punch, dramatic impact',
        tags: ['impact', 'hit', 'collision', 'punch', 'strike'],
        description: 'Powerful impact sound effect ideal for action scenes, hits, collisions, and dramatic moments. Professional quality audio.',
        duration: 1.5,
      },
      {
        name: 'Swish Sound Effect',
        prompt: 'Swish sound effect, quick swipe, fast movement, whoosh variation',
        tags: ['swish', 'swipe', 'quick', 'movement', 'transition'],
        description: 'Quick swish sound effect perfect for UI interactions, quick movements, and fast transitions. Clean and crisp audio.',
        duration: 1.8,
      },
      {
        name: 'Zap Electric Sound',
        prompt: 'Electric zap sound effect, energy burst, electric shock, spark',
        tags: ['zap', 'electric', 'energy', 'spark', 'shock'],
        description: 'Electric zap sound effect for energy bursts, electric shocks, and power effects. Dynamic and energetic audio.',
        duration: 2.0,
      },
      {
        name: 'Pop Sound Effect',
        prompt: 'Pop sound effect, bubble pop, click pop, satisfying pop',
        tags: ['pop', 'bubble', 'click', 'satisfying', 'notification'],
        description: 'Satisfying pop sound effect perfect for notifications, UI interactions, and bubble effects. Clean and crisp audio.',
        duration: 0.8,
      },
      {
        name: 'Click Sound Effect',
        prompt: 'Click sound effect, button click, UI click, interface click',
        tags: ['click', 'button', 'ui', 'interface', 'interaction'],
        description: 'Professional click sound effect for buttons, UI elements, and interface interactions. Clear and precise audio.',
        duration: 0.5,
      },
      {
        name: 'Beep Notification Sound',
        prompt: 'Beep sound effect, notification beep, alert beep, digital beep',
        tags: ['beep', 'notification', 'alert', 'digital', 'signal'],
        description: 'Clear beep notification sound perfect for alerts, notifications, and digital signals. Professional and attention-grabbing.',
        duration: 1.0,
      },
      {
        name: 'Chime Success Sound',
        prompt: 'Chime sound effect, success chime, positive chime, achievement sound',
        tags: ['chime', 'success', 'achievement', 'positive', 'completion'],
        description: 'Uplifting chime sound effect for success messages, achievements, and positive feedback. Bright and encouraging audio.',
        duration: 2.2,
      },
      {
        name: 'Swoosh Transition Sound',
        prompt: 'Swoosh sound effect, smooth transition, elegant movement, flowing',
        tags: ['swoosh', 'transition', 'elegant', 'smooth', 'flowing'],
        description: 'Elegant swoosh sound effect for smooth transitions, elegant movements, and flowing animations. Professional quality.',
        duration: 2.5,
      },
      {
        name: 'Thud Impact Sound',
        prompt: 'Thud sound effect, heavy impact, drop, fall, heavy landing',
        tags: ['thud', 'impact', 'heavy', 'drop', 'landing'],
        description: 'Heavy thud sound effect for impacts, drops, falls, and heavy landings. Deep and powerful audio.',
        duration: 1.2,
      },
    ];

    const results = [];

    for (let i = 0; i < soundEffects.length; i++) {
      try {
        const sfx = soundEffects[i];
        const name = sfx.name;
        // Generate unique slug with timestamp to avoid duplicates
        const baseSlug = generateSlug(name);
        const timestamp = Date.now();
        const slug = `${baseSlug}-${timestamp}-${i + 1}`;
        const prompt = sfx.prompt;
        const duration = sfx.duration;

        console.log(`\n🎵 Generating ${i + 1}/${soundEffects.length}: ${name}`);
        console.log(`   Prompt: ${prompt}`);
        
        const audioBuffer = await generateSoundEffect(prompt, duration);

        const templateFolder = generateTemplateFolder(name);

        // Upload audio preview
        const audioKey = `preview/audio/sound-effects/various/${templateFolder}/${slug}.mp3`;
        console.log(`   📤 Uploading preview to R2...`);
        const audioUrl = await uploadToR2(audioBuffer, audioKey, R2_PREVIEWS_BUCKET, 'audio/mpeg');

        // Upload source file
        const sourceKey = `sound-effects/various/${templateFolder}/${slug}.mp3`;
        console.log(`   📤 Uploading source to R2...`);
        await uploadToR2(audioBuffer, sourceKey, R2_SOURCE_BUCKET, 'audio/mpeg');

        // Generate SEO-friendly metadata
        const metaTitle = `${name} - Royalty-Free Sound Effect | Download MP3`;
        const metaDescription = `${sfx.description} Download this high-quality ${sfx.tags[0]} sound effect in MP3 format. Perfect for videos, games, and multimedia projects.`;

        // Create template with SEO metadata
        console.log(`   💾 Creating template record...`);
        const { data: template, error: templateError } = await supabase
          .from('templates')
          .insert({
            slug,
            name,
            subtitle: `Professional ${sfx.tags[0]} sound effect`,
            description: sfx.description,
            category_id: category.id,
            subcategory_id: subcategory.id,
            creator_shop_id: CREATOR_SHOP_ID,
            audio_preview_path: audioUrl,
            source_path: sourceKey,
            features: JSON.stringify(['Royalty-Free', 'High Quality', 'AI Generated', 'Professional', 'Multiple Formats']),
            software: JSON.stringify([]),
            plugins: JSON.stringify([]),
            tags: JSON.stringify([...sfx.tags, 'sound-effect', 'audio', 'royalty-free', 'download']),
            status: 'approved',
            feature: false,
            meta_title: metaTitle,
            meta_description: metaDescription,
          })
          .select('slug, name')
          .single();

        if (templateError) {
          console.error(`   ❌ Failed: ${templateError.message}`);
          results.push({ success: false, name, error: templateError.message });
        } else {
          console.log(`   ✅ Success: ${template.name}`);
          results.push({ success: true, name: template.name, slug: template.slug, audioUrl });
        }

        // Delay between generations to avoid rate limiting
        if (i < soundEffects.length - 1) {
          console.log(`   ⏳ Waiting 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
        results.push({ success: false, index: i, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n✨ Done! Generated ${successCount}/${soundEffects.length} sound effects`);
    console.log(`\n📊 Results:`);
    results.forEach((r, i) => {
      if (r.success) {
        console.log(`  ${i + 1}. ✅ ${r.name} (${r.slug})`);
      } else {
        console.log(`  ${i + 1}. ❌ Failed: ${r.error}`);
      }
    });
    console.log(`\n🌐 View at: /sound-effects`);

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();


