import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import VideoTemplatesClient from './VideoTemplatesClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Video Templates - After Effects & Mobile Templates | Celite',
  description: 'Browse and search through our complete collection of video templates including After Effects and Mobile templates. Find the perfect motion graphics template for your project.',
};

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id')
      .eq('status', 'approved')
      .eq('category_id', videoTemplatesCategory.id)
      .order('created_at', { ascending: false });

    // Fetch templates from subcategories
    let subcatTemplates: any[] = [];
    if (subcategoryIds.length > 0) {
      const { data: subTemplates, error: subError } = await supabase
    .from('templates')
        .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id')
    .eq('status', 'approved')
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
    
    // Filter for cinema/movie templates only
    const cinemaKeywords = ['cinema', 'cinematic', 'film', 'movie', 'cinematography', 'cinematic'];
    const filteredTemplates = uniqueTemplates.filter((template) => {
      const name = template.name?.toLowerCase() || '';
      const subtitle = template.subtitle?.toLowerCase() || '';
      const description = template.description?.toLowerCase() || '';
      
      // Check tags if it's an array or JSON string
      let tags: string[] = [];
      if (Array.isArray(template.tags)) {
        tags = template.tags.map((t: any) => String(t).toLowerCase());
      } else if (typeof template.tags === 'string') {
        try {
          const parsed = JSON.parse(template.tags);
          tags = Array.isArray(parsed) ? parsed.map((t: any) => String(t).toLowerCase()) : [];
        } catch {
          tags = [template.tags.toLowerCase()];
        }
      }
      
      // Check if any keyword matches
      const allText = [name, subtitle, description, ...tags].join(' ');
      return cinemaKeywords.some(keyword => allText.includes(keyword));
    });
    
    templates = filteredTemplates.sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    error = catError;
  } else {
    // Fallback: fetch all approved templates if category not found, then filter for cinema
    const { data: allTemplates, error: allError } = await supabase
      .from('templates')
      .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(500);
    
    // Filter for cinema/movie templates only
    const cinemaKeywords = ['cinema', 'cinematic', 'film', 'movie', 'cinematography', 'cinematic'];
    const filteredTemplates = (allTemplates || []).filter((template) => {
      const name = template.name?.toLowerCase() || '';
      const subtitle = template.subtitle?.toLowerCase() || '';
      const description = template.description?.toLowerCase() || '';
      
      // Check tags if it's an array or JSON string
      let tags: string[] = [];
      if (Array.isArray(template.tags)) {
        tags = template.tags.map((t: any) => String(t).toLowerCase());
      } else if (typeof template.tags === 'string') {
        try {
          const parsed = JSON.parse(template.tags);
          tags = Array.isArray(parsed) ? parsed.map((t: any) => String(t).toLowerCase()) : [];
        } catch {
          tags = [template.tags.toLowerCase()];
        }
      }
      
      // Check if any keyword matches
      const allText = [name, subtitle, description, ...tags].join(' ');
      return cinemaKeywords.some(keyword => allText.includes(keyword));
    });
    
    templates = filteredTemplates;
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
        pageTitle="Cinema Templates"
        pageSubtitle="Discover professional cinematic and movie templates for your film projects. High-quality After Effects templates for cinematic intros, trailers, and more."
        breadcrumbLabel="Cinema Templates"
        basePath="/video-templates"
      />
    </Suspense>
  );
}

