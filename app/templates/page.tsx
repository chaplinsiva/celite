import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import TemplatesClient from './TemplatesClient';

export const metadata = {
  title: 'Templates - Browse All After Effects Templates',
  description: 'Browse and search through our complete collection of After Effects templates',
};

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TemplatesPage() {
  const supabase = getSupabaseServerClient();
  
  // Fetch all templates for initial load
  const { data: templates, error } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,price,img,video,features,software,plugins,tags,is_featured,is_limited_offer,limited_offer_duration_days,limited_offer_start_date');

  if (error) {
    console.error('Error fetching templates:', error);
  }

  return (
    <Suspense fallback={<div className="bg-black min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8"><div className="max-w-7xl mx-auto"><p className="text-white">Loading...</p></div></div>}>
      <TemplatesClient initialTemplates={templates || []} />
    </Suspense>
  );
}

