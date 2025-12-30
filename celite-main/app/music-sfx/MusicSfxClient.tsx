'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { useLoginModal } from '../../context/LoginModalContext';
import { Download, Search, Play, Volume2, Music, Filter, X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
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
  creator_shop_id?: string | null;
  feature?: boolean | null;
  is_featured?: boolean | null;
  isFeatured?: boolean | null;
  meta_title?: string | null;
  meta_description?: string | null;
  vendor_name?: string | null;
};

type Subcategory = {
  id: string;
  name: string;
  slug: string;
  category_id: string;
};

type SubSubcategory = {
  id: string;
  name: string;
  slug: string;
  subcategory_id: string;
};

// Gradient colors for variety
const gradients = [
  'from-blue-500 via-purple-500 to-pink-500',
  'from-emerald-500 via-teal-500 to-cyan-500',
  'from-orange-500 via-red-500 to-pink-500',
  'from-violet-500 via-purple-500 to-fuchsia-500',
  'from-cyan-500 via-blue-500 to-indigo-500',
  'from-pink-500 via-rose-500 to-red-500',
  'from-amber-500 via-orange-500 to-red-500',
  'from-teal-500 via-emerald-500 to-green-500',
];

const ITEMS_PER_PAGE = 20;

export default function MusicSfxClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const router = useRouter();
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>(initialTemplates);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const musicSfxCategoryId = '143d45f1-a55b-42be-9f51-aab507a20fac';

  // Audio playback state - single audio instance for the entire component
  const [playingSlug, setPlayingSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
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

  // Add protection against audio download
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'AUDIO' || target.closest('audio')) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Fetch subcategories and sub-subcategories
  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = getSupabaseBrowserClient();
      const [subcatsRes, subSubcatsRes] = await Promise.all([
        supabase
          .from('subcategories')
          .select('id,name,slug,category_id')
          .eq('category_id', musicSfxCategoryId)
          .order('name'),
        supabase
          .from('sub_subcategories')
          .select('id,name,slug,subcategory_id')
          .order('name'),
      ]);

      if (subcatsRes.data) {
        setSubcategories(subcatsRes.data);
      }
      if (subSubcatsRes.data) {
        setSubSubcategories(subSubcatsRes.data);
      }
    };
    fetchCategories();
  }, []);

  // Get available sub-subcategories for selected subcategory
  const availableSubSubcategories = subSubcategories.filter(
    (subSub) => selectedSubcategory === 'all' || subSub.subcategory_id === selectedSubcategory
  );

  // Get sub-subcategories grouped by subcategory
  const getSubSubcategoriesBySubcategory = (subcatId: string) => {
    return subSubcategories.filter((subSub) => subSub.subcategory_id === subcatId);
  };

  // Toggle category expansion
  const toggleCategory = (subcatId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subcatId)) {
        newSet.delete(subcatId);
      } else {
        newSet.add(subcatId);
      }
      return newSet;
    });
  };

  // Filter templates based on search, subcategory, and sub-subcategory
  useEffect(() => {
    let filtered = [...initialTemplates];

    // Filter by subcategory
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter((t) => t.subcategory_id === selectedSubcategory);
    }

    // Filter by sub-subcategory
    if (selectedSubSubcategory !== 'all') {
      filtered = filtered.filter((t) => t.sub_subcategory_id === selectedSubSubcategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((t) => {
        const nameMatch = t.name?.toLowerCase().includes(q);
        const subtitleMatch = t.subtitle?.toLowerCase().includes(q);
        const descriptionMatch = t.description?.toLowerCase().includes(q);
        const tagMatch = (Array.isArray(t.tags) ? t.tags : (typeof t.tags === 'string' ? JSON.parse(t.tags) : [])).some((tag: any) => tag?.toLowerCase().includes(q));
        const featureMatch = (Array.isArray(t.features) ? t.features : (typeof t.features === 'string' ? JSON.parse(t.features) : [])).some((feat: any) => feat?.toLowerCase().includes(q));

        return nameMatch || subtitleMatch || descriptionMatch || tagMatch || featureMatch;
      });
    }

    setFilteredTemplates(filtered);
  }, [searchQuery, initialTemplates, selectedSubcategory, selectedSubSubcategory]);

  // Reset sub-subcategory when subcategory changes
  useEffect(() => {
    setSelectedSubSubcategory('all');
  }, [selectedSubcategory]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSubcategory, selectedSubSubcategory, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex);

  // Play audio function
  const playAudio = (slug: string, audioUrl: string) => {
    // Always stop current audio first
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
        audio.play().catch(() => {
          stopAudio();
        });

        // Start progress tracking
        progressIntervalRef.current = setInterval(() => {
          if (audio.duration) {
            setProgress((audio.currentTime / audio.duration) * 100);
          }
        }, 50);
      }
    };

    audio.onended = () => {
      stopAudio();
    };

    audio.onerror = () => {
      if (audioRef.current === audio) {
        stopAudio();
      }
    };

    audio.src = audioUrl;
    audio.load();
  };

  // Handle hover to play
  const handleMouseEnter = (slug: string, audioUrl: string | null) => {
    if (!audioUrl) return;

    // Don't restart if already playing this track
    if (playingSlug === slug) return;

    playAudio(slug, audioUrl);
  };

  const handleMouseLeave = () => {
    stopAudio();
  };

  // Seek audio to position
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

  // Toggle play for mobile (tap)
  const handleTap = (slug: string, audioUrl: string | null, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!audioUrl) return;

    if (playingSlug === slug) {
      stopAudio();
    } else {
      playAudio(slug, audioUrl);
    }
  };

  const handleDownload = async (slug: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!user) {
      openLoginModal();
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        openLoginModal();
        return;
      }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('is_active, valid_until')
        .eq('user_id', user.id)
        .maybeSingle();

      const now = Date.now();
      const validUntil = sub?.valid_until ? new Date(sub.valid_until as any).getTime() : null;
      const isSubscribed = !!sub?.is_active && (!validUntil || validUntil > now);

      if (!isSubscribed) {
        router.push('/pricing');
        return;
      }

      const res = await fetch(`/api/download/${slug}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        try {
          const errorJson = await res.json();
          if (errorJson.error?.includes('Access denied') || errorJson.error?.includes('subscription')) {
            router.push('/pricing');
          } else {
            alert(errorJson.error || 'Download failed');
          }
        } catch {
          if (res.status === 403) {
            router.push('/pricing');
          } else if (res.status === 401) {
            openLoginModal();
          } else {
            alert('Download failed');
          }
        }
        return;
      }

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const json = await res.json();
        if (json.redirect && json.url) {
          window.location.href = json.url;
          return;
        }
        if (json.error) {
          if (json.error.includes('Access denied') || json.error.includes('subscription')) {
            router.push('/pricing');
          } else {
            alert(json.error || 'Download failed');
          }
          return;
        }
      } else {
        if (res.ok) {
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
      }
    } catch (e: any) {
      console.error('Download failed:', e);
      alert('Download failed: ' + (e.message || 'Unknown error'));
    }
  };

  // Get counts for filters
  const getSubcategoryCount = (subcatId: string) => {
    return initialTemplates.filter((t) => t.subcategory_id === subcatId).length;
  };

  const getSubSubcategoryCount = (subSubcatId: string) => {
    return initialTemplates.filter((t) => t.sub_subcategory_id === subSubcatId).length;
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedSubcategory('all');
    setSelectedSubSubcategory('all');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedSubcategory !== 'all' || selectedSubSubcategory !== 'all' || searchQuery.trim() !== '';

  return (
    <main className="bg-background min-h-screen pt-20 pb-20">
      {/* Header Section */}
      <div className="bg-background border-b border-zinc-200 pb-4 mb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-3">
          <div className="flex flex-col gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                <span>/</span>
                <span className="text-zinc-900">Music & SFX</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
                <span className="text-blue-600">Music & SFX</span> Library
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl">
                Hover over any track to preview. Download high-quality royalty-free audio for your projects.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                placeholder="Search music and sound effects..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-56 xl:w-64 flex-shrink-0">
            <div className="bg-white border border-zinc-200 rounded-lg lg:rounded-xl p-3 sm:p-4 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    title="Clear all filters"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Categories with Nested Sub-Categories */}
              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-medium text-zinc-700 mb-2">
                  Categories
                </label>
                <div className="flex flex-col gap-1">
                  {/* All Option */}
                  <button
                    onClick={() => {
                      setSelectedSubcategory('all');
                      setSelectedSubSubcategory('all');
                    }}
                    className={cn(
                      "w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all text-left",
                      selectedSubcategory === 'all'
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-zinc-50 border border-zinc-200 text-zinc-700 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span>All</span>
                    </span>
                  </button>

                  {/* Category with Nested Sub-Categories */}
                  {subcategories.map((subcat) => {
                    const count = getSubcategoryCount(subcat.id);
                    if (count === 0) return null;
                    const isExpanded = expandedCategories.has(subcat.id);
                    const isSelected = selectedSubcategory === subcat.id;
                    const subSubcats = getSubSubcategoriesBySubcategory(subcat.id);
                    const hasSubSubcats = subSubcats.length > 0;

                    return (
                      <div key={subcat.id} className="flex flex-col">
                        {/* Category Button */}
                        <button
                          onClick={() => {
                            if (hasSubSubcats) {
                              toggleCategory(subcat.id);
                            }
                            setSelectedSubcategory(subcat.id);
                            setSelectedSubSubcategory('all');
                          }}
                          className={cn(
                            "w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all text-left flex items-center justify-between",
                            isSelected
                              ? "bg-blue-600 text-white shadow-md"
                              : "bg-zinc-50 border border-zinc-200 text-zinc-700 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                          )}
                        >
                          <span className="flex items-center gap-1.5 sm:gap-2">
                            {hasSubSubcats && (
                              <ChevronDown
                                className={cn(
                                  "w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 flex-shrink-0",
                                  isExpanded ? "rotate-180" : ""
                                )}
                              />
                            )}
                            <span className="truncate">{subcat.name}</span>
                          </span>
                        </button>

                        {/* Nested Sub-Categories */}
                        {hasSubSubcats && isExpanded && (
                          <div className="ml-3 sm:ml-4 mt-1 flex flex-col gap-1 border-l-2 border-zinc-200 pl-2 sm:pl-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubcategory(subcat.id);
                                setSelectedSubSubcategory('all');
                              }}
                              className={cn(
                                "w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-all text-left",
                                isSelected && selectedSubSubcategory === 'all'
                                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                                  : "bg-zinc-50 border border-zinc-200 text-zinc-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                              )}
                            >
                              All {subcat.name}
                            </button>
                            {subSubcats.map((subSubcat) => {
                              const subCount = getSubSubcategoryCount(subSubcat.id);
                              if (subCount === 0) return null;
                              const isSubSelected = selectedSubcategory === subcat.id && selectedSubSubcategory === subSubcat.id;
                              return (
                                <button
                                  key={subSubcat.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSubcategory(subcat.id);
                                    setSelectedSubSubcategory(subSubcat.id);
                                  }}
                                  className={cn(
                                    "w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-all text-left flex items-center justify-between",
                                    isSubSelected
                                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                                      : "bg-zinc-50 border border-zinc-200 text-zinc-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                                  )}
                                >
                                  <span className="truncate">{subSubcat.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Collage Grid */}
            {filteredTemplates.length > 0 ? (
              <div>
                <div className="mb-4 sm:mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
                      Tracks
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Volume2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Hover to preview</span>
                  </div>
                </div>

                {/* Tile Layout */}
                <div className="space-y-3">
                  {paginatedTemplates.map((template, index) => {
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
                          {/* Play Button */}
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
                              /* Equalizer Animation */
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

                          {/* Track Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-zinc-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                              {template.name}
                            </h3>
                            {template.subtitle && (
                              <p className="text-sm text-zinc-500 line-clamp-1 mt-0.5">
                                {template.subtitle}
                              </p>
                            )}
                            {template.vendor_name && (
                              <p className="text-xs text-zinc-400 mt-1">
                                by {template.vendor_name}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Playing Indicator */}
                            {isPlaying && (
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                                Playing
                              </div>
                            )}

                            {/* Download Button */}
                            <button
                              onClick={(e) => handleDownload(template.slug, e)}
                              className="p-2 text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="Download"
                            >
                              <Download className="w-5 h-5" />
                            </button>

                            {/* View Details Link */}
                            <Link
                              href={`/product/${template.slug}`}
                              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View
                            </Link>
                          </div>
                        </div>

                        {/* Progress Bar - Shows when playing */}
                        {isPlaying && (
                          <div
                            className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-100 cursor-pointer"
                            onClick={(e) => handleSeek(e, template.slug)}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <div
                              className="h-full bg-blue-600 transition-all duration-75 pointer-events-none"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {filteredTemplates.length > ITEMS_PER_PAGE && (
                  <div className="flex justify-center items-center gap-6 mt-12">
                    <button
                      onClick={() => {
                        setCurrentPage(p => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-600 hover:text-white transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => {
                        setCurrentPage(p => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
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
                <h3 className="text-xl font-bold text-zinc-900 mb-2">No tracks found</h3>
                <p className="text-zinc-500 mb-6">We couldn't find any music or sound effects matching your search.</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes equalizerBar {
          0%, 100% {
            transform: scaleY(0.3);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </main>
  );
}
