'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { convertR2UrlToCdn } from '@/lib/utils';
import { ArrowRight, Play, Pause, Music } from 'lucide-react';

type MusicTemplate = {
    slug: string;
    name: string;
    subtitle?: string;
    audio_preview_path?: string;
    thumbnail_path?: string;
    img?: string;
};

// Stock album cover images for templates without thumbnails
const albumCovers = [
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop', // concert
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop', // studio
    'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop', // headphones
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop', // dj
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop', // concert lights
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', // headphones colorful
    'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop', // vinyl
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop', // studio mixer
    'https://images.unsplash.com/photo-1526142684086-7ebd69df27a5?w=400&h=400&fit=crop', // piano
    'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=400&fit=crop', // guitar
    'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=400&fit=crop', // sheet music
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop', // acoustic guitar
    'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&h=400&fit=crop', // neon music
    'https://images.unsplash.com/photo-1513829596324-4bb2800c5efb?w=400&h=400&fit=crop', // record player
    'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=400&fit=crop', // piano keys
    'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&h=400&fit=crop', // microphone
];

type MusicCardProps = {
    template: MusicTemplate;
    index: number;
    currentlyPlaying: string | null;
    onPlay: (slug: string | null) => void;
};

function MusicCard({ template, index, currentlyPlaying, onPlay }: MusicCardProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const isPlaying = currentlyPlaying === template.slug;

    const albumCover = albumCovers[index % albumCovers.length];
    const thumbnail = (template.thumbnail_path && convertR2UrlToCdn(template.thumbnail_path))
        || (template.img && convertR2UrlToCdn(template.img))
        || albumCover;

    const audioUrl = template.audio_preview_path
        ? convertR2UrlToCdn(template.audio_preview_path)
        : null;

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying && audioUrl) {
                setIsLoading(true);
                audioRef.current.play()
                    .then(() => setIsLoading(false))
                    .catch(() => setIsLoading(false));
            } else {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        }
    }, [isPlaying, audioUrl]);

    const handlePlayClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!audioUrl) return;

        if (isPlaying) {
            onPlay(null);
        } else {
            onPlay(template.slug);
        }
    };

    return (
        <div className="group flex flex-col items-center gap-3">
            {/* Album Cover */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.03]">
                <img
                    src={thumbnail || albumCover}
                    alt={template.name}
                    className="w-full h-full object-cover"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Play/Pause Button - covers the entire album cover */}
                {audioUrl && (
                    <button
                        onClick={handlePlayClick}
                        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 cursor-pointer ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                    >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isPlaying
                            ? 'bg-white text-zinc-900 scale-100'
                            : 'bg-white/90 text-zinc-900 scale-90 group-hover:scale-100'
                            }`}>
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                            ) : isPlaying ? (
                                <Pause className="w-6 h-6 fill-zinc-900" />
                            ) : (
                                <Play className="w-6 h-6 fill-zinc-900 ml-1" />
                            )}
                        </div>
                    </button>
                )}

                {/* Playing indicator */}
                {isPlaying && (
                    <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                        <div className="flex items-center gap-1 justify-center">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-white rounded-full animate-pulse"
                                    style={{
                                        height: `${Math.random() * 16 + 8}px`,
                                        animationDelay: `${i * 0.1}s`,
                                        animationDuration: '0.5s',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Hidden audio element */}
                {audioUrl && (
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        preload="none"
                        onEnded={() => onPlay(null)}
                    />
                )}
            </div>

            {/* Title - Click to go to product detail */}
            <div className="text-center px-2 w-full">
                <Link
                    href={`/product/${template.slug}`}
                    className="text-sm font-semibold text-white truncate hover:text-purple-400 transition-colors block"
                >
                    {template.name}
                </Link>
                {template.subtitle && (
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {template.subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}

export default function RoyaltyFreeMusicShowcase() {
    const [templates, setTemplates] = useState<MusicTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const supabase = getSupabaseBrowserClient();

                // Fetch music templates from stock-musics category
                const { data, error } = await supabase
                    .from('templates')
                    .select(`
            slug,
            name,
            subtitle,
            audio_preview_path,
            thumbnail_path,
            img,
            category_id,
            categories!inner(id, name, slug)
          `)
                    .eq('status', 'approved')
                    .eq('categories.slug', 'stock-musics')
                    .order('created_at', { ascending: false })
                    .limit(16);

                if (error) {
                    console.error('Error loading music templates:', error);
                    setTemplates([]);
                } else {
                    setTemplates((data || []) as MusicTemplate[]);
                }
            } catch (err) {
                console.error('Error:', err);
                setTemplates([]);
            } finally {
                setLoading(false);
            }
        };

        loadTemplates();
    }, []);

    // Stop playing when component unmounts
    useEffect(() => {
        return () => {
            setCurrentlyPlaying(null);
        };
    }, []);

    if (loading) {
        return (
            <section className="relative w-full py-12 md:py-16 px-4 sm:px-6 bg-gradient-to-b from-zinc-950 to-zinc-900">
                <div className="max-w-[1400px] mx-auto">
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-4 md:gap-5">
                        {[...Array(16)].map((_, i) => (
                            <div key={i} className="flex flex-col gap-3">
                                <div className="aspect-square bg-zinc-800 rounded-2xl animate-pulse" />
                                <div className="h-4 bg-zinc-800 rounded animate-pulse mx-2" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (templates.length === 0) {
        return null;
    }

    return (
        <section className="relative w-full py-12 md:py-16 px-4 sm:px-6 bg-gradient-to-b from-zinc-950 to-zinc-900 overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
            </div>

            <div className="max-w-[1400px] mx-auto relative z-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
                    <div className="flex items-start gap-4">
                        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/25">
                            <Music className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight mb-2">
                                Royalty-Free Music
                            </h2>
                            <p className="text-zinc-400 text-sm md:text-base max-w-lg">
                                Use freely, no copyright worries. Perfect for your videos, podcasts, and projects.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/stock-musics"
                        className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors group whitespace-nowrap"
                    >
                        Browse all music
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* Music Grid - 8 columns */}
                <div className="grid grid-cols-4 md:grid-cols-8 gap-4 md:gap-5">
                    {templates.map((template, index) => (
                        <MusicCard
                            key={template.slug}
                            template={template}
                            index={index}
                            currentlyPlaying={currentlyPlaying}
                            onPlay={setCurrentlyPlaying}
                        />
                    ))}
                </div>

                {/* Mobile View All Link */}
                <div className="sm:hidden mt-8 text-center">
                    <Link
                        href="/stock-musics"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                        Browse all music
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Feature badges */}
                <div className="flex flex-wrap justify-center gap-3 mt-10">
                    {['100% Royalty Free', 'Commercial Use', 'No Attribution Required', 'Instant Download'].map((badge, i) => (
                        <span
                            key={i}
                            className="px-4 py-2 rounded-full text-xs font-medium bg-zinc-800/50 text-zinc-300 border border-zinc-700/50"
                        >
                            ✓ {badge}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
