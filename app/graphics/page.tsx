import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import VideoTemplatesClient from '../video-templates/VideoTemplatesClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Graphics Templates - PSD Templates & Design Assets | Celite',
  description: 'Browse and download professional graphics templates, PSD templates, and design assets for your creative projects.',
};

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GraphicsPage() {
  const supabase = getSupabaseServerClient();
  
  // Fetch only PSD Templates
  const psdTemplatesCategoryId = 'acf1f57b-bf0a-42bb-85c5-f4eb65221b04';
  const { data: templates, error } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,feature,vendor_name,status,creator_shop_id')
    .eq('status', 'approved')
    .eq('category_id', psdTemplatesCategoryId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching graphics templates:', error);
  }

  // Map templates to match Template type
  const mappedTemplates = (templates || []).map(t => ({
    ...t,
    price: 0,
    is_featured: Boolean((t as any).feature),
    feature: Boolean((t as any).feature),
  }));

  return (
    <Suspense fallback={<LoadingSpinnerServer message="Loading graphics templates..." />}>
      <VideoTemplatesClient 
        initialTemplates={mappedTemplates as any}
        pageTitle="Graphics Templates"
        pageSubtitle="Browse professional PSD templates and design assets for your creative projects."
        breadcrumbLabel="Graphics"
        basePath="/graphics"
      />
    </Suspense>
  );
}

