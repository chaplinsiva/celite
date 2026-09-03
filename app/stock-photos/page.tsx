import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import StockPhotosClient from './StockPhotosClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Stock Photos — High-Resolution Royalty-Free Images | Celite',
  description: 'Download high-resolution stock photos and royalty-free images for marketing, web design, advertising, and creative projects on Celite.',
  keywords: [
    'stock photos',
    'royalty free images',
    'high resolution stock photos',
    'free stock images',
    'commercial use photos',
    'photography assets',
  ],
  openGraph: {
    title: 'Stock Photos — Royalty-Free High-Res Images | Celite',
    description: 'Download high-resolution stock photos and royalty-free images for marketing and web design.',
    url: 'https://celite.in/stock-photos',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Stock Photos - Celite' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stock Photos | Celite',
    description: 'Download high-resolution stock photos and royalty-free images.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://celite.in/stock-photos',
  },
};

export const revalidate = 60;

export default async function StockPhotosPage() {
  const supabase = getSupabaseServerClient();
  
  // Fetch stock photos templates - Stock Images category
  const stockPhotoCategoryId = 'ba7f68c3-6f0f-4a29-a337-3b2cef7b4f47';
  const { data: templates, error } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,feature,vendor_name,status,creator_shop_id,source_path,available_on_celite_subscription,available_on_celite_market,price')
    .eq('status', 'approved')
    .eq('category_id', stockPhotoCategoryId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching stock photos:', error);
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
    <Suspense fallback={<LoadingSpinnerServer message="Loading stock photos..." />}>
      <StockPhotosClient initialTemplates={mappedTemplates as any} />
    </Suspense>
  );
}

