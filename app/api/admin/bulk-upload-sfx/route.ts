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
 * Create or get subcategory dynamically
 */
async function getOrCreateSubcategory(
  admin: any,
  categoryId: string,
  subcategoryName: string,
  subcategorySlug: string,
  description: string
) {
  // Check if subcategory exists
  let { data: subcategory } = await admin
    .from('subcategories')
    .select('id, slug')
    .eq('category_id', categoryId)
    .eq('slug', subcategorySlug)
    .maybeSingle();

  if (!subcategory) {
    // Create subcategory
    const { data: newSubcategory, error } = await admin
      .from('subcategories')
      .insert({
        category_id: categoryId,
        name: subcategoryName,
        slug: subcategorySlug,
        description: description,
      })
      .select('id, slug')
      .single();

    if (error) throw new Error(`Failed to create subcategory: ${error.message}`);
    subcategory = newSubcategory;
  }

  return subcategory;
}

/**
 * Get sound effect prompts based on sound type
 */
function getSoundEffectPrompts(soundType: string): string[] {
  const promptLibrary: Record<string, string[]> = {
    'whoosh': [
      'Fast whoosh sound effect, quick movement through air',
      'Slow whoosh sound effect, gentle movement through air',
      'Whoosh sound effect with impact, dramatic movement',
      'Whoosh sound effect, spinning movement through air',
      'Whoosh sound effect, rhythmic movement pattern',
    ],
    'camera-shutter': [
      'Camera shutter click sound, crisp DSLR shutter release',
      'Mechanical camera shutter sound, vintage film camera click',
      'Fast camera shutter burst, continuous shooting mode',
      'Camera shutter with mirror slap, professional DSLR sound',
      'Soft camera shutter click, mirrorless camera sound',
      'Camera shutter with film advance, analog camera winding',
      'High-speed camera shutter, sports photography burst',
      'Vintage camera shutter, old mechanical camera click',
      'Digital camera shutter beep and click',
      'Camera shutter echo, shutter in large empty room',
    ],
    'camera-sounds': [
      'Camera focusing sound, autofocus motor whir',
      'Camera lens zoom sound, smooth zoom mechanism',
      'Camera power on sound, electronic startup beep',
      'Camera flash charging sound, capacitor charging whine',
      'Camera mode dial click, mechanical dial rotation',
    ],
    // Short Film SFX Categories
    'footsteps': [
      'Footsteps on concrete, slow walking pace urban street',
      'Footsteps on gravel, crunching stones outdoor path',
      'Footsteps on wood floor, indoor wooden hallway creaking',
      'Running footsteps on pavement, fast chase scene',
      'Footsteps on grass, soft outdoor walking nature',
      'High heels on marble floor, elegant indoor echo',
      'Barefoot on sand, beach walking soft steps',
      'Boots on metal, industrial staircase climbing',
      'Sneakers on gym floor, squeaking athletic shoes',
      'Footsteps in puddle, splashing water rainy day',
    ],
    'door-sounds': [
      'Door creaking open, old wooden door horror suspense',
      'Door slam shut, heavy wooden door dramatic impact',
      'Door knock, polite rhythmic knocking on wood',
      'Door lock clicking, key turning in lock mechanism',
      'Sliding door opening, modern glass door smooth',
      'Metal door closing, heavy industrial warehouse',
      'Screen door spring, old fashioned screen door closing',
      'Car door closing, vehicle door solid thud',
      'Cabinet door opening, kitchen cabinet creaking',
      'Refrigerator door, suction release opening fridge',
    ],
    'ambient': [
      'City ambient sound, urban traffic distant sirens',
      'Forest ambient, birds chirping wind rustling leaves',
      'Office ambient, typing keyboards air conditioning hum',
      'Coffee shop ambient, murmuring voices clinking cups',
      'Rain ambient, steady rainfall on window rooftop',
      'Night ambient, crickets owls distant traffic',
      'Beach ambient, waves crashing seagulls wind',
      'Restaurant ambient, dining room chatter plates',
      'Library ambient, quiet whispers page turning',
      'Subway ambient, underground train station echo',
    ],
    'impact': [
      'Punch impact sound, fist hitting body fight scene',
      'Explosion impact, distant bomb blast rumble',
      'Glass breaking, shattering window dramatic',
      'Metal impact, sword clash clanging metal',
      'Body fall impact, person hitting ground thud',
      'Car crash impact, vehicle collision metal crunch',
      'Thunder impact, close lightning strike rumble',
      'Gunshot impact, bullet hitting surface ricochet',
      'Slap impact, open hand hitting face sharp',
      'Kick impact, martial arts body hit powerful',
    ],
    'suspense': [
      'Tension drone, building suspense low frequency',
      'Heartbeat sound, slow tense pounding rhythm',
      'Clock ticking, suspenseful countdown timer',
      'Wind howling, eerie atmospheric tension',
      'Creepy ambient, horror movie tension building',
      'Breath sound, nervous breathing suspense',
      'Strings tension, rising orchestral suspense',
      'Static noise, building interference tension',
      'Whisper voices, ghostly ethereal suspense',
      'Bass rumble, ominous low frequency dread',
    ],
    'nature': [
      'Thunder rolling, distant storm approaching',
      'Rain heavy, downpour storm dramatic',
      'Wind strong, gusty outdoor atmospheric',
      'Fire crackling, campfire burning flames',
      'Water stream, river brook flowing peaceful',
      'Ocean waves, beach shore crashing surf',
      'Bird songs, morning dawn chorus nature',
      'Leaves rustling, autumn wind trees forest',
      'Snow crunching, footsteps in deep snow',
      'Earthquake rumble, ground shaking disaster',
    ],
    'technology': [
      'Phone notification, message alert ding',
      'Computer startup, operating system boot sound',
      'Keyboard typing, mechanical keyboard clicks',
      'Mouse click, computer mouse button press',
      'Printer printing, document printing machine',
      'Phone ringing, incoming call ringtone',
      'Text message, smartphone notification whoosh',
      'USB connect, device connection sound',
      'Camera focus beep, autofocus confirmation',
      'Shutter release, electronic camera click',
    ],
    'transitions': [
      'Swoosh transition, fast movement scene change',
      'Glitch transition, digital distortion switch',
      'Whoosh flyby, fast object passing by',
      'Cinematic boom, dramatic scene transition',
      'Reverse swoosh, rewind transition effect',
      'Slide transition, smooth movement shift',
      'Portal transition, sci-fi dimensional shift',
      'Flash transition, bright light changeover',
      'Wind transition, atmospheric scene change',
      'Underwater transition, diving submersion effect',
    ],
    'vehicles': [
      'Car engine starting, vehicle ignition motor',
      'Car driving by, vehicle pass doppler effect',
      'Motorcycle revving, bike engine acceleration',
      'Helicopter overhead, chopper flyover rotating',
      'Train passing, railway locomotive moving',
      'Airplane takeoff, jet engine acceleration',
      'Bicycle bell, bike bell ding warning',
      'Boat engine, motorboat water engine',
      'Bus stopping, public transport brakes hiss',
      'Skateboard rolling, wheels on concrete',
    ],
    'horror': [
      'Scream terror, blood curdling horror scream',
      'Monster growl, creature beast threatening',
      'Zombie moan, undead groaning horror',
      'Ghost whisper, ethereal supernatural voice',
      'Chains rattling, dungeon prison horror',
      'Scratching sound, claws on surface creepy',
      'Evil laugh, sinister villain cackling',
      'Bone cracking, skeletal breaking horror',
      'Dripping blood, liquid dripping eerie',
      'Haunted breathing, ghostly inhale exhale',
    ],
  };

  return promptLibrary[soundType] || [
    `${soundType} sound effect, high quality audio for film`,
    `${soundType} sound effect, professional cinematic recording`,
    `${soundType} sound effect, clean and crisp production`,
    `${soundType} sound effect, short film quality`,
    `${soundType} sound effect, movie production ready`,
  ];
}

