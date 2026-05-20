import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import VideoTemplatesClient from '../video-templates/VideoTemplatesClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Website Templates - HTML, CSS, JavaScript Templates | Celite',
  description: 'Browse and download professional website templates. HTML, CSS, JavaScript templates for your next web project.',
};

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function WebTemplatesPage() {
  const supabase = getSupabaseServerClient();
  
  // Fetch only Website Templates
  const websiteTemplatesCategoryId = 'bb7e7b01-19c7-4606-bcec-956eea4b1497';
  const { data: templates, error } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,feature,vendor_name,status,creator_shop_id')
    .eq('status', 'approved')
    .eq('category_id', websiteTemplatesCategoryId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching website templates:', error);
  }

  // Map templates to match Template type
  const mappedTemplates = (templates || []).map(t => ({
    ...t,
    price: 0,
    is_featured: Boolean((t as any).feature),
    feature: Boolean((t as any).feature),
  }));

  return (
    <Suspense fallback={<LoadingSpinnerServer message="Loading website templates..." />}>
      <VideoTemplatesClient 
        initialTemplates={mappedTemplates as any}
        pageTitle="Website Templates"
        pageSubtitle="Browse professional HTML, CSS, and JavaScript website templates for your next web project."
        breadcrumbLabel="Website Templates"
        basePath="/web-templates"
      />
    </Suspense>
  );
}

