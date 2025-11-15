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
  
  // Fetch all templates for initial load with category_id and subcategory_id
  const { data: templates, error } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,features,software,plugins,tags,created_at,category_id,subcategory_id')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching templates:', error);
  }

  // Map templates to match Template type (add price and is_featured with defaults)
  const mappedTemplates = (templates || []).map(t => ({
    ...t,
    price: 0,
    is_featured: false,
  }));

  return (
    <Suspense fallback={<LoadingSpinnerServer message="Loading templates..." />}>
      <TemplatesClient initialTemplates={mappedTemplates as any} />
    </Suspense>
  );
}

