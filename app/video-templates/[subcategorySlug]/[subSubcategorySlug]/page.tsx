import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import VideoTemplatesClient from '../../VideoTemplatesClient';
import LoadingSpinnerServer from '../../../../components/ui/loading-spinner-server';
import Script from 'next/script';

// --- agent-notes ---
// ctx: SEO sub-subcategory landing page for video templates
// deps: supabaseServer, VideoTemplatesClient, loading-spinner-server
// state: active
// last: antigravity@2026-08-04
// ---

type PageProps = {
  params: Promise<{ subcategorySlug: string; subSubcategorySlug: string }>;
};

/**
 * Fetches sub-subcategory data and templates for a given sub-subcategory slug.
 */
async function getSubSubcategoryData(subcategorySlug: string, subSubcategorySlug: string) {
  const supabase = getSupabaseServerClient();

  // Find the Video Templates category
  const { data: videoTemplatesCategory } = await supabase
    .from('categories')
    .select('id, name, slug')
    .or('slug.eq.video-templates,name.ilike.%Video Templates%')
    .limit(1)
    .maybeSingle();

  if (!videoTemplatesCategory) return null;

  // Find subcategory by slug
  const { data: subcategory } = await supabase
    .from('subcategories')
    .select('id, name, slug, category_id')
    .eq('slug', subcategorySlug)
    .eq('category_id', videoTemplatesCategory.id)
    .maybeSingle();

  if (!subcategory) return null;

  // Find sub-subcategory by slug under this subcategory
  const { data: subSubcategory } = await supabase
    .from('sub_subcategories')
    .select('id, name, slug, subcategory_id')
    .eq('slug', subSubcategorySlug)
    .eq('subcategory_id', subcategory.id)
    .maybeSingle();

  if (!subSubcategory) return null;

  // Get all subcategory IDs for template fetching (full client component needs all templates)
  const { data: allSubcategories } = await supabase
    .from('subcategories')
    .select('id')
    .eq('category_id', videoTemplatesCategory.id);

  const allSubcatIds = allSubcategories?.map(s => s.id) || [];

  // Fetch templates specifically in this sub-subcategory (for count and structured data)
  const { data: subSubcatTemplates } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id,is_free')
    .eq('status', 'approved')
    .eq('available_on_celite_subscription', true)
    .eq('sub_subcategory_id', subSubcategory.id)
    .order('created_at', { ascending: false });

  // Fetch all templates in the parent category for the client component
  const { data: catTemplates } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id,is_free')
    .eq('status', 'approved')
    .eq('available_on_celite_subscription', true)
    .eq('category_id', videoTemplatesCategory.id)
    .order('created_at', { ascending: false });

  let siblingTemplates: any[] = [];
  if (allSubcatIds.length > 0) {
    const { data } = await supabase
      .from('templates')
      .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id,is_free')
      .eq('status', 'approved')
      .eq('available_on_celite_subscription', true)
      .in('subcategory_id', allSubcatIds)
      .order('created_at', { ascending: false });
    siblingTemplates = data || [];
  }

  // Combine and deduplicate
  const allTemplates = [...(catTemplates || []), ...siblingTemplates];
  const uniqueTemplates = Array.from(
    new Map(allTemplates.map(t => [t.slug, t])).values()
  );

  return {
    category: videoTemplatesCategory,
    subcategory,
    subSubcategory,
    templates: uniqueTemplates.sort((a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    ),
    subSubcatTemplates: subSubcatTemplates || [],
  };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const data = await getSubSubcategoryData(params.subcategorySlug, params.subSubcategorySlug);

  if (!data) {
    return {
      title: 'Category Not Found',
      description: 'The requested template category was not found.',
    };
  }

  const subSubName = data.subSubcategory.name;
  const subcatName = data.subcategory.name;

  const title = `${subSubName} After Effects Templates | ${subcatName} — Celite`;
  const description = `Download professional ${subSubName} templates for Adobe After Effects. Easy-to-customize AE project files for wedding videos, openers, titles, and creative motion graphics on Celite.`;
  const canonicalUrl = `https://celite.in/video-templates/${data.subcategory.slug}/${data.subSubcategory.slug}`;

  return {
    title,
    description,
    keywords: [
      `${subSubName.toLowerCase()} after effects template`,
      `${subSubName.toLowerCase()} template`,
      `${subSubName.toLowerCase()} video template`,
      `${subcatName.toLowerCase()} templates`,
      'after effects templates',
      'ae templates free',
    ],
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${subSubName} After Effects Templates - Celite` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${subSubName} Templates | Celite`,
      description,
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export const revalidate = 60;

export default async function SubSubcategoryPage(props: PageProps) {
  const params = await props.params;
  const data = await getSubSubcategoryData(params.subcategorySlug, params.subSubcategorySlug);

  if (!data) {
    notFound();
  }

  const { category, subcategory, subSubcategory, templates, subSubcatTemplates } = data;
  const subSubName = subSubcategory.name;
  const subcatName = subcategory.name;

  const mappedTemplates = templates.map(t => ({
    ...t,
    price: 0,
    is_featured: Boolean((t as any).feature),
    feature: Boolean((t as any).feature),
  }));

  // ItemList structured data
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${subSubName} After Effects Templates`,
    description: `Download professional ${subSubName} templates for After Effects on Celite.`,
    url: `https://celite.in/video-templates/${subcategory.slug}/${subSubcategory.slug}`,
    numberOfItems: subSubcatTemplates.length,
    itemListElement: subSubcatTemplates.slice(0, 20).map((t: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://celite.in/product/${t.slug}`,
      name: t.name,
    })),
  };

  // BreadcrumbList structured data
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://celite.in' },
      { '@type': 'ListItem', position: 2, name: 'Video Templates', item: 'https://celite.in/video-templates' },
      { '@type': 'ListItem', position: 3, name: subcatName, item: `https://celite.in/video-templates/${subcategory.slug}` },
      { '@type': 'ListItem', position: 4, name: subSubName, item: `https://celite.in/video-templates/${subcategory.slug}/${subSubcategory.slug}` },
    ],
  };

  return (
    <>
      <Script
        id={`schema-itemlist-${subSubcategory.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Script
        id={`schema-breadcrumb-${subSubcategory.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Suspense fallback={<LoadingSpinnerServer message="Loading templates..." />}>
        <VideoTemplatesClient
          initialTemplates={mappedTemplates as any}
          pageTitle={`${subSubName} Templates`}
          pageSubtitle={`Explore ready-to-use ${subSubName.toLowerCase()} templates for Adobe After Effects. Free & premium AE project files designed for professional video creation.`}
          breadcrumbItems={[
            { label: 'Video Templates', href: '/video-templates' },
            { label: subcatName, href: `/video-templates/${subcategory.slug}` },
            { label: subSubName },
          ]}
          basePath="/video-templates"
          initialSubcategorySlug={subcategory.slug}
          initialSubSubcategorySlug={subSubcategory.slug}
        />
      </Suspense>
    </>
  );
}
