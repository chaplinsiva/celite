import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import VideoTemplatesClient from '../video-templates/VideoTemplatesClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Website Templates — HTML5, CSS3 & JavaScript Web Templates | Celite',
  description: 'Download responsive website templates built with HTML5, CSS3, Tailwind CSS, and JavaScript. Clean, modern web themes for landing pages, portfolios, and business sites on Celite.',
  keywords: [
    'website templates',
    'html templates',
    'css templates',
    'landing page templates',
    'portfolio website template',
    'tailwind css templates',
    'web design templates',
  ],
  openGraph: {
    title: 'Website Templates — HTML, CSS & JS Templates | Celite',
    description: 'Download responsive website templates and landing page themes for developers and businesses.',
    url: 'https://celite.in/web-templates',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Website Templates - Celite' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Website Templates | Celite',
    description: 'Download responsive website templates for developers and web designers.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://celite.in/web-templates',
  },
};

export const revalidate = 60;

export default async function WebTemplatesPage() {
  const supabase = getSupabaseServerClient();
  
  // Fetch only Website Templates
  const websiteTemplatesCategoryId = 'bb7e7b01-19c7-4606-bcec-956eea4b1497';
  const { data: templates, error } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,feature,vendor_name,status,creator_shop_id')
    .eq('status', 'approved')
    .eq('available_on_celite_subscription', true)
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

