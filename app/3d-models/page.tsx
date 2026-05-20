import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import Model3DClient from './Model3DClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: '3D Models - Download Free 3D Models | Celite',
  description: 'Browse and download high-quality 3D models for your projects. Free GLB, GLTF, and OBJ files for game development, animation, and more.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,model_3d_path,features,software,plugins,tags,created_at,category_id,subcategory_id,feature,vendor_name,status,creator_shop_id')
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
    price: 0,
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

