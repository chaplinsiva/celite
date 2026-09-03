import type { Metadata } from 'next';
import Hero from '../components/Hero';
import CinemaTemplatesShowcase from '../components/CinemaTemplatesShowcase';
import SaveDateTemplatesShowcase from '../components/SaveDateTemplatesShowcase';
import MarketTemplatesShowcase from '../components/MarketTemplatesShowcase';
import FreeTemplatesShowcase from '../components/FreeTemplatesShowcase';
import RoyaltyFreeMusicShowcase from '../components/RoyaltyFreeMusicShowcase';
import SfxShowcase from '../components/SfxShowcase';
import LatestTemplatesCarousel from '../components/LatestTemplatesCarousel';
import WebsiteShowcaseCarousel from '../components/WebsiteShowcaseCarousel';
import CategoriesSection from '../components/CategoriesSection';
import VideoCollectionsCarousel from '../components/VideoCollectionsCarousel';
import FAQAndSubscribe from '../components/FAQAndSubscribe';
import { getSupabaseServerClient } from '../lib/supabaseServer';

export const metadata: Metadata = {
  title: 'Celite – Premium After Effects Templates | Wedding, Save the Date & Video Templates',
  description:
    'Download premium After Effects templates for weddings, save the date videos, cinematic intros, logo reveals, and more. Free & premium AE templates with unlimited downloads. The best wedding video template marketplace.',
  keywords: [
    'after effects templates',
    'wedding template after effects',
    'save the date template',
    'save the date after effects',
    'wedding video template',
    'video templates',
    'motion graphics templates',
    'after effects wedding',
    'ae templates',
    'wedding intro after effects',
    'free after effects templates',
    'cinematic template',
    'logo reveal template',
    'wedding slideshow after effects',
  ],
  openGraph: {
    title: 'Celite – Premium After Effects Templates | Wedding & Save the Date Video Templates',
    description: 'Download premium After Effects templates for weddings, save the date videos, cinematic intros, and more. Unlimited downloads with subscription.',
    url: 'https://celite.in',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Celite - Premium After Effects Templates' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Celite – Premium After Effects & Wedding Video Templates',
    description: 'Download premium wedding save the date, cinematic intro & motion graphics templates for After Effects.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://celite.in',
  },
};

// Enable ISR (caching on CDN edge for 60 seconds)
export const revalidate = 60;

