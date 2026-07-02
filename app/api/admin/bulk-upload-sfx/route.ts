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
    // Additional UI/Creative SFX
    'glitch': [
      'Digital glitch sound, electronic distortion static',
      'Glitch stutter effect, broken signal interference',
      'Data corruption sound, digital malfunction noise',
      'VHS glitch, retro tape distortion artifact',
      'Computer glitch, system error crash sound',
      'Glitch transition, distorted digital switch',
      'Signal interference, radio static glitch',
      'Pixel glitch, digital artifact scramble',
      'Buffer glitch, audio stutter lag effect',
      'Matrix glitch, cyberpunk digital distortion',
    ],
    'keyboard': [
      'Mechanical keyboard typing, cherry mx switch clicks',
      'Keyboard key press, single keystroke click',
      'Keyboard typing fast, rapid typing sound',
      'Spacebar press, large key thump sound',
      'Enter key press, return key confirmation',
      'Backspace key, delete key rapid press',
      'Keyboard typing slow, deliberate keystroke',
      'Laptop keyboard, membrane key soft press',
      'Gaming keyboard, RGB mechanical typing',
      'Typewriter key, vintage mechanical keyboard',
    ],
    'typing': [
      'Typing on keyboard, office work ambient',
      'Fast typing, professional typist speed',
      'Slow typing, one finger hunt and peck',
      'Typing with mouse clicks, computer work',
      'Typing and thinking, pause between keys',
      'Aggressive typing, angry keyboard smashing',
      'Gentle typing, soft touch keyboard',
      'Typing notification, message being composed',
      'Touch screen typing, smartphone keyboard',
      'Tablet typing, touch keyboard tapping',
    ],
    'pop': [
      'Bubble pop sound, soap bubble burst',
      'Pop sound effect, cartoon pop noise',
      'Balloon pop, party balloon burst',
      'Cork pop, champagne bottle opening',
      'Bubblewrap pop, plastic bubble burst',
      'UI pop sound, notification popup appear',
      'Lip pop, mouth pop sound effect',
      'Pop up sound, element appearing animation',
      'Popcorn pop, kernel popping sound',
      'Snap pop, finger snap with pop',
    ],
    'paper': [
      'Paper rustling, document shuffling sound',
      'Paper tear, ripping paper apart',
      'Paper crumple, crushing paper ball',
      'Page turn, book page flip sound',
      'Paper fold, origami folding crease',
      'Paper stack, dropping pile of papers',
      'Paper slide, document sliding on desk',
      'Paper cut, scissors cutting paper',
      'Paper unfolding, opening letter document',
      'Newspaper flip, reading newspaper pages',
    ],
    'highlighter': [
      'Highlighter marker, squeaky marker on paper',
      'Marker writing, felt tip pen drawing',
      'Highlighter stroke, marking text sound',
      'Dry erase marker, whiteboard writing',
      'Permanent marker, thick marker drawing',
      'Marker cap off, uncapping marker pop',
      'Marker cap on, capping marker click',
      'Marker squeak, marker on glossy paper',
      'Coloring with marker, continuous coloring',
      'Marker on cardboard, textured surface marking',
    ],
    'notification': [
      'Phone notification ding, message alert',
      'Email notification, inbox alert sound',
      'App notification, push alert chime',
      'Success notification, positive confirmation ding',
      'Error notification, warning alert sound',
      'Social media notification, like comment alert',
      'Calendar reminder, event notification',
      'Download complete, finished notification',
      'Achievement notification, reward unlock sound',
      'Chat notification, messaging app alert',
    ],
    'ui-click': [
      'Button click, UI button press sound',
      'Toggle switch, on off switch click',
      'Checkbox tick, selection confirmation',
      'Dropdown menu, select menu opening',
      'Slider move, volume slider adjustment',
      'Tab switch, navigation tab change',
      'Menu hover, cursor hover feedback',
      'Submit button, form submission click',
      'Close button, window close click',
      'Refresh button, reload icon click',
    ],
    'writing': [
      'Pen writing, ballpoint pen on paper',
      'Pencil writing, graphite pencil scratch',
      'Fountain pen, elegant pen on paper',
      'Pencil erasing, rubber eraser on paper',
      'Pen clicking, retractable pen click',
      'Chalk writing, blackboard chalk scratch',
      'Crayon coloring, wax crayon on paper',
      'Quill pen, feather pen dipping ink',
      'Brush stroke, calligraphy brush on paper',
      'Stylus on tablet, digital pen drawing',
    ],
    'coins': [
      'Coin drop, single coin falling clink',
      'Coins jingling, pocket change rattling',
      'Coin flip, flipping coin spinning',
      'Coin insert, vending machine coin slot',
      'Coin pile, dumping coins on table',
      'Coin spin, spinning coin on surface',
      'Arcade coin, game token insert',
      'Cash register coins, drawer opening',
      'Piggy bank coins, saving money clink',
      'Coin collect, video game coin pickup',
    ],
    'swoosh': [
      'Fast swoosh, quick movement air sound',
      'Sword swoosh, blade cutting through air',
      'Cape swoosh, fabric flowing movement',
      'Magic swoosh, spell casting movement',
      'Sports swoosh, athletic movement speed',
      'Wind swoosh, fast wind passing by',
      'Arrow swoosh, projectile flying past',
      'Punch swoosh, fist moving fast',
      'Kick swoosh, leg swinging movement',
      'Dance swoosh, choreography movement sound',
    ],
    // Additional Realistic SFX
    'gun-shots': [
      'Gun shot, pistol firing loud bang',
      'Rifle shot, military assault rifle',
      'Shotgun blast, close range boom',
      'Sniper shot, long distance precision',
      'Revolver firing, six shooter bang',
      'Machine gun, rapid fire burst',
      'Gun cocking, weapon readying',
      'Gun reload, magazine change',
      'Silenced gun, muffled pistol shot',
      'Gunfire echo, mountain canyon',
    ],
    'human-sounds': [
      'Scream loud, terror fear scream',
      'Fart sound, embarrassing flatulence',
      'Burp loud, stomach gas release',
      'Coughing, throat irritation',
      'Sneezing, sudden nose expulsion',
      'Laughing, hearty belly laugh',
      'Crying, emotional sobbing',
      'Yawning, tired mouth stretch',
      'Snoring, sleeping deep',
      'Hiccup, involuntary throat spasm',
    ],
    'glass-breaking': [
      'Glass shatter, window breaking crash',
      'Glass bottle smash, liquid spill',
      'Windshield crack, car accident',
      'Glass cup breaking, kitchen accident',
      'Glass door shatter, safety hazard',
      'Window breaking, intrusion',
      'Mirror crack, silver coating',
      'Glass jar smash, food container',
      'Glass ornament break, holiday',
      'Car window smash, emergency',
    ],
    'fire': [
      'Fire crackling, campfire burning',
      'Fire roar, intense flame',
      'Fire extinguisher, foam spray',
      'Candle flame, small burning',
      'Bonfire large, outdoor fire',
      'Fireworks, explosive display',
      'Torch flame, medieval lighting',
      'Fireplace crackle, cozy warmth',
      'Forest fire, wild burning',
      'Lighter click, flame ignition',
    ],
    'thunder': [
      'Thunder clap, lightning strike',
      'Thunder rumble, distant storm',
      'Thunder crack, electrical discharge',
      'Thunder boom, loud storm',
      'Thunder roll, continuous storm',
      'Thunder crash, building shaking',
      'Lightning strike, electrical',
      'Storm thunder, heavy weather',
      'Thunder echo, canyon',
      'Thunder crackle, static electricity',
    ],
    'train': [
      'Train whistle, locomotive warning',
      'Train horn, railway crossing',
      'Train chugging, steam engine',
      'Train wheels, steel track',
      'Train brake, metal screech',
      'Train station, arrival',
      'Train departure, journey',
      'Train crossing, bell',
      'Train tunnel, echo',
      'High speed train, modern',
    ],
    'beats': [
      'Drum beat, bass drum loud',
      'Percussion beat, rhythmic pattern',
      'Electronic beat, synth rhythm',
      'Hip hop beat, urban rhythm',
      'Rock beat, guitar drums',
      'Bass drop, electronic bass',
      'Beat drop, music climax',
      'Rhythm beat, steady pattern',
      'Pulse beat, heartbeat rhythm',
      'Dance beat, club rhythm',
    ],
    'impacts': [
      'Impact crash, loud collision',
      'Punch impact, fist hitting',
      'Metal impact, heavy crash',
      'Explosion impact, boom crash',
      'Wood impact, hammer hitting',
      'Concrete impact, heavy hit',
      'Body impact, physical hit',
      'Car crash, vehicle impact',
      'Sword impact, blade strike',
      'Bullet impact, gunshot hit',
    ],
    'home-things': [
      'Clock ticking, steady timekeeping rhythm',
      'Chair creaking, wooden office chair movement',
      'Chair squeaking, metal chair adjustment',
      'Plastic crinkling, wrapper paper rustling',
      'Plastic clicking, hard plastic tap',
      'Wooden floor creak, old house settling',
      'Door hinge squeak, rusty door movement',
      'Cup clinking, ceramic mug on table',
      'Faucet dripping, water drop sound',
      'Fan spinning, ceiling fan motor hum',
    ],
    'mouse-clicks': [
      'Mouse click, computer mouse button press',
      'Mouse double click, rapid button press',
      'Mouse right click, context menu button',
      'Mouse scroll, wheel scrolling sound',
      'Mouse drag, cursor movement sound',
      'Mouse hover, cursor hover feedback',
      'Mouse wheel click, middle button press',
      'Optical mouse, laser sensor movement',
      'Gaming mouse, RGB mechanical click',
      'Laptop trackpad, touchpad tap sound',
    ],
    'water-sounds': [
      'Water dripping, steady drop sound',
      'Water flowing, gentle stream sound',
      'Water splashing, liquid impact',
      'Ocean waves, surf crashing',
      'Rain falling, precipitation sound',
      'Water pouring, liquid transfer',
      'Toilet flush, bathroom sound',
      'Shower running, water spray',
      'Sink faucet, water tap',
      'Water bubbling, liquid boil',
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
    // Additional UI/Creative SFX Tags
    'glitch': ['glitch', 'digital', 'distortion', 'static', 'error', 'vhs', 'retro', 'cyberpunk', 'transition', 'sfx', 'video editing', 'youtube'],
    'keyboard': ['keyboard', 'typing', 'mechanical', 'keys', 'computer', 'office', 'work', 'asmr', 'sfx', 'foley', 'sound effect'],
    'typing': ['typing', 'keyboard', 'computer', 'office', 'work', 'writing', 'ambient', 'asmr', 'sfx', 'foley', 'productivity'],
    'pop': ['pop', 'bubble', 'burst', 'cartoon', 'ui', 'notification', 'animation', 'fun', 'sfx', 'sound effect', 'motion graphics'],
    'paper': ['paper', 'page', 'document', 'rustling', 'tear', 'crumple', 'office', 'foley', 'sfx', 'asmr', 'book'],
    'highlighter': ['highlighter', 'marker', 'writing', 'drawing', 'pen', 'office', 'school', 'asmr', 'sfx', 'foley', 'stationery'],
    'notification': ['notification', 'alert', 'ding', 'phone', 'app', 'message', 'ui', 'ux', 'sfx', 'mobile', 'sound effect'],
    'ui-click': ['ui', 'click', 'button', 'interface', 'app', 'web', 'mobile', 'ux', 'sfx', 'interaction', 'sound effect'],
    'writing': ['writing', 'pen', 'pencil', 'paper', 'drawing', 'office', 'school', 'asmr', 'sfx', 'foley', 'calligraphy'],
    'coins': ['coins', 'money', 'cash', 'clink', 'jingle', 'game', 'arcade', 'collect', 'sfx', 'reward', 'sound effect'],
    'swoosh': ['swoosh', 'swish', 'movement', 'fast', 'air', 'action', 'sport', 'transition', 'sfx', 'cinematic', 'sound effect'],
    // Additional Realistic SFX Tags
    'gun-shots': ['gun', 'shot', 'firearms', 'weapon', 'pistol', 'rifle', 'explosion', 'action', 'war', 'sfx', 'sound effect', 'cinematic'],
    'human-sounds': ['human', 'scream', 'fart', 'burp', 'cough', 'sneeze', 'laugh', 'cry', 'voice', 'sfx', 'foley', 'comedy'],
    'glass-breaking': ['glass', 'breaking', 'shatter', 'crash', 'smash', 'accident', 'impact', 'sfx', 'foley', 'sound effect', 'realistic'],
    'fire': ['fire', 'flame', 'crackling', 'burning', 'campfire', 'torch', 'flames', 'sfx', 'atmosphere', 'ambient', 'sound effect'],
    'thunder': ['thunder', 'storm', 'lightning', 'weather', 'rain', 'stormy', 'nature', 'sfx', 'atmosphere', 'ambient', 'sound effect'],
    'train': ['train', 'railway', 'whistle', 'horn', 'locomotive', 'transportation', 'travel', 'sfx', 'ambience', 'sound effect', 'transport'],
    'beats': ['beat', 'drum', 'rhythm', 'percussion', 'music', 'bass', 'drop', 'electronic', 'hip hop', 'sfx', 'sound effect', 'dance'],
    'impacts': ['impact', 'crash', 'hit', 'punch', 'explosion', 'collision', 'strike', 'crash', 'sfx', 'sound effect', 'action'],
    'home-things': ['home', 'household', 'clock', 'chair', 'plastic', 'office', 'ambient', 'everyday', 'sfx', 'foley', 'domestic', 'sound effect'],
    'mouse-clicks': ['mouse', 'click', 'computer', 'button', 'ui', 'interface', 'office', 'sfx', 'foley', 'technology', 'sound effect'],
    'water-sounds': ['water', 'drip', 'flow', 'splash', 'ocean', 'rain', 'liquid', 'nature', 'ambient', 'sfx', 'sound effect', 'environmental'],
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
    // Additional UI/Creative SFX Descriptions
    'glitch': 'digital glitch and distortion effects for modern videos, transitions, and cyberpunk content',
    'keyboard': 'mechanical and membrane keyboard sounds for office scenes, ASMR, and tech content',
    'typing': 'realistic typing sounds for computer work scenes, productivity videos, and ambient audio',
    'pop': 'fun pop sounds for animations, UI feedback, cartoons, and notification effects',
    'paper': 'paper foley sounds for document handling, book scenes, and office environments',
    'highlighter': 'marker and highlighter sounds for study content, whiteboard videos, and ASMR',
    'notification': 'alert and notification sounds for apps, UI design, and mobile interfaces',
    'ui-click': 'UI click and interaction sounds for app design, web interfaces, and software demos',
    'writing': 'pen and pencil writing sounds for study scenes, calligraphy, and ASMR content',
    'coins': 'coin and money sounds for games, reward systems, and financial content',
    'swoosh': 'fast swoosh and movement sounds for action scenes, sports, and dynamic content',
    // Additional Realistic SFX Descriptions
    'gun-shots': 'realistic gun shot and firearm sounds for action scenes, war movies, and dramatic content',
    'human-sounds': 'human vocal sounds including screams, laughs, coughs, and other natural body sounds',
    'glass-breaking': 'realistic glass breaking and shattering sounds for accidents, action, and dramatic scenes',
    'fire': 'fire and flame sounds for campfires, burning scenes, and atmospheric ambient audio',
    'thunder': 'thunder and storm sounds for weather effects, dramatic scenes, and atmospheric ambience',
    'train': 'train and railway sounds for transportation scenes, travel content, and ambient background',
    'beats': 'rhythmic beats and percussion sounds for music, transitions, and background rhythms',
    'impacts': 'impact and crash sounds for action scenes, collisions, and dramatic effects',
    'home-things': 'everyday household sounds for domestic scenes, office environments, and ambient background',
    'mouse-clicks': 'computer mouse sounds for office scenes, UI design, and technology content',
    'water-sounds': 'water and liquid sounds for nature scenes, environmental audio, and atmospheric ambience',
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

/**
 * Extract descriptive name from prompt
 * e.g., "Paper tear, ripping paper apart" -> "Paper Tear"
 */
function getDescriptiveNameFromPrompt(prompt: string): string {
  // Get the first part before the comma (main description)
  const mainPart = prompt.split(',')[0].trim();
  
  // Capitalize each word
  const formatted = mainPart
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return formatted;
}

/**
 * Find the next available number for a descriptive slug
 */
async function getNextAvailableNumberForSlug(admin: any, baseSlug: string): Promise<number> {
  // Get all existing templates with this base slug prefix
  const { data: existingTemplates } = await admin
    .from('templates')
    .select('slug')
    .like('slug', `${baseSlug}-%`);

  if (!existingTemplates || existingTemplates.length === 0) {
    // Also check if baseSlug-1 exists
    const { data: firstOne } = await admin
      .from('templates')
      .select('slug')
      .eq('slug', `${baseSlug}-1`)
      .maybeSingle();
    
    return firstOne ? 2 : 1;
  }

  // Extract numbers from slugs and find the max
  const numbers = existingTemplates
    .map((t: any) => {
      const match = t.slug.match(new RegExp(`${baseSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n: number) => !isNaN(n) && n > 0);

  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  return maxNumber + 1;
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
    for (let i = 0; i < count; i++) {
      try {
        // Generate sound effect using ElevenLabs
        // Get prompts based on sound type
        const prompts = getSoundEffectPrompts(soundType);
        const promptIndex = i % prompts.length;
        const prompt = prompts[promptIndex] || `${soundType} sound effect, variation ${i + 1}`;
        
        // Extract descriptive name from the prompt
        const descriptiveName = getDescriptiveNameFromPrompt(prompt);
        const baseSlug = generateSlug(descriptiveName);
        
        // Find next available number for this specific descriptive slug
        const effectNumber = await getNextAvailableNumberForSlug(admin, baseSlug);
        const name = `${descriptiveName} ${effectNumber}`;
        const slug = `${baseSlug}-${effectNumber}`;
        
        const duration = Math.min(2 + ((i % 10) * 0.3), 5); // Vary duration from 2-5 seconds
        
        console.log(`Generating sound effect ${i + 1}/${count}: ${name} (slug: ${slug})`);
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
        if (i < count - 1) {
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


