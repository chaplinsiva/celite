/**
 * Script to generate and upload 5 whoosh sound effects
 * 
 * Usage:
 * 1. Make sure ELEVENLABSAPIKEY and ELEVENLABSAPIKEYID are set in .env.local
 * 2. Get an admin auth token from your Supabase dashboard
 * 3. Run: npx tsx scripts/generate-whoosh-sfx.ts <admin-token>
 * 
 * Or call the API directly:
 * curl -X POST http://localhost:3000/api/admin/bulk-upload-sfx \
 *   -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{"count": 5, "soundType": "whoosh"}'
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.argv[2];

if (!ADMIN_TOKEN) {
  console.error('Error: Admin token required');
  console.log('Usage: npx tsx scripts/generate-whoosh-sfx.ts <admin-token>');
  process.exit(1);
}

async function generateWhooshSfx() {
  try {
    console.log('🚀 Starting bulk upload of whoosh sound effects...\n');

    const response = await fetch(`${API_URL}/api/admin/bulk-upload-sfx`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        count: 5,
        soundType: 'whoosh',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error:', result.error);
      process.exit(1);
    }

    console.log('✅ Success!', result.message);
    console.log('\n📊 Results:');
    result.results.forEach((r: any, i: number) => {
      if (r.success) {
        console.log(`  ${i + 1}. ✅ ${r.name} (${r.slug})`);
        console.log(`     URL: ${r.audioUrl}`);
      } else {
        console.log(`  ${i + 1}. ❌ Failed: ${r.error}`);
      }
    });

    console.log(`\n📁 Category: ${result.category.slug}`);
    console.log(`📁 Subcategory: ${result.subcategory.slug}`);
    console.log('\n✨ Done! Check /sound-effects to see your new sound effects.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

generateWhooshSfx();


