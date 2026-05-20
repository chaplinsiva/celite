'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { useLoginModal } from '../../context/LoginModalContext';
import { Download, Search, Play, Volume2, Music, X, ChevronLeft, ChevronRight, ChevronDown, Filter } from 'lucide-react';
import Link from 'next/link';
import { cn, convertR2UrlToCdn } from '../../lib/utils';

type Template = {
    slug: string;
    name: string;
    subtitle: string | null;
    description: string | null;
    img: string | null;
    video: string | null;
    video_path?: string | null;
    thumbnail_path?: string | null;
    audio_preview_path?: string | null;
    features: string[];
    software: string[];
    plugins: string[];
    tags: string[];
    created_at?: string | null;
    category_id?: string | null;
    subcategory_id?: string | null;
    sub_subcategory_id?: string | null;
    vendor_name?: string | null;
};

// Filter options
const FILTER_OPTIONS = {
    genre: [
        'Ambient', 'Cinematic', 'Corporate', 'Electronic', 'Hip Hop', 'Jazz',
        'Pop', 'Rock', 'Classical', 'Folk', 'Country', 'R&B', 'Indie',
        'World', 'Lo-Fi', 'Trap', 'EDM', 'Acoustic', 'Orchestral'
    ],
    mood: [
        'Happy', 'Sad', 'Energetic', 'Calm', 'Inspiring', 'Dramatic',
        'Romantic', 'Dark', 'Uplifting', 'Mysterious', 'Peaceful', 'Epic',
        'Melancholic', 'Cheerful', 'Intense', 'Relaxing', 'Hopeful', 'Nostalgic'
    ],
    tempo: [
        'Slow', 'Medium', 'Fast', 'Very Slow', 'Very Fast'
    ],
    useCase: [
        'YouTube', 'Podcast', 'Commercial', 'Film', 'Documentary', 'Vlog',
        'Gaming', 'Presentation', 'Wedding', 'Travel', 'Sports', 'News',
        'Tutorial', 'Meditation', 'Workout', 'Advertisement', 'Social Media'
    ],
    instruments: [
        'Piano', 'Guitar', 'Drums', 'Violin', 'Synth', 'Bass',
        'Saxophone', 'Flute', 'Trumpet', 'Cello', 'Ukulele', 'Harp',
        'Strings', 'Brass', 'Percussion', 'Organ', 'Bells'
    ],
    vocalType: [
        'Male Vocal', 'Female Vocal', 'Choir', 'Instrumental', 'Vocal Chops',
        'Humming', 'No Vocals', 'Background Vocals'
    ]
};

const ITEMS_PER_PAGE = 20;

