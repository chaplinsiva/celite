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

function resolvePreviewUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const R2_PREFIX = 'r2:';
  if (url.startsWith(R2_PREFIX)) {
    const key = url.slice(R2_PREFIX.length).replace(/^\/+/, '');

    // Prefer explicit direct base if configured
    let base =
      process.env.R2_DIRECT_BASE_URL ||
      process.env.NEXT_PUBLIC_R2_DIRECT_BASE_URL ||
      null;

    // Fallback: build from account + bucket if available
    if (!base && process.env.R2_ACCOUNT_ID && process.env.R2_SOURCE_BUCKET) {
      base = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_SOURCE_BUCKET}`;
    }

    if (!base) return null;

    const trimmedBase = base.replace(/\/+$/, '');
    return `${trimmedBase}/${key}`;
  }

  return url;
}

export default async function TemplatesPage() {
  const supabase = getSupabaseServerClient();
  
  // Fetch all templates for initial load with category_id and subcategory_id
  const { data: templates, error } = await supabase
    .from('templates')
    .select('slug,name,subtitle,description,img,video,features,software,plugins,tags,created_at,category_id,subcategory_id,feature')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching templates:', error);
  }

  // Resolve primary image and manual video previews for cards from template_previews
  const thumbMap = new Map<string, string>();
  const manualVideoMap = new Map<string, string>();
  if (templates && templates.length > 0) {
    const slugs = templates.map(t => t.slug);
    const { data: previewsRows } = await supabase
      .from('template_previews')
      .select('template_slug,kind,url,sort_order')
      .in('template_slug', slugs);

    if (previewsRows) {
      for (const row of previewsRows as any[]) {
        const slug = row.template_slug as string;
        const kind = row.kind as string | null;
        const sortOrder = typeof row.sort_order === 'number' ? row.sort_order : 0;
        const resolvedUrl = resolvePreviewUrl(row.url);
        if (!resolvedUrl) continue;

        if (kind === 'image') {
          const existing = thumbMap.get(slug);
          const currentSort =
            existing != null
              ? (previewsRows.find((r: any) => r.template_slug === slug && resolvePreviewUrl(r.url) === existing)?.sort_order ?? 0)
              : Number.POSITIVE_INFINITY;
          if (existing == null || sortOrder < currentSort) {
            thumbMap.set(slug, resolvedUrl);
          }
        }

        if (kind === 'video') {
          const existing = manualVideoMap.get(slug);
          const currentSort =
            existing != null
              ? (previewsRows.find((r: any) => r.template_slug === slug && resolvePreviewUrl(r.url) === existing)?.sort_order ?? 0)
              : Number.POSITIVE_INFINITY;
          if (existing == null || sortOrder < currentSort) {
            manualVideoMap.set(slug, resolvedUrl);
          }
        }
      }
    }
  }

  // Map templates to match Template type (add price and is_featured with defaults)
  const mappedTemplates = (templates || []).map(t => ({
    ...t,
    img: thumbMap.get(t.slug) || t.img || null,
    manualVideoUrl: manualVideoMap.get(t.slug) || null,
    price: 0,
    is_featured: Boolean(t.feature),
    feature: Boolean(t.feature),
  }));

  return (
    <Suspense fallback={<LoadingSpinnerServer message="Loading templates..." />}>
      <TemplatesClient initialTemplates={mappedTemplates as any} />
    </Suspense>
  );
}

