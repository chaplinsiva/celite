'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { convertR2UrlToCdn } from '../lib/utils';
import VideoThumbnailPlayer from './VideoThumbnailPlayer';
import { ArrowRight, Sparkles } from 'lucide-react';

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
                .limit(9);

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

    if (loading) {
        return (
            <section className="relative w-full py-16 bg-gradient-to-b from-zinc-900 to-black overflow-hidden">
                <div className="max-w-[1440px] mx-auto px-6">
                    <div className="animate-pulse">
                        <div className="h-10 bg-zinc-800 rounded w-1/3 mb-4"></div>
                        <div className="h-6 bg-zinc-800 rounded w-1/2 mb-10"></div>
                        <div className="grid grid-cols-3 gap-3 h-[500px]">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-zinc-800 rounded-xl"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (templates.length === 0) return null;

    // Create collage layout: large left, medium top-right, small grid bottom-right
    const mainTemplate = templates[0];
    const secondaryTemplates = templates.slice(1, 3);
    const gridTemplates = templates.slice(3, 9);

    return (
        <section className="relative w-full py-16 bg-gradient-to-b from-zinc-900 to-black overflow-hidden">
            {/* Background Glow Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative max-w-[1440px] mx-auto px-6">
                {/* Section Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            <span className="text-amber-400 text-sm font-semibold uppercase tracking-wider">Showcase</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            Creative Templates <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Gallery</span>
                        </h2>
                        <p className="text-zinc-400 text-lg max-w-xl">
                            Explore our curated collection of professional templates. Hover to preview.
                        </p>
                    </div>
                    <Link
                        href="/video-templates"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
                    >
                        Explore All <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Collage Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 min-h-[600px]">

                    {/* Main Featured Template - Large Left */}
                    <div className="lg:col-span-6 lg:row-span-2 group relative rounded-2xl overflow-hidden bg-zinc-800 shadow-2xl shadow-black/50">
                        <Link href={`/product/${mainTemplate.slug}`} className="absolute inset-0 z-20" aria-label={mainTemplate.name} />
                        <div className="w-full h-full min-h-[300px] lg:min-h-full">
                            <VideoThumbnailPlayer
                                videoUrl={mainTemplate.video_path}
                                thumbnailUrl={mainTemplate.thumbnail_path || mainTemplate.img}
                                title={mainTemplate.name}
                                className="w-full h-full"
                            />
                        </div>
                        {/* Overlay Info */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10 pointer-events-none">
                            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white mb-2">
                                {mainTemplate.category?.name || 'Featured'}
                            </span>
                            <h3 className="text-xl md:text-2xl font-bold text-white leading-tight line-clamp-2">
                                {mainTemplate.name}
                            </h3>
                        </div>
                    </div>

                    {/* Secondary Templates - Medium Top Right */}
                    <div className="lg:col-span-6 grid grid-cols-2 gap-3 lg:gap-4">
                        {secondaryTemplates.map((tpl) => (
                            <div
                                key={tpl.slug}
                                className="group relative rounded-xl overflow-hidden bg-zinc-800 aspect-video lg:aspect-[4/3] shadow-xl shadow-black/30"
                            >
                                <Link href={`/product/${tpl.slug}`} className="absolute inset-0 z-20" aria-label={tpl.name} />
                                <VideoThumbnailPlayer
                                    videoUrl={tpl.video_path}
                                    thumbnailUrl={tpl.thumbnail_path || tpl.img}
                                    title={tpl.name}
                                    className="w-full h-full"
                                />
                                {/* Overlay Info */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                    <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">
                                        {tpl.name}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Grid Templates - Small Bottom Right */}
                    <div className="lg:col-span-6 grid grid-cols-3 gap-2 lg:gap-3">
                        {gridTemplates.map((tpl) => (
                            <div
                                key={tpl.slug}
                                className="group relative rounded-lg overflow-hidden bg-zinc-800 aspect-video shadow-lg shadow-black/20"
                            >
                                <Link href={`/product/${tpl.slug}`} className="absolute inset-0 z-20" aria-label={tpl.name} />
                                <VideoThumbnailPlayer
                                    videoUrl={tpl.video_path}
                                    thumbnailUrl={tpl.thumbnail_path || tpl.img}
                                    title={tpl.name}
                                    className="w-full h-full"
                                />
                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors z-10 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <ArrowRight className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>

                {/* Stats Bar */}
                <div className="mt-10 flex flex-wrap items-center justify-center gap-8 md:gap-16 py-6 border-t border-white/10">
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-white">1000+</div>
                        <div className="text-sm text-zinc-400">Templates</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-white">50+</div>
                        <div className="text-sm text-zinc-400">Categories</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-white">4K</div>
                        <div className="text-sm text-zinc-400">Resolution</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-white">24/7</div>
                        <div className="text-sm text-zinc-400">Support</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
