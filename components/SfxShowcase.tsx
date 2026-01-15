'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { convertR2UrlToCdn } from '@/lib/utils';
import { ArrowRight, Play, Pause, Volume2, Zap } from 'lucide-react';

type SfxTemplate = {
    slug: string;
    name: string;
    subtitle?: string;
    audio_preview_path?: string;
    thumbnail_path?: string;
    img?: string;
};

// Waveform visualization colors
const waveformColors = [
    'from-cyan-400 to-blue-500',
    'from-orange-400 to-red-500',
    'from-green-400 to-emerald-500',
    'from-purple-400 to-violet-500',
    'from-pink-400 to-rose-500',
    'from-yellow-400 to-amber-500',
    'from-teal-400 to-cyan-500',
    'from-indigo-400 to-purple-500',
];

// SFX category icons
const sfxIcons = ['💥', '🔊', '⚡', '🎬', '🌊', '🔔', '🎮', '🚀'];

type SfxCardProps = {
    template: SfxTemplate;
    index: number;
    currentlyPlaying: string | null;
    onPlay: (slug: string | null) => void;
};

function SfxCard({ template, index, currentlyPlaying, onPlay }: SfxCardProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const isPlaying = currentlyPlaying === template.slug;

    const waveformColor = waveformColors[index % waveformColors.length];
    const icon = sfxIcons[index % sfxIcons.length];

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
                setProgress(0);
            }
        }
    }, [isPlaying, audioUrl]);

    // Update progress bar
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        audio.addEventListener('timeupdate', updateProgress);
        return () => audio.removeEventListener('timeupdate', updateProgress);
    }, []);

    const handlePlayClick = () => {
        if (!audioUrl) return;

        if (isPlaying) {
            onPlay(null);
        } else {
            onPlay(template.slug);
        }
    };

    // Generate random waveform bars
    const waveformBars = Array.from({ length: 20 }, (_, i) => ({
        height: Math.random() * 60 + 20,
        delay: i * 0.05,
    }));

    return (
        <div className="group relative">
            {/* Main Card */}
            <div className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${isPlaying
                    ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/20'
                    : 'bg-zinc-800/50 hover:bg-zinc-800'
                }`}>
                <div className="p-4 flex items-center gap-4">
                    {/* Play Button */}
                    <button
                        onClick={handlePlayClick}
                        disabled={!audioUrl}
                        className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${isPlaying
                                ? 'bg-gradient-to-br ' + waveformColor + ' text-white shadow-lg'
                                : audioUrl
                                    ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 group-hover:text-white'
                                    : 'bg-zinc-700/50 text-zinc-500 cursor-not-allowed'
                            }`}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : isPlaying ? (
                            <Pause className="w-5 h-5 fill-white" />
                        ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                        )}

                        {/* Pulse animation when playing */}
                        {isPlaying && (
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400/30 to-blue-500/30 animate-ping" />
                        )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <Link
                            href={`/product/${template.slug}`}
                            className="text-sm font-semibold text-white truncate hover:text-cyan-400 transition-colors block"
                        >
                            {template.name}
                        </Link>
                        {template.subtitle ? (
                            <p className="text-xs text-zinc-400 truncate mt-0.5">{template.subtitle}</p>
                        ) : (
                            <p className="text-xs text-zinc-500 mt-0.5">Sound Effect</p>
                        )}
                    </div>

                    {/* Waveform/Icon */}
                    <div className="hidden sm:flex items-center gap-0.5 h-8 flex-shrink-0">
                        {isPlaying ? (
                            // Animated waveform when playing
                            waveformBars.slice(0, 12).map((bar, i) => (
                                <div
                                    key={i}
                                    className={`w-1 rounded-full bg-gradient-to-t ${waveformColor} transition-all duration-150`}
                                    style={{
                                        height: `${isPlaying ? bar.height * 0.4 : 8}px`,
                                        animation: isPlaying ? `waveform 0.5s ease-in-out infinite alternate` : 'none',
                                        animationDelay: `${bar.delay}s`,
                                    }}
                                />
                            ))
                        ) : (
                            // Static icon when not playing
                            <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">
                                {icon}
                            </span>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                {isPlaying && (
                    <div className="h-1 bg-zinc-700">
                        <div
                            className={`h-full bg-gradient-to-r ${waveformColor} transition-all duration-100`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Hidden audio element */}
            {audioUrl && (
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="none"
                    onEnded={() => onPlay(null)}
                />
            )}

            {/* CSS for waveform animation */}
            <style jsx>{`
                @keyframes waveform {
                    0% { transform: scaleY(0.5); }
                    100% { transform: scaleY(1); }
                }
            `}</style>
        </div>
    );
}

export default function SfxShowcase() {
    const [templates, setTemplates] = useState<SfxTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const supabase = getSupabaseBrowserClient();

                // Fetch SFX templates from sound-effects category
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
                    .eq('categories.slug', 'sound-effects')
                    .not('audio_preview_path', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(12);

                if (error) {
                    console.error('Error loading SFX templates:', error);
                    setTemplates([]);
                } else {
                    setTemplates((data || []) as SfxTemplate[]);
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
            <section className="relative w-full py-12 md:py-16 px-4 sm:px-6 bg-zinc-900">
                <div className="max-w-[1400px] mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="h-20 bg-zinc-800 rounded-2xl animate-pulse" />
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
        <section className="relative w-full py-12 md:py-16 px-4 sm:px-6 bg-zinc-900 overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-72 h-72 bg-cyan-600/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-orange-600/5 rounded-full blur-3xl" />
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 opacity-[0.02]" style={{
                    backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }} />
            </div>

            <div className="max-w-[1400px] mx-auto relative z-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
                    <div className="flex items-start gap-4">
                        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/25">
                            <Zap className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight mb-2">
                                Sound Effects
                            </h2>
                            <p className="text-zinc-400 text-sm md:text-base max-w-lg">
                                Whooshes, impacts, transitions & more. Click to preview instantly.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/sound-effects"
                        className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors group whitespace-nowrap"
                    >
                        Browse all SFX
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* SFX Grid - 3 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates.map((template, index) => (
                        <SfxCard
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
                        href="/sound-effects"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                        Browse all SFX
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Feature highlights */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: '⚡', label: 'Instant Preview', desc: 'Click to play' },
                        { icon: '🎬', label: 'HD Quality', desc: 'Studio grade' },
                        { icon: '📦', label: 'Bulk Packs', desc: 'Save more' },
                        { icon: '✨', label: 'Fresh Weekly', desc: 'New sounds' },
                    ].map((feature, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30"
                        >
                            <span className="text-2xl">{feature.icon}</span>
                            <div>
                                <p className="text-sm font-medium text-white">{feature.label}</p>
                                <p className="text-xs text-zinc-500">{feature.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