/**
 * Get tags based on sound type - SEO optimized
 */
function getSoundEffectTags(soundType: string): string[] {
  const tagLibrary: Record<string, string[]> = {
    'whoosh': ['whoosh', 'transition', 'movement', 'swish', 'air', 'swoosh', 'sound effect', 'sfx', 'video editing'],
    'camera-shutter': ['camera', 'shutter', 'click', 'photography', 'dslr', 'capture', 'photo', 'snap', 'sound effect'],
    'camera-sounds': ['camera', 'photography', 'lens', 'focus', 'autofocus', 'zoom', 'equipment', 'sound effect'],
    // Short Film SFX Tags - SEO Optimized
    'footsteps': ['footsteps', 'walking', 'running', 'steps', 'foley', 'movement', 'shoes', 'floor', 'short film', 'sfx', 'sound effect', 'cinematic'],
    'door-sounds': ['door', 'creak', 'slam', 'knock', 'lock', 'opening', 'closing', 'foley', 'short film', 'sfx', 'horror', 'sound effect'],
    'ambient': ['ambient', 'atmosphere', 'background', 'environment', 'city', 'nature', 'room tone', 'short film', 'sfx', 'cinematic', 'sound effect'],
    'impact': ['impact', 'hit', 'punch', 'explosion', 'crash', 'collision', 'action', 'fight', 'short film', 'sfx', 'cinematic', 'sound effect'],
    'suspense': ['suspense', 'tension', 'thriller', 'horror', 'dramatic', 'scary', 'eerie', 'short film', 'sfx', 'cinematic', 'film score'],
    'nature': ['nature', 'outdoor', 'weather', 'rain', 'thunder', 'wind', 'forest', 'water', 'short film', 'sfx', 'ambient', 'sound effect'],
    'technology': ['technology', 'phone', 'computer', 'notification', 'ui', 'interface', 'digital', 'electronic', 'short film', 'sfx', 'modern'],
    'transitions': ['transition', 'swoosh', 'whoosh', 'cinematic', 'scene change', 'video editing', 'youtube', 'short film', 'sfx', 'premiere pro'],
    'vehicles': ['vehicle', 'car', 'motorcycle', 'engine', 'traffic', 'transportation', 'driving', 'short film', 'sfx', 'foley', 'sound effect'],
    'horror': ['horror', 'scary', 'monster', 'scream', 'ghost', 'creepy', 'thriller', 'halloween', 'short film', 'sfx', 'cinematic', 'fear'],
  };

  return tagLibrary[soundType] || [soundType, 'sound effect', 'sfx', 'audio', 'short film', 'cinematic', 'professional', 'royalty free'];
}

