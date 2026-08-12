import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import VideoTemplatesClient from './VideoTemplatesClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'After Effects Video Templates | Wedding, Cinematic & Motion Graphics — Celite',
  description: 'Download professional After Effects templates for wedding save the date videos, cinematic intros, logo reveals, slideshows, and motion graphics. Free & premium AE project files.',
  keywords: [
    'after effects templates',
    'video templates after effects',
    'cinematic template after effects',
    'wedding video template ae',
    'save the date after effects',
    'motion graphics templates',
    'after effects intro template',
    'logo reveal after effects',
    'ae templates free',
    'film template after effects',
    'movie trailer template',
  ],
  openGraph: {
    title: 'After Effects Video Templates | Wedding & Cinematic Templates — Celite',
    description: 'Download professional After Effects video templates for wedding save the date videos, cinematic intros, logo reveals, and motion graphics.',
    url: 'https://celite.in/video-templates',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'After Effects Video Templates - Celite' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'After Effects Video Templates | Celite',
    description: 'Download professional cinematic, wedding & motion graphics templates for After Effects.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://celite.in/video-templates',
  },
};

export const revalidate = 60;

export default async function TemplatesPage() {
  const supabase = getSupabaseServerClient();
  
  // First, find the Video Templates category
  const { data: videoTemplatesCategory } = await supabase
    .from('categories')
    .select('id')
    .or('slug.eq.video-templates,name.ilike.%Video Templates%')
    .limit(1)
    .maybeSingle();

  if (!videoTemplatesCategory) {
    console.error('Video Templates category not found');
  }

  // Fetch templates from Video Templates category and all its subcategories
  let templates: any[] = [];
  let error: any = null;

  if (videoTemplatesCategory) {
    // Get all subcategories of Video Templates
    const { data: subcategories } = await supabase
      .from('subcategories')
      .select('id')
      .eq('category_id', videoTemplatesCategory.id);

    const subcategoryIds = subcategories?.map(s => s.id) || [];

    // Fetch templates that belong to Video Templates category
    const { data: catTemplates, error: catError } = await supabase
      .from('templates')
      .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id,is_free')
      .eq('status', 'approved')
      .eq('available_on_celite_subscription', true)
      .eq('category_id', videoTemplatesCategory.id)
      .order('created_at', { ascending: false });

    // Fetch templates from subcategories
    let subcatTemplates: any[] = [];
    if (subcategoryIds.length > 0) {
      const { data: subTemplates, error: subError } = await supabase
    .from('templates')
        .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id,is_free')
    .eq('status', 'approved')
    .eq('available_on_celite_subscription', true)
        .in('subcategory_id', subcategoryIds)
    .order('created_at', { ascending: false });

      if (subError) {
        console.error('Error fetching subcategory templates:', subError);
      } else {
        subcatTemplates = subTemplates || [];
      }
    }

    // Combine and deduplicate templates
    const allTemplates = [...(catTemplates || []), ...subcatTemplates];
    const uniqueTemplates = Array.from(
      new Map(allTemplates.map(t => [t.slug, t])).values()
    );
    
    templates = uniqueTemplates.sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    error = catError;
  } else {
    // Fallback: fetch all approved templates if category not found
    const { data: allTemplates, error: allError } = await supabase
      .from('templates')
      .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id,is_free')
      .eq('status', 'approved')
      .eq('available_on_celite_subscription', true)
      .order('created_at', { ascending: false })
      .limit(500);
    
    templates = allTemplates || [];
    error = allError;
  }

  if (error) {
    console.error('Error fetching templates:', error);
  }

  // Map templates to match Template type (add price and is_featured with defaults)
  const mappedTemplates = (templates || []).map(t => ({
    ...t,
    price: 0,
    is_featured: Boolean((t as any).feature),
    feature: Boolean((t as any).feature),
  }));

  return (
    <Suspense fallback={<LoadingSpinnerServer message="Loading templates..." />}>
      <VideoTemplatesClient 
        initialTemplates={mappedTemplates as any}
        pageTitle="Video Templates"
        pageSubtitle="Discover professional video templates for your projects. After Effects templates for cinematic intros, save the date, movie trailers, motion graphics, and more."
        breadcrumbLabel="Video Templates"
        basePath="/video-templates"
      />
    </Suspense>
  );
}

