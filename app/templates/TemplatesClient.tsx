"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { convertR2UrlToCdn } from '../../lib/utils';
import VideoThumbnailPlayer from '../../components/VideoThumbnailPlayer';
import MusicSfxPlayer from '../../components/MusicSfxPlayer';
import StockPhotoViewer from '../../components/StockPhotoViewer';
import { ChevronRight, PlayCircle, Music2, Image, Video, Box, Sparkles, Search } from 'lucide-react';

type Template = {
    slug: string;
    name: string;
    img: string | null;
    video: string | null;
    video_path?: string | null;
    thumbnail_path?: string | null;
    audio_preview_path?: string | null;
    model_3d_path?: string | null;
    category_id?: string | null;
};

type Category = {
    id: string;
    name: string;
    slug: string;
};

type CategoryGroup = {
    category: Category;
    displayName: string;
    templates: Template[];
    count: number;
};

// Helper function to get thumbnail URL
const getThumbnail = (template: Template): string => {
    if (template.thumbnail_path) {
        return convertR2UrlToCdn(template.thumbnail_path) || template.thumbnail_path;
    }
    if (template.img) {
        return convertR2UrlToCdn(template.img) || template.img;
    }
    return '/PNG1.png';
};

// Helper function to get the correct route for a category
const getCategoryRoute = (categorySlug: string): string => {
    const normalizedSlug = categorySlug.toLowerCase().trim();

    const routeMap: Record<string, string> = {
        'after-effects': '/video-templates',
        'website-templates': '/web-templates',
        'psd-templates': '/graphics',
        'musics-and-sfx': '/music-sfx',
        'stock-images': '/stock-photos',
        'web-templates': '/web-templates',
        'graphics': '/graphics',
        'music': '/music-sfx',
        'audio': '/music-sfx',
        'sound-effects': '/music-sfx',
        'stock-photos': '/stock-photos',
        'video-templates': '/video-templates',
        'ui-templates': '/web-templates',
        '3d-models': '/3d-models',
        'prompts': '/prompts',
    };

    if (routeMap[normalizedSlug]) {
        return routeMap[normalizedSlug];
    }

    // Check for partial matches
    if (normalizedSlug.includes('music') || normalizedSlug.includes('audio') || normalizedSlug.includes('sfx') || normalizedSlug.includes('sound')) {
        return '/music-sfx';
    }
    if (normalizedSlug.includes('stock') && (normalizedSlug.includes('photo') || normalizedSlug.includes('image'))) {
        return '/stock-photos';
    }
    if (normalizedSlug.includes('web') || normalizedSlug.includes('website') || normalizedSlug.includes('ui')) {
        return '/web-templates';
    }
    if (normalizedSlug.includes('graphic') || normalizedSlug.includes('psd')) {
        return '/graphics';
    }
    if (normalizedSlug.includes('after-effects') || normalizedSlug.includes('video')) {
        return '/video-templates';
    }
    if (normalizedSlug.includes('3d') || normalizedSlug.includes('model')) {
        return '/3d-models';
    }

    return `/video-templates?category=${categorySlug}`;
};

const MUSIC_SFX_CATEGORY_ID = '143d45f1-a55b-42be-9f51-aab507a20fac';
const STOCK_PHOTOS_CATEGORY_ID = 'ba7f68c3-6f0f-4a29-a337-3b2cef7b4f47';

const isMusicItem = (template: Template): boolean => {
    return template.category_id === MUSIC_SFX_CATEGORY_ID;
};

const isStockPhoto = (template: Template): boolean => {
    return template.category_id === STOCK_PHOTOS_CATEGORY_ID;
};

const is3DModel = (template: Template): boolean => {
    return template.model_3d_path !== null && template.model_3d_path !== undefined;
};

