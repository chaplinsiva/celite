import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import MusicSfxClient from './MusicSfxClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Music & SFX Library - Royalty-Free Audio | Celite',
  description: 'Browse our collection of royalty-free music and sound effects. Download high-quality audio tracks for your projects.',
};

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MusicSfxPage() {
  const supabase = getSupabaseServerClient();
  
  // Fetch only Music & SFX templates
  const musicSfxCategoryId = '45456b94-cb11-449b-ab99-f0633d6e8848';
  const { data: templates, error } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,feature,vendor_name,status,creator_shop_id')
    .eq('status', 'approved')
    .eq('category_id', musicSfxCategoryId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching music & SFX templates:', error);
  }

  // Map templates to match Template type
  const mappedTemplates = (templates || []).map(t => ({
    ...t,
    price: 0,
    is_featured: Boolean((t as any).feature),
    feature: Boolean((t as any).feature),
  }));

  return (
    <Suspense fallback={<LoadingSpinnerServer message="Loading music & SFX library..." />}>
      <MusicSfxClient initialTemplates={mappedTemplates as any} />
    </Suspense>
  );
}