/**
 * Get description based on sound type - SEO optimized
 */
function getSoundEffectDescription(soundType: string): string {
  const descLibrary: Record<string, string> = {
    'whoosh': 'perfect for transitions, movements, and action sequences in videos and films',
    'camera-shutter': 'ideal for photography apps, video transitions, vlogs, and multimedia projects',
    'camera-sounds': 'perfect for photography-related content, camera tutorials, and UI interfaces',
    // Short Film SFX Descriptions - SEO Optimized
    'footsteps': 'essential foley sound for short films, movies, and video productions. Perfect for walking, running, and chase scenes',
    'door-sounds': 'versatile door foley effects for short films, horror movies, and dramatic scenes. Includes creaks, slams, and locks',
    'ambient': 'atmospheric background sounds for establishing shots in short films, documentaries, and cinematic productions',
    'impact': 'powerful impact sounds for action scenes, fight sequences, and dramatic moments in short films and movies',
    'suspense': 'tension-building sounds for thriller and horror short films, perfect for creating atmospheric dread and anticipation',
    'nature': 'natural environmental sounds for outdoor scenes, establishing shots, and atmospheric backgrounds in films',
    'technology': 'modern digital sounds for UI, notifications, and tech-related scenes in contemporary short films',
    'transitions': 'professional transition sounds for video editing, YouTube videos, and cinematic scene changes',
    'vehicles': 'realistic vehicle sounds for car chases, travel scenes, and transportation sequences in short films',
    'horror': 'terrifying horror sounds for scary movies, Halloween content, and thriller short films',
  };

  return descLibrary[soundType] || 'perfect for short films, video production, and multimedia projects. Royalty-free for commercial use';
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
    const { 
      count = 5, 
      soundType = 'whoosh',
      categoryName = 'Sound Effects',
      categorySlug = 'sound-effects',
      subcategoryName,
      subcategorySlug,
    } = body;

    // Determine subcategory info
    const finalSubcategoryName = subcategoryName || (soundType.charAt(0).toUpperCase() + soundType.slice(1).replace(/-/g, ' '));
    const finalSubcategorySlug = subcategorySlug || soundType.toLowerCase().replace(/\s+/g, '-');
    const subcategoryDescription = `${finalSubcategoryName} sound effects for videos, games, and multimedia projects`;

    // Get or create category and subcategory
    const category = await getOrCreateSoundEffectsCategory(admin);
    const subcategory = await getOrCreateSubcategory(
      admin,
      category.id,
      finalSubcategoryName,
      finalSubcategorySlug,
      subcategoryDescription
    );

    const results = [];

    // Generate sound effects
    for (let i = 1; i <= count; i++) {
      try {
        const name = `${soundType.charAt(0).toUpperCase() + soundType.slice(1)} Sound Effect ${i}`;
        const slug = `${soundType}-sound-effect-${i}`;
        
        // Generate sound effect using ElevenLabs
        // Get prompts based on sound type
        const prompts = getSoundEffectPrompts(soundType);
        const prompt = prompts[(i - 1) % prompts.length] || `${soundType} sound effect, variation ${i}`;
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

        // Upload audio preview directly using Buffer (uploadPreviewToR2 accepts Buffer)
        const audioResult = await uploadPreviewToR2(audioBuffer, audioKey, 'audio/mpeg');

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
            subtitle: `Professional ${soundType.replace(/-/g, ' ')} sound effect`,
            description: `High-quality ${soundType.replace(/-/g, ' ')} sound effect ${getSoundEffectDescription(soundType)}. Generated using AI technology.`,
            category_id: category.id,
            subcategory_id: subcategory.id,
            creator_shop_id: CREATOR_SHOP_ID,
            audio_preview_path: audioResult.url,
            source_path: sourceResult.key,
            features: JSON.stringify(['Royalty-Free', 'High Quality', 'AI Generated', 'Multiple Variations']),
            software: JSON.stringify([]),
            plugins: JSON.stringify([]),
            tags: JSON.stringify(getSoundEffectTags(soundType)),
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


