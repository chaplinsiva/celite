'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import VideoThumbnailPlayer from './VideoThumbnailPlayer';
import { ArrowRight, Sparkles, Play } from 'lucide-react';

interface CollageTemplate {
    slug: string;
    name: string;
    video_path?: string | null;
    thumbnail_path?: string | null;
    img?: string | null;
    category?: { id: string; name: string; slug: string } | null;
}

export default function TemplateCollageShowcase() {
    const [templates, setTemplates] = useState<CollageTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const loadTemplates = async () => {
            const supabase = getSupabaseBrowserClient();

            // Fetch featured templates with video for the collage
            const { data, error } = await supabase
                .from('templates')
                .select(`
          slug,name,img,video_path,thumbnail_path,
          categories(id,name,slug)
        `)
                .eq('status', 'approved')
                .not('video_path', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(12);

            if (error) {
                console.error('Error loading collage templates:', error);
                setLoading(false);
                return;
            }

            const mapped: CollageTemplate[] = (data ?? []).map((r: any) => ({
                slug: r.slug,
                name: r.name,
                video_path: r.video_path,
                thumbnail_path: r.thumbnail_path,
                img: r.img,
                category: r.categories ? (Array.isArray(r.categories) ? r.categories[0] : r.categories) : null,
            }));

            setTemplates(mapped);
            setLoading(false);
        };

        loadTemplates();
    }, []);

    // Auto-rotate every 5 seconds
    useEffect(() => {
        if (templates.length === 0) return;
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % Math.min(templates.length, 6));
        }, 5000);
        return () => clearInterval(interval);
    }, [templates.length]);

    if (loading) {
        return (
            <section className="relative w-full py-16 bg-zinc-50 overflow-hidden">
                <div className="max-w-[1440px] mx-auto px-6">
                    <div className="animate-pulse">
                        <div className="h-10 bg-zinc-200 rounded w-1/3 mb-4"></div>
                        <div className="h-6 bg-zinc-200 rounded w-1/2 mb-10"></div>
                        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 h-[400px]">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-zinc-200 rounded-xl"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (templates.length === 0) return null;

    // Create collage layout - 6 templates in various sizes
    const displayTemplates = templates.slice(0, 9);

    return (
        <section className="relative w-full py-16 bg-zinc-50 overflow-hidden">
            <div className="relative max-w-[1440px] mx-auto px-6">
                {/* Section Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-violet-500" />
                            <span className="text-violet-600 text-sm font-semibold uppercase tracking-wider">Featured</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-2">
                            Creative Templates <span className="bg-gradient-to-r from-violet-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">Gallery</span>
                        </h2>
                        <p className="text-zinc-500 text-lg max-w-xl">
                            Explore our curated collection of professional templates. Hover to preview.
                        </p>
                    </div>
                    <Link
                        href="/video-templates"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors shadow-lg"
                    >
                        Explore All <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Collage Grid - Responsive masonry style */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4 auto-rows-[180px] lg:auto-rows-[200px]">

                    {displayTemplates.map((tpl, index) => {
                        // Determine size based on index for visual variety
                        const isLarge = index === 0 || index === 4;
                        const isMedium = index === 1 || index === 5;

                        return (
                            <div
                                key={tpl.slug}
                                className={`group relative rounded-2xl overflow-hidden bg-white border border-zinc-200 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ${isLarge ? 'col-span-2 row-span-2' : isMedium ? 'row-span-2' : ''
                                    }`}
                            >
                                <Link href={`/product/${tpl.slug}`} className="block w-full h-full">
                                    <VideoThumbnailPlayer
                                        videoUrl={tpl.video_path}
                                        thumbnailUrl={tpl.thumbnail_path || tpl.img}
                                        title={tpl.name}
                                        className="w-full h-full"
                                    />
                                </Link>

                                {/* Overlay Info */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none">
                                    <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-semibold text-white mb-1">
                                        {tpl.category?.name || 'Premium'}
                                    </span>
                                    <h3 className={`font-bold text-white leading-tight line-clamp-1 ${isLarge ? 'text-lg' : 'text-sm'}`}>
                                        {tpl.name}
                                    </h3>
                                </div>

                                {/* Play indicator */}
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                                        <Play className="w-4 h-4 text-violet-600 fill-current" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Template Indicators / Quick Nav */}
                <div className="mt-8 flex items-center justify-center gap-2">
                    {displayTemplates.slice(0, 6).map((tpl, index) => (
                        <button
                            key={tpl.slug}
                            onClick={() => setActiveIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${index === activeIndex
                                    ? 'w-8 bg-violet-600'
                                    : 'bg-zinc-300 hover:bg-zinc-400'
                                }`}
                            aria-label={`View template ${index + 1}`}
                        />
                    ))}
                </div>

                {/* Stats Bar */}
                <div className="mt-10 flex flex-wrap items-center justify-center gap-8 md:gap-16 py-6 border-t border-zinc-200">
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-zinc-900">1000+</div>
                        <div className="text-sm text-zinc-500">Templates</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-zinc-900">50+</div>
                        <div className="text-sm text-zinc-500">Categories</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-zinc-900">4K</div>
                        <div className="text-sm text-zinc-500">Resolution</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-zinc-900">24/7</div>
                        <div className="text-sm text-zinc-500">Support</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
