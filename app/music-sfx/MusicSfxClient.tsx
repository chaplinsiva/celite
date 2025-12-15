'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { useLoginModal } from '../../context/LoginModalContext';
import { Download, Search, ChevronDown, ChevronUp } from 'lucide-react';
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

export default function MusicSfxClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const router = useRouter();
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>(initialTemplates);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name: string; slug: string; category_id: string }>>([]);
  const [availableSubcategories, setAvailableSubcategories] = useState<Array<{ id: string; name: string; slug: string; category_id: string }>>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const musicSfxCategoryId = '45456b94-cb11-449b-ab99-f0633d6e8848';
  
  // Add protection against audio download
  useEffect(() => {
    // Prevent right-click on audio elements
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'AUDIO' || target.closest('audio')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Prevent drag and drop
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'AUDIO' || target.closest('audio')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Prevent keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'AUDIO' || target.closest('audio')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    // Prevent copy
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'AUDIO' || target.closest('audio')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('copy', handleCopy, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('copy', handleCopy, true);
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

  // Show all subcategories for the category (even if they have no templates)
  useEffect(() => {
    if (subcategories.length === 0) {
      setAvailableSubcategories([]);
      return;
    }

    // Show all subcategories that belong to Music & SFX category
    setAvailableSubcategories(subcategories);
  }, [subcategories]);

  // Filter templates based on search and subcategory
  useEffect(() => {
    let filtered = [...initialTemplates];

    // Filter by subcategory
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(t => t.subcategory_id === selectedSubcategory);
    }

    // Filter by search
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

  const handleDownload = async (slug: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!user) {
      openLoginModal();
      return;
    }

    // Check subscription first
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        openLoginModal();
        return;
      }

      // Check subscription status
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

      // Direct download for Music & SFX
      const res = await fetch(`/api/download/${slug}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      // Check response status first
      if (!res.ok) {
        // Handle error responses
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

      // Check content type before parsing
      const contentType = res.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const json = await res.json();
        
        // Handle redirect URL (for CDN or external URLs)
        if (json.redirect && json.url) {
          // Open the download URL directly - this will trigger the browser download
          window.location.href = json.url;
          return;
        }
        
        // Handle errors in JSON response
        if (json.error) {
          if (json.error.includes('Access denied') || json.error.includes('subscription')) {
            router.push('/pricing');
          } else {
            alert(json.error || 'Download failed');
          }
          return;
        }
      } else {
        // It's a file download (blob)
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
        } else {
          // Try to parse error as JSON
          try {
            const errorText = await res.text();
            const errorJson = JSON.parse(errorText);
            if (errorJson.error?.includes('Access denied') || errorJson.error?.includes('subscription')) {
              router.push('/pricing');
            } else {
              alert(errorJson.error || 'Download failed');
            }
          } catch {
            if (res.status === 403) {
              router.push('/pricing');
            } else {
              alert('Download failed');
            }
          }
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
                Browse our collection of royalty-free music and sound effects for your projects.
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
        {/* Music & SFX Library View */}
        {filteredTemplates.length > 0 ? (
          <div>
            <div className="mb-4 sm:mb-6 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
                {filteredTemplates.length} {filteredTemplates.length === 1 ? 'Track' : 'Tracks'}
              </h2>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="divide-y divide-zinc-100">
                {filteredTemplates.map((template, index) => {
                  const rawAudioUrl = template.audio_preview_path || template.video_path;
                  const audioUrl = rawAudioUrl ? convertR2UrlToCdn(rawAudioUrl) || rawAudioUrl : null;
                  return (
                    <Link key={template.slug} href={`/product/${template.slug}`} className="group hover:bg-zinc-50 transition-colors block">
                      {/* Desktop Layout */}
                      <div className="hidden md:flex items-center gap-4 p-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-zinc-900 truncate">{template.name}</h3>
                          <p className="text-sm text-zinc-500 truncate">{template.subtitle || template.vendor_name || ''}</p>
                        </div>
                        {audioUrl && (
                          <div 
                            className="flex-shrink-0 w-64 select-none"
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              return false;
                            }}
                            onDragStart={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              return false;
                            }}
                            style={{ 
                              userSelect: 'none', 
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              msUserSelect: 'none',
                              pointerEvents: 'auto'
                            }}
                          >
                            <audio 
                              src={audioUrl} 
                              controls 
                              controlsList="nodownload noplaybackrate nofullscreen"
                              className="w-full h-10"
                              onLoadedMetadata={(e) => {
                                const audio = e.target as HTMLAudioElement;
                                const duration = audio.duration;
                                const minutes = Math.floor(duration / 60);
                                const seconds = Math.floor(duration % 60);
                                const timeDisplay = audio.parentElement?.querySelector('.audio-duration');
                                if (timeDisplay) {
                                  timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                              }}
                              onDragStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                              }}
                              onCopy={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                              }}
                            />
                            <div className="audio-duration text-xs text-zinc-400 mt-1 text-center"></div>
                          </div>
                        )}
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedTemplates((prev: Set<string>) => {
                                const newSet = new Set(prev);
                                if (newSet.has(template.slug)) {
                                  newSet.delete(template.slug);
                                } else {
                                  newSet.add(template.slug);
                                }
                                return newSet;
                              });
                            }}
                            className="p-2 text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={expandedTemplates.has(template.slug) ? "Hide details" : "Show details"}
                          >
                            {expandedTemplates.has(template.slug) ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDownload(template.slug, e);
                            }}
                            className="p-2 text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download"
                            type="button"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Mobile Layout */}
                      <div className="md:hidden p-3 sm:p-4 space-y-3">
                        {/* Top Row: Number, Title, Play Button */}
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs mt-0.5">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className="font-semibold text-zinc-900 text-base leading-tight mb-1 line-clamp-2">{template.name}</h3>
                            {template.subtitle && (
                              <p className="text-xs text-zinc-500 line-clamp-1">{template.subtitle}</p>
                            )}
                            {template.vendor_name && !template.subtitle && (
                              <p className="text-xs text-zinc-500 line-clamp-1">By {template.vendor_name}</p>
                            )}
                          </div>
                          {audioUrl && (
                            <div 
                              className="flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                              }}
                              onDragStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                              }}
                              style={{ 
                                userSelect: 'none', 
                                WebkitUserSelect: 'none',
                                MozUserSelect: 'none',
                                msUserSelect: 'none',
                                pointerEvents: 'auto'
                              }}
                            >
                              <audio 
                                src={audioUrl} 
                                controls 
                                controlsList="nodownload noplaybackrate nofullscreen"
                                className="h-10 w-32 sm:w-40"
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  return false;
                                }}
                                onDragStart={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  return false;
                                }}
                                onCopy={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  return false;
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Bottom Row: Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedTemplates((prev: Set<string>) => {
                                const newSet = new Set(prev);
                                if (newSet.has(template.slug)) {
                                  newSet.delete(template.slug);
                                } else {
                                  newSet.add(template.slug);
                                }
                                return newSet;
                              });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                            title={expandedTemplates.has(template.slug) ? "Hide details" : "Show details"}
                          >
                            {expandedTemplates.has(template.slug) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            <span>Details</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDownload(template.slug, e);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                            title="Download"
                            type="button"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Expandable Details Section */}
                      {expandedTemplates.has(template.slug) && (
                        <div className="px-4 pb-4 pt-0 border-t border-zinc-100 bg-zinc-50/50">
                          <div className="pt-4 space-y-3 text-sm">
                            {template.subtitle && (
                              <div>
                                <span className="font-semibold text-zinc-700">Subtitle: </span>
                                <span className="text-zinc-600">{template.subtitle}</span>
                              </div>
                            )}
                            {template.features && template.features.length > 0 && (
                              <div>
                                <span className="font-semibold text-zinc-700">Features: </span>
                                <span className="text-zinc-600">{Array.isArray(template.features) ? template.features.join(', ') : template.features}</span>
                              </div>
                            )}
                            {template.software && template.software.length > 0 && (
                              <div>
                                <span className="font-semibold text-zinc-700">Software: </span>
                                <span className="text-zinc-600">{Array.isArray(template.software) ? template.software.join(', ') : template.software}</span>
                              </div>
                            )}
                            {template.plugins && template.plugins.length > 0 && (
                              <div>
                                <span className="font-semibold text-zinc-700">Plugins: </span>
                                <span className="text-zinc-600">{Array.isArray(template.plugins) ? template.plugins.join(', ') : template.plugins}</span>
                              </div>
                            )}
                            {template.tags && template.tags.length > 0 && (
                              <div>
                                <span className="font-semibold text-zinc-700">Tags: </span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {Array.isArray(template.tags) ? template.tags.map((tag, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded text-xs">
                                      {tag}
                                    </span>
                                  )) : <span className="text-zinc-600">{template.tags}</span>}
                                </div>
                              </div>
                            )}
                            {template.description && (
                              <div>
                                <span className="font-semibold text-zinc-700">Description: </span>
                                <p className="text-zinc-600 mt-1 line-clamp-3">{template.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 border-dashed">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-zinc-400" />
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
    </main>
  );
}

