import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import VideoTemplatesClient from '../VideoTemplatesClient';
import LoadingSpinnerServer from '../../../components/ui/loading-spinner-server';
import Script from 'next/script';

// --- agent-notes ---
// ctx: SEO subcategory landing page for video templates
// deps: supabaseServer, VideoTemplatesClient, loading-spinner-server
// state: active
// last: antigravity@2026-08-04
// ---

type PageProps = {
  params: Promise<{ subcategorySlug: string }>;
};

/**
 * Fetches subcategory data and templates for a given subcategory slug
 * under the Video Templates category.
 */
async function getSubcategoryData(subcategorySlug: string) {
  const supabase = getSupabaseServerClient();

  // Find the Video Templates category
  const { data: videoTemplatesCategory } = await supabase
    .from('categories')
    .select('id, name, slug')
    .or('slug.eq.video-templates,name.ilike.%Video Templates%')
    .limit(1)
    .maybeSingle();

  if (!videoTemplatesCategory) return null;

  // Find subcategory by slug under Video Templates
  const { data: subcategory } = await supabase
    .from('subcategories')
    .select('id, name, slug, category_id')
    .eq('slug', subcategorySlug)
    .eq('category_id', videoTemplatesCategory.id)
    .maybeSingle();

  if (!subcategory) return null;

  // Get all subcategory IDs (for the parent category) for template fetching
  const { data: allSubcategories } = await supabase
    .from('subcategories')
    .select('id')
    .eq('category_id', videoTemplatesCategory.id);

  const allSubcatIds = allSubcategories?.map(s => s.id) || [];

  // Fetch templates in this subcategory (and its sub-subcategories)
  const { data: subcatTemplates } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id,is_free')
    .eq('status', 'approved')
    .eq('subcategory_id', subcategory.id)
    .order('created_at', { ascending: false });

  // Also fetch templates at the parent category level (for the client component sidebar)
  const { data: catTemplates } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id,is_free')
    .eq('status', 'approved')
    .eq('category_id', videoTemplatesCategory.id)
    .order('created_at', { ascending: false });

  // Fetch templates from all sibling subcategories too (client component needs full list)
  let siblingTemplates: any[] = [];
  if (allSubcatIds.length > 0) {
    const { data } = await supabase
      .from('templates')
      .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id,is_free')
      .eq('status', 'approved')
      .in('subcategory_id', allSubcatIds)
      .order('created_at', { ascending: false });
    siblingTemplates = data || [];
  }

  // Combine and deduplicate all templates
  const allTemplates = [...(catTemplates || []), ...siblingTemplates];
  const uniqueTemplates = Array.from(
    new Map(allTemplates.map(t => [t.slug, t])).values()
  );

  // Get sub-subcategories for this subcategory (for structured data)
  const { data: subSubcategories } = await supabase
    .from('sub_subcategories')
    .select('id, name, slug')
    .eq('subcategory_id', subcategory.id)
    .order('name');

  return {
    category: videoTemplatesCategory,
    subcategory,
    subSubcategories: subSubcategories || [],
    templates: uniqueTemplates.sort((a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    ),
    subcatTemplates: subcatTemplates || [],
  };
}

/**
 * Format subcategory name for SEO title.
 * e.g. "save-the-date" -> "Save the Date"
 */
function formatSubcategoryTitle(name: string): string {
  return name;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const data = await getSubcategoryData(params.subcategorySlug);

  if (!data) {
    return {
      title: 'Category Not Found',
      description: 'The requested template category was not found.',
    };
  }

  const subcatName = formatSubcategoryTitle(data.subcategory.name);

  const title = `${subcatName} After Effects Templates | Free & Premium AE Templates — Celite`;
  const description = `Download professional ${subcatName} templates for Adobe After Effects. High-quality, easy-to-edit AE project files for wedding videos, openers, titles, and motion graphics on Celite.`;
  const canonicalUrl = `https://celite.in/video-templates/${data.subcategory.slug}`;

  return {
    title,
    description,
    keywords: [
      `${subcatName.toLowerCase()} after effects template`,
      `${subcatName.toLowerCase()} template`,
      `${subcatName.toLowerCase()} video template`,
      `${subcatName.toLowerCase()} ae template`,
      `${subcatName.toLowerCase()} after effects`,
      'after effects templates',
      'video templates',
      'ae templates free',
      'after effects project files',
    ],
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${subcatName} After Effects Templates - Celite` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${subcatName} After Effects Templates | Celite`,
      description,
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export const revalidate = 60;

export default async function SubcategoryPage(props: PageProps) {
  const params = await props.params;
  const data = await getSubcategoryData(params.subcategorySlug);

  if (!data) {
    notFound();
  }

  const { category, subcategory, subSubcategories, templates, subcatTemplates } = data;
  const subcatName = formatSubcategoryTitle(subcategory.name);

  // Map templates to match Template type
  const mappedTemplates = templates.map(t => ({
    ...t,
    price: 0,
    is_featured: Boolean((t as any).feature),
    feature: Boolean((t as any).feature),
  }));

  // Build ItemList structured data for SEO
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${subcatName} After Effects Templates`,
    description: `Download professional ${subcatName} templates for After Effects on Celite.`,
    url: `https://celite.in/video-templates/${subcategory.slug}`,
    numberOfItems: subcatTemplates.length,
    itemListElement: subcatTemplates.slice(0, 20).map((t: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://celite.in/product/${t.slug}`,
      name: t.name,
    })),
  };

  // Build BreadcrumbList structured data
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://celite.in' },
      { '@type': 'ListItem', position: 2, name: 'Video Templates', item: 'https://celite.in/video-templates' },
      { '@type': 'ListItem', position: 3, name: subcatName, item: `https://celite.in/video-templates/${subcategory.slug}` },
    ],
  };

  return (
    <>
      {/* Structured Data */}
      <Script
        id={`schema-itemlist-${subcategory.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Script
        id={`schema-breadcrumb-${subcategory.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Suspense fallback={<LoadingSpinnerServer message="Loading templates..." />}>
        <VideoTemplatesClient
          initialTemplates={mappedTemplates as any}
          pageTitle={`${subcatName} Templates`}
          pageSubtitle={`Explore professional ${subcatName.toLowerCase()} templates for Adobe After Effects. Free & premium AE project files ready to download.`}
          breadcrumbItems={[
            { label: 'Video Templates', href: '/video-templates' },
            { label: subcatName },
          ]}
          basePath="/video-templates"
          initialSubcategorySlug={subcategory.slug}
        />
      </Suspense>
    </>
  );
}
