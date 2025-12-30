import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import SfxClient from './SfxClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Sound Effects Library - Royalty-Free Audio | Celite',
  description: 'Browse our collection of royalty-free sound effects. Download high-quality audio tracks for your projects.',
};

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SoundEffectsPage() {
  const supabase = getSupabaseServerClient();
  
  // First get the Sound Effects category ID
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'sound-effects')
    .maybeSingle();

  if (!category) {
    // Category doesn't exist yet, return empty array
    return (
      <Suspense fallback={<LoadingSpinnerServer message="Loading sound effects library..." />}>
        <SfxClient initialTemplates={[]} />
      </Suspense>
    );
  }

  // Fetch Sound Effects templates
  const { data: templates, error } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id')
    .eq('status', 'approved')
    .eq('category_id', category.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sound effects templates:', error);
  }

  // Map templates to match Template type
  const mappedTemplates = (templates || []).map(t => ({
    ...t,
    price: 0,
    is_featured: Boolean((t as any).feature),
    feature: Boolean((t as any).feature),
  }));

  return (
    <Suspense fallback={<LoadingSpinnerServer message="Loading sound effects library..." />}>
      <SfxClient initialTemplates={mappedTemplates as any} />
    </Suspense>
  );
}


