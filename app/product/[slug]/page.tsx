import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetails from './ProductDetails';
import type { Template } from '../../../data/templateData';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';

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
  return {
    title: `${prod.name} • Celite AE Template`,
    description: prod.desc.slice(0, 155),
    openGraph: {
      title: `${prod.name} • Celite AE Template`,
      description: prod.desc.slice(0, 155),
      images: [prod.img],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${prod.name} • Celite AE Template`,
      description: prod.desc.slice(0, 155),
      images: [prod.img],
    },
  };
}

export async function generateStaticParams() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from('templates').select('slug');
  return (data ?? []).map((item) => ({ slug: item.slug }));
}

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const supabase = getSupabaseServerClient();
  const { data: row } = await supabase
    .from('templates')
    .select(`
      slug,name,subtitle,description,price,img,video,features,software,plugins,tags,is_featured,
      is_limited_offer,limited_offer_duration_days,limited_offer_start_date,
      category_id,subcategory_id,
      categories(id,name,slug),
      subcategories(id,name,slug)
    `)
    .eq('slug', params.slug)
    .maybeSingle();
  if (!row) return notFound();
  
  // Handle category/subcategory from Supabase join
  let category = null;
  let subcategory = null;
  
  if (row.categories) {
    if (Array.isArray(row.categories) && row.categories.length > 0) {
      category = row.categories[0];
    } else if (typeof row.categories === 'object' && row.categories.id) {
      category = row.categories;
    }
  }
  
  if (row.subcategories) {
    if (Array.isArray(row.subcategories) && row.subcategories.length > 0) {
      subcategory = row.subcategories[0];
    } else if (typeof row.subcategories === 'object' && row.subcategories.id) {
      subcategory = row.subcategories;
    }
  }
  
  const prod: Template & { 
    is_limited_offer?: boolean; 
    limited_offer_duration_days?: number; 
    limited_offer_start_date?: string;
    category?: { id: string; name: string; slug: string } | null;
    subcategory?: { id: string; name: string; slug: string } | null;
  } = {
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
    category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
    subcategory: subcategory ? { id: subcategory.id, name: subcategory.name, slug: subcategory.slug } : null,
  };
  const { data: relatedRows } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,price,img,video,features,software,plugins,tags,is_featured')
    .neq('slug', prod.slug)
    .limit(3);
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
