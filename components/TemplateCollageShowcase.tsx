'use client';
import { useEffect, useState, useMemo } from 'react';
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

// Shuffle array randomly
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default function TemplateCollageShowcase() {
    const [templates, setTemplates] = useState<CollageTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTemplates = async () => {
            const supabase = getSupabaseBrowserClient();

            // Fetch templates with video
            const { data, error } = await supabase
                .from('templates')
                .select(`
          slug,name,img,video_path,thumbnail_path,
          categories(id,name,slug)
        `)
                .eq('status', 'approved')
                .not('video_path', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(50); // Load more to shuffle from

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

            // Shuffle and take 9 random templates for display
            const shuffled = shuffleArray(mapped);
            setTemplates(shuffled.slice(0, 9));
            setLoading(false);
        };

        loadTemplates();
    }, []);

    if (loading) {
        return (
            <section className="relative w-full py-16 bg-zinc-50 overflow-hidden">
                <div className="max-w-[1440px] mx-auto px-6">
                    <div className="animate-pulse">
                        <div className="h-10 bg-zinc-200 rounded w-1/3 mb-4"></div>
                        <div className="h-6 bg-zinc-200 rounded w-1/2 mb-10"></div>
                        <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 h-[400px]">
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

    return (
        <section className="relative w-full py-16 bg-zinc-50 overflow-hidden">
            <div className="relative max-w-[1440px] mx-auto px-6">
                {/* Collage Grid - Responsive masonry style */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4 auto-rows-[180px] lg:auto-rows-[200px]">
                    {templates.map((tpl, index) => {
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
            </div>
        </section>
    );
}
