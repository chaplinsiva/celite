import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import StockMusicsClient from './StockMusicsClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Stock Music Library - Royalty-Free Tracks | Celite',
  description: 'Browse our collection of royalty-free stock music. Filter by genre, mood, tempo, instruments, and more. Find the perfect track for your project.',
};

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id')
    .eq('status', 'approved')
    .eq('category_id', category.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching stock music templates:', error);
  }

  // Map templates to match Template type
  const mappedTemplates = (templates || []).map(t => ({
    ...t,
    price: 0,
    is_featured: Boolean((t as any).feature),
    feature: Boolean((t as any).feature),
  }));

  return (
    <Suspense fallback={<LoadingSpinnerServer message="Loading stock music library..." />}>
      <StockMusicsClient initialTemplates={mappedTemplates as any} />
    </Suspense>
  );
}