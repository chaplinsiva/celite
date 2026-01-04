import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetails from './ProductDetails';
import type { Template } from '../../../data/templateData';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { convertR2UrlToCdn } from '../../../lib/utils';

const reviews = [
  {
    name: 'Jane Doe',
    rating: 5,
    comment: 'Super easy to use and looks amazing. Saved me tons of time!',
    date: '2024-06-05',
  },
  {
    name: 'Alex Smith',
    rating: 4,
    comment: 'Very flexible, but would love more color presets. Support was fast.',
    date: '2024-06-01',
  },
];

const stableMockCount = (slug: string) => {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash + slug.charCodeAt(i)) | 0;
  }
  const normalized = Math.abs(hash) % 151; // 0..150
  return 100 + normalized; // 100..250
};

const stableMockFollowers = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const normalized = Math.abs(hash) % 201; // 0..200
  return 100 + normalized; // 100..300
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

// SEO
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const supabase = getSupabaseServerClient();
  const { data: row } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,thumbnail_path,video_path,features,software,plugins,tags,meta_title,meta_description,vendor_name,category_id,is_free,price,creator_shop_id,created_at,creator_shops(slug,profile_image_url),categories(id,slug,name)')
    .eq('slug', params.slug)
    .maybeSingle();
  const prod = row ? ({
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    desc: row.description ?? '',
    price: Number(row.price ?? 400),
    img: row.img,
    features: row.features ?? [],
    software: row.software ?? [],
    plugins: row.plugins ?? [],
    tags: row.tags ?? [],
    isFeatured: false,
    is_free: !!row.is_free,
  } as Template) : null;
  if (!prod) {
    return {
      title: 'Template Not Found • Celite',
      description: 'This template does not exist or was removed.',
    };
  }

  // Use thumbnail_path for better preview (actual template preview), fallback to img
  const metaImage = row?.thumbnail_path
    ? convertR2UrlToCdn(row.thumbnail_path) || row.thumbnail_path
    : prod.img || null;

  // Fallback to default image if no image or video
  // For relative URLs, we need to make them absolute
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://celite.com';
  const finalImage = metaImage
    ? (metaImage.startsWith('http') ? metaImage : `${baseUrl}${metaImage}`)
    : `${baseUrl}/PNG1.png`;

  const dbTitle = row?.meta_title?.trim();
  const dbDescription = row?.meta_description?.trim();

  // Get category info to generate appropriate title suffix
  const category = (row as any)?.categories
    ? (Array.isArray((row as any).categories) ? (row as any).categories[0] : (row as any).categories)
    : null;
  const categorySlug = category?.slug?.toLowerCase() || '';
  const categoryName = category?.name || '';
  const categoryId = (row as any)?.category_id;

  // Determine category-specific suffix for title
  let categorySuffix = 'Digital Asset';
  if (categorySlug === '3d-models' || categorySlug.includes('3d') || categoryName?.toLowerCase().includes('3d')) {
    categorySuffix = '3D Model';
  } else if (categoryId === 'ba7f68c3-6f0f-4a29-a337-3b2cef7b4f47' || categorySlug === 'stock-images' || categorySlug === 'stock-photos' || categoryName?.toLowerCase().includes('stock')) {
    categorySuffix = 'Stock Photo';
  } else if (categoryId === '143d45f1-a55b-42be-9f51-aab507a20fac' || categorySlug.includes('music') || categorySlug.includes('audio') || categorySlug.includes('sfx') || categoryName?.toLowerCase().includes('music') || categoryName?.toLowerCase().includes('sfx')) {
    categorySuffix = 'Music & SFX';
  } else if (categorySlug.includes('web') || categorySlug.includes('website') || categoryName?.toLowerCase().includes('web')) {
    categorySuffix = 'Web Template';
  } else if (categorySlug.includes('graphic') || categorySlug.includes('psd') || categoryName?.toLowerCase().includes('graphic')) {
    categorySuffix = 'Graphics Template';
  } else if (categorySlug === 'prompts' || categoryName?.toLowerCase().includes('prompt')) {
    categorySuffix = 'AI Prompt';
  } else if (categorySlug.includes('after-effects') || categorySlug.includes('video') || categoryName?.toLowerCase().includes('after effects') || categoryName?.toLowerCase().includes('video')) {
    categorySuffix = 'Video Template';
  }

  const defaultTitle = `${prod.name} • Celite ${categorySuffix}`;
  const finalTitle = dbTitle && dbTitle.length > 0 ? dbTitle : defaultTitle;
  const fallbackDescription = prod.desc ? prod.desc.slice(0, 155) : `Download high-quality ${categorySuffix.toLowerCase()}s from Celite.`;
  const finalDescription = dbDescription && dbDescription.length > 0 ? dbDescription : fallbackDescription;

  return {
    title: finalTitle,
    description: finalDescription,
    openGraph: {
      title: finalTitle,
      description: finalDescription,
      images: [
        {
          url: finalImage,
          width: 1200,
          height: 630,
          alt: prod.name,
        }
      ],
      type: 'website',
      url: `${baseUrl}/product/${prod.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: finalTitle,
      description: finalDescription,
      images: [finalImage],
    },
  };
}

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Optional: Pre-generate some common pages for SEO (but allow dynamic generation for new ones)
export async function generateStaticParams() {
  // Return empty array to disable pre-generation, allowing all pages to be generated dynamically
  return [];
}

export default async function ProductPage(props: PageProps) {
  const params = await props.params;
  const supabase = getSupabaseServerClient();
  const { data: row } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video_path,thumbnail_path,audio_preview_path,model_3d_path,features,software,plugins,tags,source_path,meta_title,meta_description,vendor_name,category_id,subcategory_id,is_free,price,creator_shop_id,created_at,creator_shops(slug,profile_image_url,created_at),categories(id,slug,name)')
    .eq('slug', params.slug)
    .maybeSingle();
  if (!row) return notFound();
  const { count: downloadCount } = await supabase
    .from('downloads')
    .select('id', { count: 'exact', head: true })
    .eq('template_slug', params.slug);
  const { count: followerCountReal } = row.creator_shop_id
    ? await supabase
        .from('creator_followers')
        .select('id', { count: 'exact', head: true })
        .eq('creator_shop_id', row.creator_shop_id)
    : { count: 0 };
  const creatorCreatedAt = Array.isArray((row as any)?.creator_shops)
    ? (row as any)?.creator_shops?.[0]?.created_at
    : (row as any)?.creator_shops?.created_at;
  const creatorCreatedAtMs = creatorCreatedAt ? new Date(creatorCreatedAt).getTime() : 0;
  const MODERN_CUTOFF = new Date("2026-01-01T00:00:00.000Z").getTime();
  const isModernCreator = creatorCreatedAtMs >= MODERN_CUTOFF;
  const createdAtMs = row.created_at ? new Date(row.created_at as any).getTime() : 0;
  const isNew = createdAtMs ? (Date.now() - createdAtMs) < (3 * 24 * 60 * 60 * 1000) : false;
  const displayDownloadCount = isModernCreator
    ? (downloadCount ?? 0)
    : (downloadCount ?? 0) > 0
      ? (downloadCount ?? 0)
      : (isNew ? 0 : stableMockCount(row.slug));
  const followerCount = isModernCreator
    ? (followerCountReal ?? 0)
    : stableMockFollowers((row as any).vendor_name || row.slug);
  const category = (row as any)?.categories ? (Array.isArray((row as any).categories) ? (row as any).categories[0] : (row as any).categories) : null;
  const categorySlug = category?.slug || '';
  const categoryName = category?.name || '';

  const prod: Template & { source_path?: string | null; vendor_name?: string | null; vendor_slug?: string | null; profile_image_url?: string | null; downloadCount?: number; displayDownloadCount?: number; followerCount?: number; created_at?: string | null; video_path?: string | null; thumbnail_path?: string | null; audio_preview_path?: string | null; model_3d_path?: string | null; category_id?: string | null; subcategory_id?: string | null; category_slug?: string | null; category_name?: string | null } = {
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    desc: row.description ?? '',
    price: Number(row.price ?? 400),
    img: row.img,
    features: row.features ?? [],
    software: row.software ?? [],
    plugins: row.plugins ?? [],
    tags: row.tags ?? [],
    isFeatured: false,
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    source_path: row.source_path ?? null,
    vendor_name: (row as any).vendor_name ?? null,
    video_path: (row as any).video_path ?? null,
    thumbnail_path: (row as any).thumbnail_path ?? null,
    audio_preview_path: (row as any).audio_preview_path ?? null,
    model_3d_path: (row as any).model_3d_path ?? null,
    category_id: (row as any).category_id ?? null,
    subcategory_id: (row as any).subcategory_id ?? null,
    category_slug: categorySlug,
    category_name: categoryName,
    is_free: !!row.is_free,
    profile_image_url: (row as any)?.creator_shops?.profile_image_url ?? (Array.isArray((row as any)?.creator_shops) ? (row as any).creator_shops?.[0]?.profile_image_url : null),
    vendor_slug: (row as any)?.creator_shops?.slug ?? (Array.isArray((row as any)?.creator_shops) ? (row as any).creator_shops?.[0]?.slug : null),
    downloadCount: downloadCount ?? 0,
    displayDownloadCount,
    followerCount,
    created_at: row.created_at as any,
  };

  // Fetch related templates from the same category
  let relatedQuery = supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video_path,thumbnail_path,features,software,plugins,tags,status,vendor_name,price')
    .neq('slug', prod.slug)
    .eq('status', 'approved');

  // Filter by category_id if available
  if (prod.category_id) {
    relatedQuery = relatedQuery.eq('category_id', prod.category_id);
  }

  const { data: relatedRows } = await relatedQuery.limit(9);
  const related: Template[] = (relatedRows ?? []).map((r) => ({
    slug: r.slug,
    name: r.name,
    subtitle: r.subtitle,
    desc: r.description ?? '',
    price: Number(r.price ?? 400),
    img: r.img,
    video_path: (r as any).video_path ?? null,
    thumbnail_path: (r as any).thumbnail_path ?? null,
    model_3d_path: (r as any).model_3d_path ?? null,
    vendor_name: (r as any).vendor_name ?? null,
    features: r.features ?? [],
    software: r.software ?? [],
    plugins: r.plugins ?? [],
    tags: r.tags ?? [],
    isFeatured: false,
  }));
  return <ProductDetails product={prod} related={related} reviews={reviews} />;
}