export default function TemplatesClient() {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('search') || '';
    const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

    useEffect(() => {
        setLocalSearchQuery(searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const supabase = getSupabaseBrowserClient();

                // Fetch all categories from the database
                const { data: dbCategories, error: categoryError } = await supabase
                    .from('categories')
                    .select('id, name, slug')
                    .order('name');

                if (categoryError) {
                    console.error('Error loading categories:', categoryError);
                }

                // Fetch templates with category relation and all asset paths
                const { data: templates, error } = await supabase
                    .from('templates')
                    .select('slug, name, img, video, video_path, thumbnail_path, audio_preview_path, model_3d_path, category_id, categories(id, name, slug)')
                    .eq('status', 'approved')
                    .order('created_at', { ascending: false })
                    .limit(2000);

                if (error) {
                    console.error('Error loading templates:', error);
                    setLoading(false);
                    return;
                }

                if (templates && templates.length > 0) {
                    // Build category map
                    const categoryMap = new Map<string, Category>();
                    if (dbCategories) {
                        dbCategories.forEach(cat => {
                            categoryMap.set(cat.id, cat);
                        });
                    }

                    // Group templates by category
                    const groupsByCategory = new Map<string, Template[]>();
                    const categoryCounts = new Map<string, number>();

                    // Filter templates by search query if provided
                    let filteredTemplates = templates;
                    if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase().trim();
                        filteredTemplates = templates.filter((t: any) => {
                            const nameMatch = t.name?.toLowerCase().includes(q);
                            return nameMatch;
                        });
                    }

                    filteredTemplates.forEach((t: any) => {
                        let categoryId = t.category_id;

                        if (categoryId && categoryMap.has(categoryId)) {
                            if (!groupsByCategory.has(categoryId)) {
                                groupsByCategory.set(categoryId, []);
                                categoryCounts.set(categoryId, 0);
                            }
                            // Count all templates in this category
                            categoryCounts.set(categoryId, categoryCounts.get(categoryId)! + 1);

                            // Only add up to 8 templates per category for display
                            const currentTemplates = groupsByCategory.get(categoryId)!;
                            if (currentTemplates.length < 8) {
                                currentTemplates.push({
                                    slug: t.slug,
                                    name: t.name,
                                    img: t.img,
                                    video: t.video,
                                    video_path: t.video_path,
                                    thumbnail_path: t.thumbnail_path,
                                    audio_preview_path: t.audio_preview_path,
                                    model_3d_path: t.model_3d_path,
                                    category_id: t.category_id,
                                });
                            }
                        }
                    });

                    // Convert to CategoryGroup format
                    const groups: CategoryGroup[] = Array.from(groupsByCategory.entries())
                        .map(([categoryId, templates]) => {
                            const category = categoryMap.get(categoryId);
                            if (!category) return null;

                            return {
                                category,
                                displayName: category.name,
                                templates: templates,
                                count: categoryCounts.get(categoryId) || 0,
                            };
                        })
                        .filter((group): group is CategoryGroup => group !== null && group.templates.length > 0)
                        .sort((a, b) => {
                            // Sort by count (descending), then by name
                            if (b.count !== a.count) {
                                return b.count - a.count;
                            }
                            return a.displayName.localeCompare(b.displayName);
                        });

                    setCategoryGroups(groups);
                } else {
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
    }, [searchQuery]);

    const renderTemplatePreview = (template: Template) => {
        if (isMusicItem(template) && template.audio_preview_path) {
            return (
                <div className="relative w-full h-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500">
                    {template.thumbnail_path || template.img ? (
                        <img
                            src={convertR2UrlToCdn(template.thumbnail_path) || template.thumbnail_path || convertR2UrlToCdn(template.img) || template.img || '/PNG1.png'}
                            alt={template.name}
                            className="w-full h-full object-cover"
                        />
                    ) : null}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/30">
                            <Music2 className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
            );
        }

        if (isStockPhoto(template) && (template.thumbnail_path || template.img)) {
            const imageUrl = convertR2UrlToCdn(template.thumbnail_path) || template.thumbnail_path || convertR2UrlToCdn(template.img) || template.img || '/PNG1.png';
            return (
                <img
                    src={imageUrl}
                    alt={template.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            );
        }

        if (template.video_path) {
            return (
                <VideoThumbnailPlayer
                    videoUrl={template.video_path}
                    thumbnailUrl={convertR2UrlToCdn(template.thumbnail_path) || template.thumbnail_path || convertR2UrlToCdn(template.img) || template.img || undefined}
                    title={template.name}
                    className="w-full h-full"
                />
            );
        }


        // Default thumbnail
        return (
            <>
                <img
                    src={getThumbnail(template)}
                    alt={template.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                        e.currentTarget.src = '/PNG1.png';
                    }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-blue-600 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                        <PlayCircle className="w-6 h-6 fill-current" />
                    </div>
                </div>
            </>
        );
    };

    if (loading) {
        return (
            <main className="bg-background min-h-screen pt-20 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center py-20">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                        <p className="mt-4 text-zinc-600">Loading templates...</p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="bg-background min-h-screen pt-20 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="text-center mb-12 pt-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <Sparkles className="w-6 h-6 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">All Templates</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                            {searchQuery ? `Search Results for "${searchQuery}"` : 'Explore All Creative Templates'}
                        </span>
                    </h1>
                    <p className="text-zinc-600 text-lg md:text-xl max-w-3xl mx-auto">
                        {searchQuery
                            ? `Found templates matching your search query.`
                            : `Discover our full collection of creative assets. From video templates to graphics, fonts to music - find everything you need.`
                        }
                    </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-12">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={localSearchQuery}
                            onChange={(e) => {
                                setLocalSearchQuery(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const params = new URLSearchParams();
                                    if (localSearchQuery.trim()) {
                                        params.set('search', localSearchQuery.trim());
                                    }
                                    window.location.href = `/templates?${params.toString()}`;
                                }
                            }}
                            className="block w-full pl-11 pr-4 py-4 bg-white border-2 border-zinc-200 rounded-2xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                            placeholder="Search templates..."
                        />
                    </div>
                </div>

                {/* Category Sections */}
                <div className="space-y-16">
                    {categoryGroups.map((group) => (
                        <div key={group.category.id} className="bg-white rounded-3xl border border-zinc-200 p-6 md:p-8 shadow-sm hover:shadow-lg transition-shadow">
                            {/* Category Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-1 w-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">{group.displayName}</h2>
                                    </div>
                                </div>
                                <Link
                                    href={getCategoryRoute(group.category.slug)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors group"
                                >
                                    View All
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>

                            {/* Templates Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                {group.templates.map((template) => (
                                    <Link
                                        key={template.slug}
                                        href={`/product/${template.slug}`}
                                        className="group relative overflow-hidden rounded-xl border-2 border-zinc-200 bg-white hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                                    >
                                        {/* Template Thumbnail/Video */}
                                        <div className="relative aspect-video overflow-hidden bg-zinc-100">
                                            {renderTemplatePreview(template)}
                                        </div>

                                        {/* Template Info */}
                                        <div className="p-4">
                                            <h3 className="text-sm font-semibold text-zinc-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                                {template.name}
                                            </h3>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {categoryGroups.length === 0 && (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 mb-4">
                            <Sparkles className="w-8 h-8 text-zinc-400" />
                        </div>
                        <p className="text-zinc-500 text-lg">No templates found. Check back soon!</p>
                    </div>
                )}
            </div>
        </main>
    );
}

