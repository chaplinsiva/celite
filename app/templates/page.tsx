import type { Metadata } from 'next';
import { Suspense } from 'react';
import TemplatesClient from './TemplatesClient';
import { getSupabaseServerClient } from '../../lib/supabaseServer';

export const metadata: Metadata = {
    title: "All Creative Templates | After Effects, Wedding, Video & More",
    description: "Browse all creative templates and assets across multiple categories — After Effects templates, wedding save the date videos, cinematic intros, graphics, fonts, music, and more. Download free & premium templates.",
    keywords: ['after effects templates', 'wedding templates', 'save the date template', 'video templates', 'creative templates', 'motion graphics', 'ae templates'],
    alternates: {
        canonical: 'https://celite.in/templates',
    },
};

// Enable ISR (caching on CDN edge for 60 seconds)
export const revalidate = 60;

export default async function TemplatesPage() {
    const supabase = getSupabaseServerClient();

    // Fetch all categories from the database
    const { data: dbCategories, error: categoryError } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');

    if (categoryError || !dbCategories) {
        console.error('Error loading categories on server:', categoryError);
        return <TemplatesClient initialCategoryGroups={[]} />;
    }

    // Fetch top 8 templates and total count for each category in parallel
    const groups = await Promise.all(
        dbCategories.map(async (category) => {
            const { data: templates, error: templatesError } = await supabase
                .from('templates')
                .select('slug, name, img, video, video_path, thumbnail_path, audio_preview_path, model_3d_path, category_id')
                .eq('status', 'approved')
                .eq('category_id', category.id)
                .order('created_at', { ascending: false })
                .limit(8);

            if (templatesError) {
                console.error(`Error loading templates for category ${category.name}:`, templatesError);
            }

            const { count, error: countError } = await supabase
                .from('templates')
                .select('slug', { count: 'exact', head: true })
                .eq('status', 'approved')
                .eq('category_id', category.id);

            if (countError) {
                console.error(`Error counting templates for category ${category.name}:`, countError);
            }

            return {
                category,
                displayName: category.name,
                templates: (templates || []).map((t: any) => ({
                    ...t,
                    categories: category
                })),
                count: count || 0,
            };
        })
    );

    // Filter out categories with no templates
    const filteredGroups = groups.filter(group => group.templates.length > 0);

    // Sort by count (descending), then by name
    filteredGroups.sort((a, b) => {
        if (b.count !== a.count) {
            return b.count - a.count;
        }
        return a.displayName.localeCompare(b.displayName);
    });

    return (
        <Suspense fallback={
            <main className="bg-background min-h-screen pt-20 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center py-20">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                        <p className="mt-4 text-zinc-600">Loading templates...</p>
                    </div>
                </div>
            </main>
        }>
            <TemplatesClient initialCategoryGroups={filteredGroups as any} />
        </Suspense>
    );
}

