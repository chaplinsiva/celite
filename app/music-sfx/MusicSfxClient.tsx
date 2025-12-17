'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { useLoginModal } from '../../context/LoginModalContext';
import { Download, Search, Play, Volume2, Music } from 'lucide-react';
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
  creator_shop_id?: string | null;
  feature?: boolean | null;
  is_featured?: boolean | null;
  isFeatured?: boolean | null;
  meta_title?: string | null;
  meta_description?: string | null;
  vendor_name?: string | null;
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

export default function MusicSfxClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const router = useRouter();
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>(initialTemplates);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name: string; slug: string; category_id: string }>>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const musicSfxCategoryId = '45456b94-cb11-449b-ab99-f0633d6e8848';

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

  // Fetch subcategories
  useEffect(() => {
    const fetchSubcategories = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('subcategories')
        .select('id,name,slug,category_id')
        .eq('category_id', musicSfxCategoryId)
        .order('name');
      setSubcategories(data || []);
    };
    fetchSubcategories();
  }, []);

  // Filter templates based on search and subcategory
  useEffect(() => {
    let filtered = [...initialTemplates];

    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(t => t.subcategory_id === selectedSubcategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => {
        const nameMatch = t.name?.toLowerCase().includes(q);
        const subtitleMatch = t.subtitle?.toLowerCase().includes(q);
        const descriptionMatch = t.description?.toLowerCase().includes(q);
        const tagMatch = t.tags?.some(tag => tag?.toLowerCase().includes(q));
        const featureMatch = t.features?.some(feat => feat?.toLowerCase().includes(q));

        return nameMatch || subtitleMatch || descriptionMatch || tagMatch || featureMatch;
      });
    }

    setFilteredTemplates(filtered);
  }, [searchQuery, initialTemplates, selectedSubcategory]);

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

  return (
    <main className="bg-zinc-50 min-h-screen pt-20 pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-zinc-200 pb-6 sm:pb-8 mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          <div className="flex flex-col gap-4 mb-6 sm:mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 mb-2">
                <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                <span>/</span>
                <span className="text-zinc-900">Music & SFX</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900">
                <span className="text-blue-600">Music & SFX</span> Library
              </h1>
              <p className="text-sm sm:text-base text-zinc-500 mt-2 max-w-2xl">
                Hover over any track to preview. Download high-quality royalty-free audio for your projects.
              </p>
            </div>
          </div>

          {/* Search Bar and Subcategory Filter */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-2xl">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 sm:pl-11 pr-4 py-3 sm:py-4 bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl text-sm sm:text-base text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                placeholder="Search music and sound effects..."
              />
            </div>
            {subcategories.length > 0 && (
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="px-3 sm:px-4 py-3 sm:py-4 bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-medium cursor-pointer"
              >
                <option value="all">All Categories</option>
                {subcategories.map(subcat => {
                  const count = initialTemplates.filter(t => t.subcategory_id === subcat.id).length;
                  return (
                    <option key={subcat.id} value={subcat.id}>
                      {subcat.name} ({count})
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Collage Grid */}
        {filteredTemplates.length > 0 ? (
          <div>
            <div className="mb-4 sm:mb-6 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
                {filteredTemplates.length} {filteredTemplates.length === 1 ? 'Track' : 'Tracks'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Volume2 className="w-4 h-4" />
                <span className="hidden sm:inline">Hover to preview</span>
              </div>
            </div>

            {/* Collage Grid Layout */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredTemplates.map((template, index) => {
                const rawAudioUrl = template.audio_preview_path || template.video_path;
                const audioUrl = rawAudioUrl ? convertR2UrlToCdn(rawAudioUrl) || rawAudioUrl : null;
                const gradient = gradients[index % gradients.length];
                const isPlaying = playingSlug === template.slug;
                const isLoadingThis = isLoading === template.slug;

                return (
                  <div
                    key={template.slug}
                    className={cn(
                      "group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-300",
                      isPlaying && "ring-4 ring-blue-500 ring-offset-2 scale-[1.02] shadow-xl shadow-blue-500/25",
                      !isPlaying && "hover:scale-[1.02] hover:shadow-lg"
                    )}
                    onMouseEnter={() => handleMouseEnter(template.slug, audioUrl)}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => handleTap(template.slug, audioUrl, e)}
                  >
                    {/* Gradient Background */}
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br transition-opacity duration-300",
                      gradient,
                      isPlaying ? "opacity-100" : "opacity-90 group-hover:opacity-100"
                    )} />

                    {/* Pattern Overlay */}
                    <div className="absolute inset-0 opacity-10">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                          <pattern id={`pattern-${template.slug}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="10" cy="10" r="1.5" fill="white" />
                          </pattern>
                        </defs>
                        <rect width="100" height="100" fill={`url(#pattern-${template.slug})`} />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white">
                      {/* Play/Pause Icon */}
                      <div className={cn(
                        "w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 transition-all duration-300",
                        isPlaying && "bg-white/30 scale-110",
                        isLoadingThis && "animate-pulse"
                      )}>
                        {isLoadingThis ? (
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : isPlaying ? (
                          /* Equalizer Animation */
                          <div className="flex items-end gap-1 h-6">
                            <div className="w-1 bg-white rounded-full animate-[equalizerBar_0.4s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '0ms' }} />
                            <div className="w-1 bg-white rounded-full animate-[equalizerBar_0.4s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '100ms' }} />
                            <div className="w-1 bg-white rounded-full animate-[equalizerBar_0.4s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '200ms' }} />
                            <div className="w-1 bg-white rounded-full animate-[equalizerBar_0.4s_ease-in-out_infinite]" style={{ height: '80%', animationDelay: '300ms' }} />
                            <div className="w-1 bg-white rounded-full animate-[equalizerBar_0.4s_ease-in-out_infinite]" style={{ height: '50%', animationDelay: '400ms' }} />
                          </div>
                        ) : (
                          <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-1" fill="white" />
                        )}
                      </div>

                      {/* Track Name */}
                      <h3 className="text-sm sm:text-base font-bold text-center line-clamp-2 drop-shadow-lg px-2">
                        {template.name}
                      </h3>

                      {template.vendor_name && (
                        <p className="text-xs text-white/80 mt-1 truncate max-w-full px-2">
                          {template.vendor_name}
                        </p>
                      )}
                    </div>

                    {/* Download Button - Shows on Hover */}
                    <button
                      onClick={(e) => handleDownload(template.slug, e)}
                      className={cn(
                        "absolute bottom-3 right-3 p-2.5 bg-white/20 backdrop-blur-sm rounded-full text-white transition-all duration-300",
                        "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
                        "hover:bg-white hover:text-zinc-900",
                        isPlaying && "bottom-5"
                      )}
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* View Details Link */}
                    <Link
                      href={`/product/${template.slug}`}
                      className={cn(
                        "absolute bottom-3 left-3 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium transition-all duration-300",
                        "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
                        "hover:bg-white hover:text-zinc-900",
                        isPlaying && "bottom-5"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Details
                    </Link>

                    {/* Playing Indicator */}
                    {isPlaying && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-xs font-medium">Playing</span>
                      </div>
                    )}

                    {/* Progress Bar - Slim timeline at bottom (clickable to seek) */}
                    <div
                      className={cn(
                        "absolute bottom-0 left-0 right-0 h-2 bg-black/20 cursor-pointer transition-all",
                        isPlaying && "hover:h-3"
                      )}
                      onClick={(e) => handleSeek(e, template.slug)}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div
                        className={cn(
                          "h-full bg-white transition-all duration-75 pointer-events-none",
                          isPlaying ? "opacity-100" : "opacity-0"
                        )}
                        style={{ width: isPlaying ? `${progress}%` : '0%' }}
                      />
                      {/* Seek handle */}
                      {isPlaying && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                          style={{ left: `calc(${progress}% - 6px)` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 border-dashed">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">No tracks found</h3>
            <p className="text-zinc-500 mb-6">We couldn't find any music or sound effects matching your search.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* Inline CSS for equalizer animation */}
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
