import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import TemplatesClient from './TemplatesClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Templates - Browse All After Effects Templates | Celite',
  description: 'Browse and search through our complete collection of After Effects templates. Find the perfect template for your project.',
};

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TemplatesPage() {
  const supabase = getSupabaseServerClient();
  
  // Fetch all templates for initial load
  const { data: templates, error } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,price,img,video,features,software,plugins,tags,is_featured,is_limited_offer,limited_offer_duration_days,limited_offer_start_date,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching templates:', error);
  }

  return (
    <Suspense fallback={<LoadingSpinnerServer message="Loading templates..." />}>
      <TemplatesClient initialTemplates={templates || []} />
    </Suspense>
  );
}

