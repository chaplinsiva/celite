import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import StockPhotosClient from './StockPhotosClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Stock Photos - High-Quality Royalty-Free Images | Celite',
  description: 'Browse our collection of high-quality stock photos. Download royalty-free images for your projects.',
};

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StockPhotosPage() {
  const supabase = getSupabaseServerClient();
  
  // Fetch stock photos templates - Stock Images category
  const stockPhotoCategoryId = 'ba7f68c3-6f0f-4a29-a337-3b2cef7b4f47';
  const { data: templates, error } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,feature,vendor_name,status,creator_shop_id,source_path')
    .eq('status', 'approved')
    .eq('category_id', stockPhotoCategoryId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching stock photos:', error);
  }

  // Map templates to match Template type
  const mappedTemplates = (templates || []).map(t => ({
    ...t,
    price: 0,
    is_featured: Boolean((t as any).feature),
    feature: Boolean((t as any).feature),
  }));

  return (
    <Suspense fallback={<LoadingSpinnerServer message="Loading stock photos..." />}>
      <StockPhotosClient initialTemplates={mappedTemplates as any} />
    </Suspense>
  );
}

