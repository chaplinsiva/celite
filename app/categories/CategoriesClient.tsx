"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { getYouTubeThumbnailUrl } from '../../lib/utils';
import YouTubeVideoPlayer from '../../components/YouTubeVideoPlayer';
import { ChevronRight, PlayCircle } from 'lucide-react';

type Template = {
    slug: string;
    name: string;
    img: string | null;
    video: string | null;
    category: string | null;
};

// Helper function to get thumbnail URL
const getThumbnail = (template: Template): string => {
    // Show any image, even if low quality
    if (template.img) {
        return template.img;
    }
    if (template.video) {
        const thumb = getYouTubeThumbnailUrl(template.video);
        if (thumb) return thumb;
    }
    return '/PNG1.png';
};

type CategoryGroup = {
    name: string;
    displayName: string;
    templates: Template[];
};

const CATEGORY_CONFIG = [
    { name: 'stock-videos', displayName: 'Stock Videos' },
    { name: 'video-templates', displayName: 'Video Templates' },
    { name: 'graphics', displayName: 'Graphic Templates' },
    { name: 'presentations', displayName: 'Presentation Templates' },
    { name: 'fonts', displayName: 'Fonts' },
    { name: 'sound-effects', displayName: 'Sound Effects' },
    { name: 'stock-photos', displayName: 'Stock Photos' },
    { name: 'after-effects', displayName: 'After Effects Templates' },
    { name: 'ui-templates', displayName: 'UI Templates' },
    { name: 'music', displayName: 'Music Templates' },
    { name: 'web-templates', displayName: 'Web Templates' },
    { name: 'audio', displayName: 'Royalty-Free Music' },
];

