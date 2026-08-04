import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import VideoTemplatesClient from '../video-templates/VideoTemplatesClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Graphics Templates — PSD Templates & Design Assets | Celite',
  description: 'Download professional graphics templates, Photoshop PSD templates, social media post designs, banners, and vector assets for creative projects on Celite.',
  keywords: [
    'graphics templates',
    'psd templates',
    'photoshop templates',
    'design assets',
    'social media graphics',
    'banner templates',
    'vector templates',
  ],
  openGraph: {
    title: 'Graphics Templates — PSD Templates & Design Assets | Celite',
    description: 'Download professional graphics templates, Photoshop PSD files, and vector design assets.',
    url: 'https://celite.in/graphics',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Graphics Templates - Celite' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Graphics Templates | Celite',
    description: 'Download professional Photoshop PSD templates and design assets.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://celite.in/graphics',
  },
};

export const revalidate = 60;

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

