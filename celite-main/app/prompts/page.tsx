import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import PromptsClient from './PromptsClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
    title: 'AI Prompts - Professional ChatGPT, Midjourney & DALL-E Prompts | Celite',
    description: 'Browse our collection of professional AI prompts for ChatGPT, Midjourney, DALL-E, Stable Diffusion and more. Find the perfect prompt templates for your creative projects.',
};

// Force dynamic rendering so new prompts appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PromptsPage() {
    const supabase = getSupabaseServerClient();

    // Find the Prompts category
    const { data: promptsCategory } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('slug', 'prompts')
        .maybeSingle();

    if (!promptsCategory) {
        console.error('Prompts category not found');
    }

    // Fetch subcategories for Prompts
    let subcategories: any[] = [];
    if (promptsCategory) {
        const { data: subcats } = await supabase
            .from('subcategories')
            .select('id, name, slug, category_id')
            .eq('category_id', promptsCategory.id)
            .order('name');

        subcategories = subcats || [];
    }

    // Fetch templates from Prompts category
    let templates: any[] = [];
    let error: any = null;

    if (promptsCategory) {
        const subcategoryIds = subcategories.map(s => s.id);

        // Fetch templates that belong to Prompts category
        const { data: catTemplates, error: catError } = await supabase
            .from('templates')
            .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id')
            .eq('status', 'approved')
            .eq('category_id', promptsCategory.id)
            .order('created_at', { ascending: false });

        // Fetch templates from subcategories
        let subcatTemplates: any[] = [];
        if (subcategoryIds.length > 0) {
            const { data: subTemplates, error: subError } = await supabase
                .from('templates')
                .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id')
                .eq('status', 'approved')
                .in('subcategory_id', subcategoryIds)
                .order('created_at', { ascending: false });

            if (subError) {
                console.error('Error fetching subcategory templates:', subError);
            } else {
                subcatTemplates = subTemplates || [];
            }
        }

        // Combine and deduplicate templates
        const allTemplates = [...(catTemplates || []), ...subcatTemplates];
        const uniqueTemplates = Array.from(
            new Map(allTemplates.map(t => [t.slug, t])).values()
        );
        templates = uniqueTemplates.sort((a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        error = catError;
    }

    if (error) {
        console.error('Error fetching prompts:', error);
    }

    // Map templates to match Template type
    const mappedTemplates = (templates || []).map(t => ({
        ...t,
        price: 0,
        is_featured: Boolean((t as any).feature),
        feature: Boolean((t as any).feature),
    }));

    return (
        <Suspense fallback={<LoadingSpinnerServer message="Loading prompts..." />}>
            <PromptsClient
                initialTemplates={mappedTemplates as any}
                subcategories={subcategories}
            />
        </Suspense>
    );
}