export default function CategoriesClient() {
    const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const supabase = getSupabaseBrowserClient();
                
                // First, fetch all categories from the database
                const { data: dbCategories, error: categoryError } = await supabase
                    .from('categories')
                    .select('id, name, slug')
                    .order('name');

                if (categoryError) {
                    console.error('Error loading categories:', categoryError);
                }

                // Fetch templates with category relation
                const { data: templates, error } = await supabase
                    .from('templates')
                    .select('slug, name, img, video, category_id, categories(id, name, slug)')
                    .order('created_at', { ascending: false })
                    .limit(200);

                if (error) {
                    console.error('Error loading templates:', error);
                    setLoading(false);
                    return;
                }

                if (templates && templates.length > 0) {
                    // Group templates by actual database categories
                    const categoryMap = new Map<string, { name: string; slug: string }>();
                    
                    // Build map from database categories
                    if (dbCategories) {
                        dbCategories.forEach(cat => {
                            categoryMap.set(cat.slug.toLowerCase(), { name: cat.name, slug: cat.slug });
                        });
                    }

                    // Also check CATEGORY_CONFIG for display names
                    const displayNameMap = new Map<string, string>();
                    CATEGORY_CONFIG.forEach(config => {
                        displayNameMap.set(config.name.toLowerCase(), config.displayName);
                    });

                    // Group templates by their actual category
                    const groupsByCategory = new Map<string, Template[]>();
                    
                    templates.forEach((t: any) => {
                        let categorySlug = null;
                        let categoryName = null;
                        
                        if (t.categories) {
                            const category = Array.isArray(t.categories) ? t.categories[0] : t.categories;
                            if (category) {
                                categorySlug = category.slug;
                                categoryName = category.name;
                            }
                        }

                        if (categorySlug) {
                            const key = categorySlug.toLowerCase();
                            if (!groupsByCategory.has(key)) {
                                groupsByCategory.set(key, []);
                            }
                            groupsByCategory.get(key)!.push({
                                slug: t.slug,
                                name: t.name,
                                img: t.img,
                                video: t.video,
                                category: categorySlug,
                            });
                        }
                    });

                    // Convert to CategoryGroup format
                    const groups: CategoryGroup[] = Array.from(groupsByCategory.entries())
                        .map(([slug, templates]) => {
                            const categoryInfo = categoryMap.get(slug) || { name: slug, slug };
                            const displayName = displayNameMap.get(slug) || categoryInfo.name;
                            
                            return {
                                name: categoryInfo.slug,
                                displayName: displayName,
                                templates: templates.slice(0, 4), // Show max 4 templates per category
                            };
                        })
                        .filter(group => group.templates.length > 0)
                        .sort((a, b) => a.displayName.localeCompare(b.displayName));

                    setCategoryGroups(groups);
                } else {
                    // No templates found, set empty array
                    setCategoryGroups([]);
                }
            } catch (error) {
                console.error('Error loading templates:', error);
                setCategoryGroups([]);
            } finally {
                setLoading(false);
            }
        };

        loadTemplates();
    }, []);

    if (loading) {
        return (
            <main className="bg-gradient-to-br from-purple-50/30 via-white to-blue-50/30 min-h-screen pt-20 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center py-20">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                        <p className="mt-4 text-zinc-600">Loading categories...</p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="bg-gradient-to-br from-purple-50/30 via-white to-blue-50/30 min-h-screen pt-20 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="text-center mb-12 pt-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                            Explore All Creative Categories
                        </span>
                    </h1>
                    <p className="text-zinc-600 text-lg max-w-3xl mx-auto">
                        Discover a vast collection of creative assets across multiple categories.
                        From video templates to graphics, fonts to music - find everything you need for your creative projects.
                    </p>
                </div>

                {/* Browse by Categories - Quick Links */}
                <div className="mb-12">
                    <h2 className="text-xl font-bold text-zinc-900 mb-4">Browse by Categories</h2>
                    <div className="flex flex-wrap gap-3">
                        {CATEGORY_CONFIG.map((category) => (
                            <Link
                                key={category.name}
                                href={`/templates?category=${category.name}`}
                                className="px-4 py-2 bg-white border-2 border-zinc-200 rounded-full text-sm font-medium text-zinc-700 hover:border-blue-500 hover:text-blue-600 transition-colors shadow-sm hover:shadow-md"
                            >
                                {category.displayName}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Category Sections */}
                <div className="space-y-12">
                    {categoryGroups.map((group) => (
                        <div key={group.name} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                            {/* Category Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-zinc-900">{group.displayName}</h2>
                                <Link
                                    href={`/templates?category=${group.name}`}
                                    className="flex items-center gap-1 text-blue-600 font-medium hover:text-blue-700 transition-colors group"
                                >
                                    See all
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>

                            {/* Templates Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {group.templates.map((template) => (
                                    <div
                                        key={template.slug}
                                        className="group relative overflow-hidden rounded-xl border-2 border-zinc-200 bg-white hover:border-blue-500 transition-all duration-300 hover:shadow-lg"
                                    >
                                        <Link href={`/product/${template.slug}`} className="block">
                                            {/* Template Thumbnail/Video */}
                                            <div className="relative aspect-video overflow-hidden bg-zinc-100">
                                                {template.video ? (
                                                    <YouTubeVideoPlayer
                                                        videoUrl={template.video}
                                                        title={template.name}
                                                        className="w-full h-full"
                                                    />
                                                ) : (
                                                    <>
                                                        <img
                                                            src={getThumbnail(template)}
                                                            alt={template.name}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                            onError={(e) => {
                                                                // Fallback to logo if thumbnail fails to load
                                                                e.currentTarget.src = '/PNG1.png';
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-blue-600 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                                                                <PlayCircle className="w-6 h-6 fill-current" />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Template Info */}
                                            <div className="p-3">
                                                <h3 className="text-sm font-semibold text-zinc-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                                    {template.name}
                                                </h3>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {categoryGroups.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-zinc-500 text-lg">No templates found. Check back soon!</p>
                    </div>
                )}
            </div>
        </main>
    );
}