export default async function Home() {
  const supabase = getSupabaseServerClient();

  // Fetch all categories first to get IDs
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug');

  const getCategoryId = (slug: string) => categories?.find(c => c.slug === slug)?.id;

  const videoCatId = getCategoryId('video-templates');
  const musicCatId = getCategoryId('stock-musics');
  const sfxCatId = getCategoryId('sound-effects');
  const webCatId = getCategoryId('website-templates');

  // Fetch "Movie Templates" sub-subcategory ID for Cinema section
  const { data: movieSubSubcat } = await supabase
    .from('sub_subcategories')
    .select('id')
    .eq('slug', 'movie-templates')
    .maybeSingle();
  const movieSubSubcatId = movieSubSubcat?.id;

  // Fetch "Save Date" sub-subcategory ID for Save Date section
  const { data: saveDateSubSubcat } = await supabase
    .from('sub_subcategories')
    .select('id')
    .eq('slug', 'save-date')
    .maybeSingle();
  const saveDateSubSubcatId = saveDateSubSubcat?.id;

  // Fetch in parallel
  const [cinemaRes, saveDateRes, marketRes, freeRes, musicRes, sfxRes, webRes] = await Promise.all([
    // Cinema: Only fetch templates from "Movie Templates" sub-subcategory
    movieSubSubcatId
      ? supabase
          .from('templates')
          .select('slug, name, subtitle, img, video_path, thumbnail_path, category_id')
          .eq('status', 'approved')
          .eq('available_on_celite_subscription', true)
          .eq('sub_subcategory_id', movieSubSubcatId)
          .not('video_path', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: null }),
    // Save Date: Only fetch templates from "Save Date" sub-subcategory
    saveDateSubSubcatId
      ? supabase
          .from('templates')
          .select('slug, name, subtitle, img, video_path, thumbnail_path, category_id')
          .eq('status', 'approved')
          .eq('available_on_celite_subscription', true)
          .eq('sub_subcategory_id', saveDateSubSubcatId)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: null }),
    // Celite Market exclusives: only fetch templates NOT available on subscription
    supabase
      .from('templates')
      .select('slug, name, subtitle, img, video_path, thumbnail_path, category_id, price, available_on_celite_subscription, available_on_celite_market')
      .eq('status', 'approved')
      .eq('available_on_celite_subscription', false)
      .order('created_at', { ascending: false }),
    // Free templates: fetch all free templates, then sort by download count
    (async () => {
      const { data: templates } = await supabase
        .from('templates')
        .select('slug, name, subtitle, img, video_path, thumbnail_path, category_id, subcategory_id')
        .eq('status', 'approved')
        .eq('available_on_celite_subscription', true)
        .eq('is_free', true);
      
      let videoFreeTemplates = templates || [];
      if (videoCatId) {
        const { data: subcats } = await supabase.from('subcategories').select('id').eq('category_id', videoCatId);
        const videoSubcatIds = new Set((subcats || []).map((s: any) => s.id));
        videoFreeTemplates = videoFreeTemplates.filter((t: any) => 
          t.category_id === videoCatId || videoSubcatIds.has(t.subcategory_id)
        );
      }
      
      const freeSlugs = videoFreeTemplates.map((t: any) => t.slug);
      
      if (freeSlugs.length > 0) {
        // Fetch download counts for these free templates
        const [{ data: fDl }, { data: pDl }] = await Promise.all([
          supabase.from('free_downloads').select('template_slug').in('template_slug', freeSlugs),
          supabase.from('downloads').select('template_slug').in('template_slug', freeSlugs)
        ]);
        
        const counts: Record<string, number> = {};
        [...(fDl || []), ...(pDl || [])].forEach((d: any) => {
          counts[d.template_slug] = (counts[d.template_slug] || 0) + 1;
        });
        
        // Sort highest to lowest downloads, then take top 20
        const sorted = videoFreeTemplates
          .sort((a: any, b: any) => (counts[b.slug] || 0) - (counts[a.slug] || 0))
          .slice(0, 20);
        return { data: sorted };
      }
      return { data: [] };
    })(),
    musicCatId
      ? supabase
          .from('templates')
          .select('slug, name, subtitle, audio_preview_path, thumbnail_path, img, category_id')
          .eq('status', 'approved')
          .eq('available_on_celite_subscription', true)
          .eq('category_id', musicCatId)
          .order('created_at', { ascending: false })
          .limit(16)
      : Promise.resolve({ data: null }),
    sfxCatId
      ? supabase
          .from('templates')
          .select('slug, name, subtitle, audio_preview_path, thumbnail_path, img, category_id')
          .eq('status', 'approved')
          .eq('available_on_celite_subscription', true)
          .eq('category_id', sfxCatId)
          .not('audio_preview_path', 'is', null)
          .order('created_at', { ascending: false })
          .limit(12)
      : Promise.resolve({ data: null }),
    webCatId
      ? supabase
          .from('templates')
          .select('slug, name, subtitle, description, img, video, video_path, thumbnail_path, features, tags, created_at, category_id, categories(id, name, slug)')
          .eq('status', 'approved')
          .eq('available_on_celite_subscription', true)
          .eq('category_id', webCatId)
          .order('created_at', { ascending: false })
          .limit(24)
      : Promise.resolve({ data: null }),
  ]);

  const cinemaTemplates = (cinemaRes.data || []).map((t: any) => ({
    ...t,
    category: { id: videoCatId, name: 'Video Templates', slug: 'video-templates' }
  }));
  const freeTemplates = freeRes.data || [];
  const saveDateTemplates = (saveDateRes.data || []).map((t: any) => ({
    ...t,
    category: { id: videoCatId, name: 'Video Templates', slug: 'video-templates' }
  }));
  const marketTemplates = marketRes.data || [];
  const musicTemplates = (musicRes.data || []).map((t: any) => ({
    ...t,
    category: { id: musicCatId, name: 'Stock Musics', slug: 'stock-musics' }
  }));
  const sfxTemplates = (sfxRes.data || []).map((t: any) => ({
    ...t,
    category: { id: sfxCatId, name: 'Sound Effects', slug: 'sound-effects' }
  }));

  // Handle the nested structure for websites showcase
  const webTemplates = (webRes.data ?? []).map((tpl: any) => {
    const category = tpl.categories ? (Array.isArray(tpl.categories) ? tpl.categories[0] : tpl.categories) : null;
    return {
      slug: tpl.slug,
      name: tpl.name,
      subtitle: tpl.subtitle,
      desc: tpl.description ?? '',
      price: 0,
      img: tpl.img,
      video: tpl.video,
      video_path: tpl.video_path,
      thumbnail_path: tpl.thumbnail_path,
      features: tpl.features ?? [],
      software: tpl.software ?? [],
      plugins: tpl.plugins ?? [],
      tags: tpl.tags ?? [],
      category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
    };
  });

  return (
    <main className="bg-background min-h-screen">
      <Hero />
      <FreeTemplatesShowcase initialTemplates={freeTemplates as any} />
      <CinemaTemplatesShowcase initialTemplates={cinemaTemplates as any} />
      <SaveDateTemplatesShowcase initialTemplates={saveDateTemplates as any} />
      <MarketTemplatesShowcase initialTemplates={marketTemplates as any} />
      <RoyaltyFreeMusicShowcase initialTemplates={musicTemplates as any} />
      <SfxShowcase initialTemplates={sfxTemplates as any} />
      <CategoriesSection />
      <VideoCollectionsCarousel />
      <WebsiteShowcaseCarousel initialTemplates={webTemplates as any} />
      <FAQAndSubscribe />
    </main>
  );
}
