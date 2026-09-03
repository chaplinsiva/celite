import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import StockMusicsClient from './StockMusicsClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Royalty-Free Stock Music Library — Background Music for Videos | Celite',
  description: 'Download royalty-free stock music for YouTube videos, films, podcasts, ads, and social media content. High-quality background tracks across all genres on Celite.',
  keywords: [
    'royalty free music',
    'stock music',
    'background music for videos',
    'youtube background music',
    'cinematic music tracks',
    'royalty free audio',
  ],
  openGraph: {
    title: 'Royalty-Free Stock Music Library | Celite',
    description: 'Download royalty-free stock music for YouTube, films, podcasts, and advertising videos.',
    url: 'https://celite.in/stock-musics',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Stock Music Library - Celite' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stock Music Library | Celite',
    description: 'Download royalty-free stock music for videos and films.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://celite.in/stock-musics',
  },
};

export const revalidate = 60;

export default async function StockMusicsPage() {
  const supabase = getSupabaseServerClient();

  // First get the category ID for 'stock-musics'
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'stock-musics')
    .single();

  if (!category) {
    // If the category doesn't exist yet, return empty array
    return (
      <Suspense fallback={<LoadingSpinnerServer message="Loading stock music library..." />}>
        <StockMusicsClient initialTemplates={[]} />
      </Suspense>
    );
  }

  // Fetch templates for the "Stock Musics" category
  const { data: templates, error } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id,available_on_celite_subscription,available_on_celite_market,price')
    .eq('status', 'approved')
    .eq('category_id', category.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching stock music templates:', error);
  }

  // Map templates to match Template type
  const mappedTemplates = (templates || []).map(t => ({
    ...t,
    price: Number((t as any).price || 0),
    available_on_celite_subscription: (t as any).available_on_celite_subscription,
    available_on_celite_market: (t as any).available_on_celite_market,
    is_featured: Boolean((t as any).feature),
    feature: Boolean((t as any).feature),
  }));

  return (
    <Suspense fallback={<LoadingSpinnerServer message="Loading stock music library..." />}>
      <StockMusicsClient initialTemplates={mappedTemplates as any} />
    </Suspense>
  );
}