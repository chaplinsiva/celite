import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetails from './ProductDetails';
import type { Template } from '../../../data/templateData';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { getYouTubeThumbnailUrl } from '../../../lib/utils';

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

interface PageParams { params: { slug: string } }

// SEO
export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const supabase = getSupabaseServerClient();
  const { data: row } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,price,img,video,features,software,plugins,tags,is_featured')
    .eq('slug', params.slug)
    .maybeSingle();
  const prod = row ? ({
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    desc: row.description ?? '',
    price: Number(row.price ?? 0),
    img: row.img,
    video: row.video,
    features: row.features ?? [],
    software: row.software ?? [],
    plugins: row.plugins ?? [],
    tags: row.tags ?? [],
    isFeatured: !!row.is_featured,
  } as Template) : null;
  if (!prod) {
    return {
      title: 'Template Not Found • Celite',
      description: 'This After Effects template does not exist or was removed.',
    };
  }

  // Get YouTube thumbnail if video exists, otherwise use img
  const metaImage = prod.video 
    ? getYouTubeThumbnailUrl(prod.video) 
    : (prod.img || null);

  // Fallback to default image if no image or video
  // For relative URLs, we need to make them absolute
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://celite.com';
  const finalImage = metaImage 
    ? (metaImage.startsWith('http') ? metaImage : `${baseUrl}${metaImage}`)
    : `${baseUrl}/Logo.png`;

  return {
    title: `${prod.name} • Celite AE Template`,
    description: prod.desc.slice(0, 155),
    openGraph: {
      title: `${prod.name} • Celite AE Template`,
      description: prod.desc.slice(0, 155),
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
      title: `${prod.name} • Celite AE Template`,
      description: prod.desc.slice(0, 155),
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

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const supabase = getSupabaseServerClient();
  const { data: row } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,price,img,video,features,software,plugins,tags,is_featured,is_limited_offer,limited_offer_duration_days,limited_offer_start_date')
    .eq('slug', params.slug)
    .maybeSingle();
  if (!row) return notFound();
  const prod: Template & { is_limited_offer?: boolean; limited_offer_duration_days?: number; limited_offer_start_date?: string } = {
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    desc: row.description ?? '',
    price: Number(row.price ?? 0),
    img: row.img,
    video: row.video,
    features: row.features ?? [],
    software: row.software ?? [],
    plugins: row.plugins ?? [],
    tags: row.tags ?? [],
    isFeatured: !!row.is_featured,
    is_limited_offer: (row as any).is_limited_offer ?? false,
    limited_offer_duration_days: (row as any).limited_offer_duration_days ?? null,
    limited_offer_start_date: (row as any).limited_offer_start_date ?? null,
  };
  const { data: relatedRows } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,price,img,video,features,software,plugins,tags,is_featured')
    .neq('slug', prod.slug)
    .limit(9);
  const related: Template[] = (relatedRows ?? []).map((r) => ({
    slug: r.slug,
    name: r.name,
    subtitle: r.subtitle,
    desc: r.description ?? '',
    price: Number(r.price ?? 0),
    img: r.img,
    video: r.video,
    features: r.features ?? [],
    software: r.software ?? [],
    plugins: r.plugins ?? [],
    tags: r.tags ?? [],
    isFeatured: !!r.is_featured,
  }));
  return <ProductDetails product={prod} related={related} reviews={reviews} />;
}
