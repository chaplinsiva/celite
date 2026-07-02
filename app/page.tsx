import type { Metadata } from 'next';
import Hero from '../components/Hero';
import CinemaTemplatesShowcase from '../components/CinemaTemplatesShowcase';
import SaveDateTemplatesShowcase from '../components/SaveDateTemplatesShowcase';
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
  const saveDateCatId = getCategoryId('save-date');
  const musicCatId = getCategoryId('stock-musics');
  const sfxCatId = getCategoryId('sound-effects');
  const webCatId = getCategoryId('website-templates');

  // Fetch in parallel
  const [cinemaRes, saveDateRes, musicRes, sfxRes, webRes] = await Promise.all([
    videoCatId
      ? supabase
          .from('templates')
          .select('slug, name, subtitle, img, video_path, thumbnail_path, category_id')
          .eq('status', 'approved')
          .eq('category_id', videoCatId)
          .not('video_path', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: null }),
    saveDateCatId
      ? supabase
          .from('templates')
          .select('slug, name, subtitle, img, video_path, thumbnail_path, category_id')
          .eq('status', 'approved')
          .eq('category_id', saveDateCatId)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: null }),
    musicCatId
      ? supabase
          .from('templates')
          .select('slug, name, subtitle, audio_preview_path, thumbnail_path, img, category_id')
          .eq('status', 'approved')
          .eq('category_id', musicCatId)
          .order('created_at', { ascending: false })
          .limit(16)
      : Promise.resolve({ data: null }),
    sfxCatId
      ? supabase
          .from('templates')
          .select('slug, name, subtitle, audio_preview_path, thumbnail_path, img, category_id')
          .eq('status', 'approved')
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
          .eq('category_id', webCatId)
          .order('created_at', { ascending: false })
          .limit(24)
      : Promise.resolve({ data: null }),
  ]);

  const cinemaTemplates = (cinemaRes.data || []).map((t: any) => ({
    ...t,
    category: { id: videoCatId, name: 'Video Templates', slug: 'video-templates' }
  }));
  const saveDateTemplates = (saveDateRes.data || []).map((t: any) => ({
    ...t,
    category: { id: saveDateCatId, name: 'Save Date', slug: 'save-date' }
  }));
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
      <CinemaTemplatesShowcase initialTemplates={cinemaTemplates as any} />
      <SaveDateTemplatesShowcase initialTemplates={saveDateTemplates as any} />
      <RoyaltyFreeMusicShowcase initialTemplates={musicTemplates as any} />
      <SfxShowcase initialTemplates={sfxTemplates as any} />
      <CategoriesSection />
      <VideoCollectionsCarousel />
      <WebsiteShowcaseCarousel initialTemplates={webTemplates as any} />
      <FAQAndSubscribe />
    </main>
  );
}