export default function StockMusicsClient({ initialTemplates }: { initialTemplates: Template[] }) {
    const router = useRouter();
    const { user } = useAppContext();
    const { openLoginModal } = useLoginModal();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Expanded filter sections
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['genre', 'mood']));

    // Checkbox states for each filter category
    const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
    const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set());
    const [selectedTempos, setSelectedTempos] = useState<Set<string>>(new Set());
    const [selectedUseCases, setSelectedUseCases] = useState<Set<string>>(new Set());
    const [selectedInstruments, setSelectedInstruments] = useState<Set<string>>(new Set());
    const [selectedVocalTypes, setSelectedVocalTypes] = useState<Set<string>>(new Set());

    // Audio playback state
    const [playingSlug, setPlayingSlug] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Toggle section expansion
    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(section)) newSet.delete(section);
            else newSet.add(section);
            return newSet;
        });
    };

    // Toggle checkbox functions
    const toggleGenre = (genre: string) => {
        setSelectedGenres(prev => {
            const newSet = new Set(prev);
            if (newSet.has(genre)) newSet.delete(genre);
            else newSet.add(genre);
            return newSet;
        });
    };

    const toggleMood = (mood: string) => {
        setSelectedMoods(prev => {
            const newSet = new Set(prev);
            if (newSet.has(mood)) newSet.delete(mood);
            else newSet.add(mood);
            return newSet;
        });
    };

    const toggleTempo = (tempo: string) => {
        setSelectedTempos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tempo)) newSet.delete(tempo);
            else newSet.add(tempo);
            return newSet;
        });
    };

    const toggleUseCase = (useCase: string) => {
        setSelectedUseCases(prev => {
            const newSet = new Set(prev);
            if (newSet.has(useCase)) newSet.delete(useCase);
            else newSet.add(useCase);
            return newSet;
        });
    };

    const toggleInstrument = (instrument: string) => {
        setSelectedInstruments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(instrument)) newSet.delete(instrument);
            else newSet.add(instrument);
            return newSet;
        });
    };

    const toggleVocalType = (vocalType: string) => {
        setSelectedVocalTypes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(vocalType)) newSet.delete(vocalType);
            else newSet.add(vocalType);
            return newSet;
        });
    };

    // Clear all filters
    const clearAllFilters = () => {
        setSelectedGenres(new Set());
        setSelectedMoods(new Set());
        setSelectedTempos(new Set());
        setSelectedUseCases(new Set());
        setSelectedInstruments(new Set());
        setSelectedVocalTypes(new Set());
        setSearchQuery('');
    };

    const hasActiveFilters = selectedGenres.size > 0 || selectedMoods.size > 0 ||
        selectedTempos.size > 0 || selectedUseCases.size > 0 ||
        selectedInstruments.size > 0 || selectedVocalTypes.size > 0 || searchQuery.trim() !== '';

    const activeFilterCount = selectedGenres.size + selectedMoods.size + selectedTempos.size +
        selectedUseCases.size + selectedInstruments.size + selectedVocalTypes.size;

    // Filter templates based on selected checkboxes
    const filteredTemplates = useMemo(() => {
        return initialTemplates.filter(template => {
            const name = template.name?.toLowerCase() || '';
            const subtitle = template.subtitle?.toLowerCase() || '';
            const description = template.description?.toLowerCase() || '';
            const tags = Array.isArray(template.tags)
                ? template.tags.map(t => t?.toLowerCase() || '')
                : (typeof template.tags === 'string' ? JSON.parse(template.tags || '[]').map((t: string) => t?.toLowerCase() || '') : []);
            const features = Array.isArray(template.features)
                ? template.features.map(f => f?.toLowerCase() || '')
                : (typeof template.features === 'string' ? JSON.parse(template.features || '[]').map((f: string) => f?.toLowerCase() || '') : []);

            const allContent = [name, subtitle, description, ...tags, ...features].join(' ');

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                if (!allContent.includes(q)) return false;
            }

            const matchesSelection = (selectedItems: Set<string>): boolean => {
                if (selectedItems.size === 0) return true;
                for (const item of selectedItems) {
                    if (allContent.includes(item.toLowerCase())) return true;
                }
                return false;
            };

            if (!matchesSelection(selectedGenres)) return false;
            if (!matchesSelection(selectedMoods)) return false;
            if (!matchesSelection(selectedTempos)) return false;
            if (!matchesSelection(selectedUseCases)) return false;
            if (!matchesSelection(selectedInstruments)) return false;
            if (!matchesSelection(selectedVocalTypes)) return false;

            return true;
        });
    }, [initialTemplates, selectedGenres, selectedMoods, selectedTempos, selectedUseCases, selectedInstruments, selectedVocalTypes, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedGenres, selectedMoods, selectedTempos, selectedUseCases, selectedInstruments, selectedVocalTypes, searchQuery]);

    const totalPages = Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex);

    // Audio functions
    const stopAudio = () => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        setPlayingSlug(null);
        setIsLoading(null);
        setProgress(0);
    };

    useEffect(() => {
        return () => stopAudio();
    }, []);

    const playAudio = (slug: string, audioUrl: string) => {
        stopAudio();
        setIsLoading(slug);

        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = 0.5;
        audioRef.current = audio;

        audio.oncanplaythrough = () => {
            if (audioRef.current === audio) {
                setIsLoading(null);
                setPlayingSlug(slug);
                audio.play().catch(() => stopAudio());
                progressIntervalRef.current = setInterval(() => {
                    if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
                }, 50);
            }
        };

        audio.onended = () => stopAudio();
        audio.onerror = () => { if (audioRef.current === audio) stopAudio(); };
        audio.src = audioUrl;
        audio.load();
    };

    const handleMouseEnter = (slug: string, audioUrl: string | null) => {
        if (!audioUrl || playingSlug === slug) return;
        playAudio(slug, audioUrl);
    };

    const handleMouseLeave = () => stopAudio();

    const handleTap = (slug: string, audioUrl: string | null, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!audioUrl) return;
        if (playingSlug === slug) stopAudio();
        else playAudio(slug, audioUrl);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>, slug: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!audioRef.current || playingSlug !== slug) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = audioRef.current.duration * percentage;
        if (!isNaN(newTime)) {
            audioRef.current.currentTime = newTime;
            setProgress(percentage * 100);
        }
    };

    const handleDownload = async (slug: string, e?: React.MouseEvent) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!user) { openLoginModal(); return; }

        try {
            const supabase = getSupabaseBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { openLoginModal(); return; }

            const { data: sub } = await supabase
                .from('subscriptions')
                .select('is_active, valid_until')
                .eq('user_id', user.id)
                .maybeSingle();

            const now = Date.now();
            const validUntil = sub?.valid_until ? new Date(sub.valid_until as any).getTime() : null;
            const isSubscribed = !!sub?.is_active && (!validUntil || validUntil > now);

            if (!isSubscribed) { router.push('/pricing'); return; }

            const res = await fetch(`/api/download/${slug}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (!res.ok) {
                try {
                    const errorJson = await res.json();
                    if (errorJson.error?.includes('Access denied') || errorJson.error?.includes('subscription')) {
                        router.push('/pricing');
                    } else { alert(errorJson.error || 'Download failed'); }
                } catch {
                    if (res.status === 403) router.push('/pricing');
                    else if (res.status === 401) openLoginModal();
                    else alert('Download failed');
                }
                return;
            }

            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const json = await res.json();
                if (json.redirect && json.url) { window.location.href = json.url; return; }
                if (json.error) {
                    if (json.error.includes('Access denied') || json.error.includes('subscription')) {
                        router.push('/pricing');
                    } else { alert(json.error || 'Download failed'); }
                    return;
                }
            } else if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${slug}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (e: any) {
            console.error('Download failed:', e);
            alert('Download failed: ' + (e.message || 'Unknown error'));
        }
    };

    // Checkbox filter section component
    const FilterSection = ({
        id,
        title,
        options,
        selected,
        onToggle
    }: {
        id: string;
        title: string;
        options: string[];
        selected: Set<string>;
        onToggle: (item: string) => void;
    }) => {
        const isExpanded = expandedSections.has(id);
        const selectedCount = selected.size;

        return (
            <div className="border-b border-zinc-100 last:border-b-0">
                <button
                    onClick={() => toggleSection(id)}
                    className="w-full flex items-center justify-between py-3 text-left hover:bg-zinc-50 transition-colors"
                >
                    <span className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                        {title}
                        {selectedCount > 0 && (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                {selectedCount}
                            </span>
                        )}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", isExpanded && "rotate-180")} />
                </button>
                {isExpanded && (
                    <div className="pb-3 space-y-1 max-h-48 overflow-y-auto">
                        {options.map(option => (
                            <label
                                key={option}
                                className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-zinc-50 cursor-pointer group"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.has(option)}
                                    onChange={() => onToggle(option)}
                                    className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                                />
                                <span className={cn(
                                    "text-sm transition-colors",
                                    selected.has(option) ? "text-blue-700 font-medium" : "text-zinc-600 group-hover:text-zinc-900"
                                )}>
                                    {option}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <main className="bg-background min-h-screen pt-20 pb-20">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center gap-2 text-xs text-white/70 mb-2">
                        <Link href="/" className="hover:text-white transition-colors">Home</Link>
                        <span>/</span>
                        <span className="text-white">Stock Music</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                        Stock Music Library
                    </h1>
                    <p className="text-sm text-white/80 max-w-2xl">
                        Find the perfect track for your project. Use the filters to discover royalty-free music that matches your needs.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative max-w-2xl group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                            placeholder="Search by name, keywords, or mood..."
                        />
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Filters */}
                    <aside className="w-full lg:w-64 flex-shrink-0">
                        <div className="bg-white border border-zinc-200 rounded-xl p-4 lg:sticky lg:top-24">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    Filters
                                    {activeFilterCount > 0 && (
                                        <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </h2>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearAllFilters}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                    >
                                        <X className="w-3 h-3" />
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="divide-y divide-zinc-100">
                                <FilterSection
                                    id="genre"
                                    title="Genre"
                                    options={FILTER_OPTIONS.genre}
                                    selected={selectedGenres}
                                    onToggle={toggleGenre}
                                />
                                <FilterSection
                                    id="mood"
                                    title="Mood"
                                    options={FILTER_OPTIONS.mood}
                                    selected={selectedMoods}
                                    onToggle={toggleMood}
                                />
                                <FilterSection
                                    id="useCase"
                                    title="Use Case"
                                    options={FILTER_OPTIONS.useCase}
                                    selected={selectedUseCases}
                                    onToggle={toggleUseCase}
                                />
                                <FilterSection
                                    id="tempo"
                                    title="Tempo"
                                    options={FILTER_OPTIONS.tempo}
                                    selected={selectedTempos}
                                    onToggle={toggleTempo}
                                />
                                <FilterSection
                                    id="instruments"
                                    title="Instruments"
                                    options={FILTER_OPTIONS.instruments}
                                    selected={selectedInstruments}
                                    onToggle={toggleInstrument}
                                />
                                <FilterSection
                                    id="vocalType"
                                    title="Vocal Type"
                                    options={FILTER_OPTIONS.vocalType}
                                    selected={selectedVocalTypes}
                                    onToggle={toggleVocalType}
                                />
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        {/* Results Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-zinc-900">Tracks</h2>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-zinc-500">
                                <Volume2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Hover to preview</span>
                            </div>
                        </div>

                        {/* Results */}
                        {filteredTemplates.length > 0 ? (
                            <div>
                                <div className="space-y-3">
                                    {paginatedTemplates.map((template) => {
                                        const rawAudioUrl = template.audio_preview_path || template.video_path;
                                        const audioUrl = rawAudioUrl ? convertR2UrlToCdn(rawAudioUrl) || rawAudioUrl : null;
                                        const isPlaying = playingSlug === template.slug;
                                        const isLoadingThis = isLoading === template.slug;

                                        return (
                                            <div
                                                key={template.slug}
                                                className={cn(
                                                    "group relative bg-white rounded-xl border border-zinc-200 overflow-hidden transition-all duration-300",
                                                    isPlaying && "ring-2 ring-blue-500 shadow-lg shadow-blue-500/20",
                                                    !isPlaying && "hover:shadow-md hover:border-zinc-300"
                                                )}
                                                onMouseEnter={() => handleMouseEnter(template.slug, audioUrl)}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                <div className="flex items-center gap-4 p-4">
                                                    <button
                                                        onClick={(e) => handleTap(template.slug, audioUrl, e)}
                                                        className={cn(
                                                            "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                                                            isPlaying
                                                                ? "bg-blue-600 text-white shadow-lg scale-105"
                                                                : "bg-zinc-100 text-zinc-700 hover:bg-blue-600 hover:text-white hover:scale-105",
                                                            isLoadingThis && "animate-pulse"
                                                        )}
                                                    >
                                                        {isLoadingThis ? (
                                                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        ) : isPlaying ? (
                                                            <div className="flex items-end gap-0.5 h-5">
                                                                <div className="w-0.5 bg-current rounded-full animate-[equalizerBar_0.4s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '0ms' }} />
                                                                <div className="w-0.5 bg-current rounded-full animate-[equalizerBar_0.4s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '100ms' }} />
                                                                <div className="w-0.5 bg-current rounded-full animate-[equalizerBar_0.4s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '200ms' }} />
                                                                <div className="w-0.5 bg-current rounded-full animate-[equalizerBar_0.4s_ease-in-out_infinite]" style={{ height: '80%', animationDelay: '300ms' }} />
                                                                <div className="w-0.5 bg-current rounded-full animate-[equalizerBar_0.4s_ease-in-out_infinite]" style={{ height: '50%', animationDelay: '400ms' }} />
                                                            </div>
                                                        ) : (
                                                            <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                                                        )}
                                                    </button>

                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-base font-semibold text-zinc-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                            {template.name}
                                                        </h3>
                                                        {template.subtitle && (
                                                            <p className="text-sm text-zinc-500 line-clamp-1 mt-0.5">{template.subtitle}</p>
                                                        )}
                                                        {template.vendor_name && (
                                                            <p className="text-xs text-zinc-400 mt-1">by {template.vendor_name}</p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {isPlaying && (
                                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                                                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                                                                Playing
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={(e) => handleDownload(template.slug, e)}
                                                            className="p-2 text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Download"
                                                        >
                                                            <Download className="w-5 h-5" />
                                                        </button>
                                                        <Link
                                                            href={`/product/${template.slug}`}
                                                            className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            View
                                                        </Link>
                                                    </div>
                                                </div>

                                                {isPlaying && (
                                                    <div
                                                        className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-100 cursor-pointer"
                                                        onClick={(e) => handleSeek(e, template.slug)}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="h-full bg-blue-600 transition-all duration-75 pointer-events-none" style={{ width: `${progress}%` }} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {filteredTemplates.length > ITEMS_PER_PAGE && (
                                    <div className="flex justify-center items-center gap-6 mt-12">
                                        <button
                                            onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                            disabled={currentPage === 1}
                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-600 hover:text-white transition-all"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                            disabled={currentPage === totalPages}
                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-600 hover:text-white transition-all"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 border-dashed">
                                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Music className="w-8 h-8 text-zinc-400" />
                                </div>
                                <h3 className="text-xl font-bold text-zinc-900 mb-2">No matching music found</h3>
                                <p className="text-zinc-500 mb-6">Try different selections or clear your filters.</p>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearAllFilters}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Clear All Filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
        @keyframes equalizerBar {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}</style>
        </main>
    );
}
