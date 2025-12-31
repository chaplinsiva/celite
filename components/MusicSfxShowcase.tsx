'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { ArrowRight, Music, Volume2, Play } from 'lucide-react';
import { convertR2UrlToCdn } from '../lib/utils';

interface MusicSfxTemplate {
  slug: string;
  name: string;
  img?: string | null;
  thumbnail_path?: string | null;
  audio_preview_path?: string | null;
  subcategory_id?: string | null;
}

export default function MusicSfxShowcase() {
  const [musicTemplates, setMusicTemplates] = useState<MusicSfxTemplate[]>([]);
  const [sfxTemplates, setSfxTemplates] = useState<MusicSfxTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingSlug, setPlayingSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const audioRef = useState<HTMLAudioElement | null>(null)[0];

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        // Get Stock Musics category ID
        const { data: musicCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', 'stock-musics')
          .single();

        // Get Sound Effects category ID
        const { data: sfxCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', 'sound-effects')
          .single();

        // Fetch templates for both categories
        const queries = [];
        
        if (musicCategory?.id) {
          queries.push(
            supabase
              .from('templates')
              .select('slug, name, img, thumbnail_path, audio_preview_path, subcategory_id')
              .eq('status', 'approved')
              .eq('category_id', musicCategory.id)
              .order('created_at', { ascending: false })
              .limit(8)
          );
        } else {
          queries.push(Promise.resolve({ data: [], error: null }));
        }

        if (sfxCategory?.id) {
          queries.push(
            supabase
              .from('templates')
              .select('slug, name, img, thumbnail_path, audio_preview_path, subcategory_id')
              .eq('status', 'approved')
              .eq('category_id', sfxCategory.id)
              .order('created_at', { ascending: false })
              .limit(8)
          );
        } else {
          queries.push(Promise.resolve({ data: [], error: null }));
        }

        const [musicResult, sfxResult] = await Promise.all(queries);

        if (musicResult.data) {
          setMusicTemplates(musicResult.data as MusicSfxTemplate[]);
        }
        if (sfxResult.data) {
          setSfxTemplates(sfxResult.data as MusicSfxTemplate[]);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching music and SFX templates:', error);
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // Unsplash wallpapers for music and SFX
  const musicWallpapers = [
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80',
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80',
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
  ];

  const sfxWallpapers = [
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80',
    'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80',
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80',
    'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80',
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
  ];

  const getThumbnail = (template: MusicSfxTemplate, index: number, isMusic: boolean) => {
    if (isMusic) {
      return musicWallpapers[index % musicWallpapers.length];
    } else {
      return sfxWallpapers[index % sfxWallpapers.length];
    }
  };

  const getAudioUrl = (template: MusicSfxTemplate) => {
    if (template.audio_preview_path) {
      return convertR2UrlToCdn(template.audio_preview_path) || template.audio_preview_path;
    }
    return null;
  };

  const handlePlay = (e: React.MouseEvent, template: MusicSfxTemplate) => {
    e.preventDefault();
    e.stopPropagation();
    
    const audioUrl = getAudioUrl(template);
    if (!audioUrl) return;

    if (playingSlug === template.slug) {
      // Stop if already playing
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
      }
      setPlayingSlug(null);
      setIsLoading(null);
    } else {
      // Play new audio
      setIsLoading(template.slug);
      const audio = new Audio(audioUrl);
      audio.volume = 0.5;
      
      audio.oncanplaythrough = () => {
        setIsLoading(null);
        setPlayingSlug(template.slug);
        audio.play().catch(() => {
          setIsLoading(null);
          setPlayingSlug(null);
        });
      };

      audio.onended = () => {
        setPlayingSlug(null);
      };

      audio.onerror = () => {
        setIsLoading(null);
        setPlayingSlug(null);
      };

      // Store reference
      (audioRef as any).current = audio;
    }
  };

  if (loading) {
    return (
      <section className="relative w-full py-12 px-4 sm:px-6 bg-zinc-50">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="h-8 bg-zinc-200 rounded animate-pulse w-1/3"></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="aspect-square bg-zinc-200 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (musicTemplates.length === 0 && sfxTemplates.length === 0) {
    return null;
  }

  return (
    <section className="relative w-full py-12 px-4 sm:px-6 bg-zinc-50">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 mb-2">Music & Sound Effects</h2>
            <p className="text-zinc-600 text-sm sm:text-base">Discover premium music tracks and sound effects</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/stock-musics"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all text-sm"
            >
              View Music
            </Link>
            <Link
              href="/sound-effects"
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-all text-sm"
            >
              View SFX
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Music Section */}
          {musicTemplates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Music className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-bold text-zinc-900">Stock Music</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
                {musicTemplates.map((template, index) => {
                  const audioUrl = getAudioUrl(template);
                  const isPlaying = playingSlug === template.slug;
                  const isLoadingAudio = isLoading === template.slug;

                  return (
                    <Link
                      key={template.slug}
                      href={`/product/${template.slug}`}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-200 shadow-md hover:shadow-xl transition-all"
                    >
                      <img
                        src={getThumbnail(template, index, true)}
                        alt={template.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {/* Music Icon Overlay */}
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full p-2.5 group-hover:bg-black/80 transition-colors">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-bold line-clamp-2 mb-2">{template.name}</p>
                          {audioUrl && (
                            <button
                              onClick={(e) => handlePlay(e, template)}
                              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                              aria-label={isPlaying ? 'Stop preview' : 'Play preview'}
                            >
                              {isLoadingAudio ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : isPlaying ? (
                                <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent" />
                              ) : (
                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sound Effects Section */}
          {sfxTemplates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Volume2 className="w-5 h-5 text-purple-600" />
                <h3 className="text-xl font-bold text-zinc-900">Sound Effects</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
                {sfxTemplates.map((template, index) => {
                  const audioUrl = getAudioUrl(template);
                  const isPlaying = playingSlug === template.slug;
                  const isLoadingAudio = isLoading === template.slug;

                  return (
                    <Link
                      key={template.slug}
                      href={`/product/${template.slug}`}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-200 shadow-md hover:shadow-xl transition-all"
                    >
                      <img
                        src={getThumbnail(template, index, false)}
                        alt={template.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {/* SFX Icon Overlay */}
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full p-2.5 group-hover:bg-black/80 transition-colors">
                        <Volume2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-bold line-clamp-2 mb-2">{template.name}</p>
                          {audioUrl && (
                            <button
                              onClick={(e) => handlePlay(e, template)}
                              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                              aria-label={isPlaying ? 'Stop preview' : 'Play preview'}
                            >
                              {isLoadingAudio ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : isPlaying ? (
                                <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent" />
                              ) : (
                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

