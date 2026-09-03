import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import SfxClient from './SfxClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Sound Effects Library — Royalty-Free SFX for Video & Games | Celite',
  description: 'Download royalty-free sound effects for video editing, game development, film production, and podcasts. High-quality Foley, impacts, transitions, and ambient SFX on Celite.',
  keywords: [
    'sound effects',
    'royalty free sfx',
    'sfx for video editing',
    'foley sound effects',
    'game sound effects',
    'cinematic sfx',
  ],
  openGraph: {
    title: 'Sound Effects Library — Royalty-Free SFX | Celite',
    description: 'Download royalty-free sound effects for video editing, game development, and film production.',
    url: 'https://celite.in/sound-effects',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Sound Effects Library - Celite' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sound Effects Library | Celite',
    description: 'Download royalty-free sound effects for video editing and games.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://celite.in/sound-effects',
  },
};

export const revalidate = 60;

export default async function SoundEffectsPage() {
  const supabase = getSupabaseServerClient();
  
  // First get the Sound Effects category ID
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'sound-effects')
    .maybeSingle();

  if (!category) {
    // Category doesn't exist yet, return empty array
    return (
      <Suspense fallback={<LoadingSpinnerServer message="Loading sound effects library..." />}>
        <SfxClient initialTemplates={[]} />
      </Suspense>
    );
  }

  // Fetch Sound Effects templates
  const { data: templates, error } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id,available_on_celite_subscription,available_on_celite_market,price')
    .eq('status', 'approved')
    .eq('category_id', category.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sound effects templates:', error);
  }

  // Map templates to match Template type
  const mappedTemplates = (templates || []).map(t => ({
    ...t,
    price: (t as any).price ?? 0,
    available_on_celite_subscription: (t as any).available_on_celite_subscription ?? true,
    available_on_celite_market: Boolean((t as any).available_on_celite_market),
    is_featured: Boolean((t as any).feature),
    feature: Boolean((t as any).feature),
  }));

  return (
    <Suspense fallback={<LoadingSpinnerServer message="Loading sound effects library..." />}>
      <SfxClient initialTemplates={mappedTemplates as any} />
    </Suspense>
  );
}


