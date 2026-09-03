import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import Model3DClient from './Model3DClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: '3D Models — Free GLB, GLTF & OBJ Assets for Games & Animation | Celite',
  description: 'Download high-quality 3D models for game development, architectural visualization, animation, and CGI. Free GLB, GLTF, and OBJ 3D assets on Celite.',
  keywords: [
    '3d models',
    'free 3d models',
    'glb 3d models',
    'gltf models',
    'obj 3d assets',
    'game dev 3d models',
    'blender 3d models',
    'unreal engine 3d models',
  ],
  openGraph: {
    title: '3D Models — Free GLB, GLTF & OBJ Assets | Celite',
    description: 'Download high-quality 3D models for games, animation, and CGI. Free GLB, GLTF, and OBJ files.',
    url: 'https://celite.in/3d-models',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: '3D Models - Celite' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '3D Models | Celite',
    description: 'Download high-quality 3D models for games, animation, and CGI.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://celite.in/3d-models',
  },
};

export const revalidate = 60;

export default async function Model3DPage() {
  const supabase = getSupabaseServerClient();
  
  // Fetch 3D Models category - try to find by slug first
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .or('slug.ilike.3d-models,slug.ilike.3d%models,name.ilike.3d%model')
    .maybeSingle();

  let templates: any[] = [];
  
  if (category) {
    const { data, error } = await supabase
      .from('templates')
      .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,model_3d_path,features,software,plugins,tags,created_at,category_id,subcategory_id,feature,vendor_name,status,creator_shop_id,available_on_celite_subscription,available_on_celite_market,price')
      .eq('status', 'approved')
      .eq('category_id', category.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching 3D models:', error);
    } else {
      templates = data || [];
    }
  }

  // Map templates to match Template type
  const mappedTemplates = templates.map(t => ({
    ...t,
    price: Number((t as any).price || 0),
    available_on_celite_subscription: (t as any).available_on_celite_subscription,
    available_on_celite_market: (t as any).available_on_celite_market,
    is_featured: Boolean((t as any).feature),
    feature: Boolean((t as any).feature),
  }));

  return (
    <Suspense fallback={<LoadingSpinnerServer message="Loading 3D models..." />}>
      <Model3DClient 
        initialTemplates={mappedTemplates as any}
        pageTitle="3D Models"
        pageSubtitle="Discover high-quality 3D models for your projects. Download free GLB, GLTF, and OBJ files for game development, animation, and more."
        breadcrumbLabel="3D Models"
        basePath="/3d-models"
      />
    </Suspense>
  );
}

