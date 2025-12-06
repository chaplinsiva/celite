'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { useLoginModal } from '../../context/LoginModalContext';
import { getYouTubeThumbnailUrl, cn } from '../../lib/utils';
import { Search, ChevronDown, ChevronRight, ChevronLeft, Check, PlayCircle, Download, Star, Filter, SlidersHorizontal, ArrowRight, Plus } from 'lucide-react';
import YouTubeVideoPlayer from '../../components/YouTubeVideoPlayer';

type Template = {
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  img: string | null;
  video: string | null;
  features: string[];
  software: string[];
  plugins: string[];
  tags: string[];
  created_at?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  feature?: boolean | null;
  is_featured?: boolean | null;
  isFeatured?: boolean | null;
  meta_title?: string | null;
  meta_description?: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
};

// Helper for thumbnails
const getThumbnail = (item: Template) => {
  // Show any image, even if low quality
  if (item.img) return item.img;
  if (item.video) {
    const thumb = getYouTubeThumbnailUrl(item.video);
    if (thumb) return thumb;
  }
  return '/PNG1.png';
};

const ITEMS_PER_PAGE = 30;

export default function TemplatesClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();

  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSoftware, setSelectedSoftware] = useState<string[]>([]);
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>([]);
  const [selectedResolutions, setSelectedResolutions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Expanded states for sidebar sections
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    software: true,
    plugins: true,
    resolution: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Sync search query with URL params
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam !== null && searchParam !== searchQuery) {
      setSearchQuery(searchParam);
    }
  }, [searchParams, searchQuery]);

  // Fetch Categories
  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: cats } = await supabase.from('categories').select('id,name,slug').order('name');
      const { data: subcats } = await supabase.from('subcategories').select('id,category_id,name,slug').order('name');

      setCategories([{ id: 'featured', name: 'Featured Templates', slug: 'featured' }, ...(cats || [])]);
      setSubcategories(subcats || []);
    };
    fetchData();
  }, []);

  // Filter Logic
  const filteredTemplates = useMemo(() => {
    let filtered = [...initialTemplates];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => {
        const nameMatch = t.name?.toLowerCase().includes(q);
        const subtitleMatch = t.subtitle?.toLowerCase().includes(q);
        const descriptionMatch = t.description?.toLowerCase().includes(q);
        const tagMatch = t.tags?.some(tag => tag?.toLowerCase().includes(q));
        const featureMatch = t.features?.some(feat => feat?.toLowerCase().includes(q));
        const softwareMatch = t.software?.some(sw => sw?.toLowerCase().includes(q));

        return nameMatch || subtitleMatch || descriptionMatch || tagMatch || featureMatch || softwareMatch;
      });
    }

    if (selectedCategory === 'featured') {
      filtered = filtered.filter(t => t.feature || t.is_featured || (t as any).isFeatured);
    } else if (selectedCategory !== 'all') {
      if (selectedSubcategory !== 'all') {
        filtered = filtered.filter(t => t.subcategory_id === selectedSubcategory);
      } else {
        filtered = filtered.filter(t => t.category_id === selectedCategory);
      }
    }

    // Filter by Software Applications
    if (selectedSoftware.length > 0) {
      filtered = filtered.filter(t => {
        const templateSoftware = (t.software || []).map(s => s?.toLowerCase() || '');
        return selectedSoftware.some(sw =>
          templateSoftware.some(ts => ts.includes(sw.toLowerCase()) || sw.toLowerCase().includes(ts))
        );
      });
    }

    // Filter by Plugins
    if (selectedPlugins.length > 0) {
      filtered = filtered.filter(t => {
        const templatePlugins = (t.plugins || []).map(p => p?.toLowerCase() || '');
        const hasNoPlugin = templatePlugins.length === 0 || templatePlugins.some(p =>
          p.includes('no plugin') || p.includes('none') || p === ''
        );

        if (selectedPlugins.includes('No Plugin Required')) {
          return hasNoPlugin;
        }

        return selectedPlugins.some(plugin => {
          if (plugin === 'No Plugin Required') return hasNoPlugin;
          return templatePlugins.some(tp =>
            tp.includes(plugin.toLowerCase()) || plugin.toLowerCase().includes(tp)
          );
        });
      });
    }

    // Filter by Resolution (check tags and features)
    if (selectedResolutions.length > 0) {
      filtered = filtered.filter(t => {
        const allText = [
          ...(t.tags || []).map(tag => tag?.toLowerCase() || ''),
          ...(t.features || []).map(feat => feat?.toLowerCase() || ''),
          t.name?.toLowerCase() || '',
          t.description?.toLowerCase() || ''
        ].join(' ');

        return selectedResolutions.some(res => {
          const resLower = res.toLowerCase();
          if (resLower.includes('4k')) {
            return allText.includes('4k') || allText.includes('3840') || allText.includes('2160');
          }
          if (resLower.includes('1080p') || resLower.includes('full hd')) {
            return allText.includes('1080p') || allText.includes('1080') || allText.includes('full hd') || allText.includes('fullhd');
          }
          if (resLower.includes('720p')) {
            return allText.includes('720p') || allText.includes('720') || allText.includes('hd');
          }
          if (resLower.includes('vertical') || resLower.includes('9:16')) {
            return allText.includes('vertical') || allText.includes('9:16') || allText.includes('portrait') || allText.includes('9x16');
          }
          return allText.includes(resLower);
        });
      });
    }

    if (sortBy === 'newest') filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    if (sortBy === 'oldest') filtered.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    if (sortBy === 'name') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return filtered;
  }, [initialTemplates, searchQuery, selectedCategory, selectedSubcategory, sortBy, selectedSoftware, selectedPlugins, selectedResolutions]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSubcategory, sortBy, selectedSoftware, selectedPlugins, selectedResolutions]);

  const totalPages = Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE);
  const paginatedTemplates = filteredTemplates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDownload = async (slug: string) => {
    if (!user) return openLoginModal();
    // ... (download logic omitted for brevity, keeping it simple for UI focus)
    router.push(`/product/${slug}`);
  };

  return (
    <main className="bg-zinc-50 min-h-screen pt-20 pb-20">

      {/* 1. Header Section */}
      <div className="bg-white border-b border-zinc-200 pb-8 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
                <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                <span>/</span>
                <span className="text-zinc-900">Video Templates</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">
                  <span className="text-blue-600">Video</span> Templates
                </h1>
                <div className="text-sm text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-full font-medium">
                  {filteredTemplates.length === initialTemplates.length ? (
                    <span>{filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'}</span>
                  ) : (
                    <span>
                      Showing <span className="text-blue-600 font-semibold">{filteredTemplates.length}</span> of {initialTemplates.length} {initialTemplates.length === 1 ? 'template' : 'templates'}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-zinc-500 mt-2 max-w-2xl">
                Discover professional, ready-to-edit video templates for openers, promos, logos, and more.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto md:max-w-none md:mx-0">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Update URL without page reload
                  const params = new URLSearchParams(window.location.search);
                  if (e.target.value.trim()) {
                    params.set('search', e.target.value.trim());
                  } else {
                    params.delete('search');
                  }
                  router.replace(`/templates?${params.toString()}`, { scroll: false });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const params = new URLSearchParams(window.location.search);
                    if (searchQuery.trim()) {
                      params.set('search', searchQuery.trim());
                    } else {
                      params.delete('search');
                    }
                    router.replace(`/templates?${params.toString()}`, { scroll: false });
                  }
                }}
                className="block w-full pl-11 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                placeholder="Search millions of creative assets..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* 2. Left Sidebar Filters (25%) */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-8 hidden lg:block">
            {/* Categories */}
            <div>
              <div
                className="flex items-center justify-between cursor-pointer mb-2"
                onClick={() => toggleSection('categories')}
              >
                <h3 className="font-bold text-zinc-900">Categories</h3>
                <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", !expandedSections.categories && "-rotate-90")} />
              </div>

              {expandedSections.categories && (
                <div className="space-y-1 pl-2 border-l border-zinc-200">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={cn("block w-full text-left px-3 py-1.5 text-sm rounded-r-lg transition-colors border-l-2 -ml-[1px]",
                      selectedCategory === 'all'
                        ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                        : "border-transparent text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                    )}
                  >
                    All Templates
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn("block w-full text-left px-3 py-1.5 text-sm rounded-r-lg transition-colors border-l-2 -ml-[1px]",
                        selectedCategory === cat.id
                          ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                          : "border-transparent text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Software Applications */}
            <div>
              <div
                className="flex items-center justify-between cursor-pointer mb-4"
                onClick={() => toggleSection('software')}
              >
                <h3 className="font-bold text-zinc-900">Software Applications</h3>
                <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", !expandedSections.software && "-rotate-90")} />
              </div>
              {expandedSections.software && (
                <div className="space-y-2">
                  {['After Effects', 'Premiere Pro', 'Apple Motion', 'DaVinci Resolve'].map(sw => {
                    const isSelected = selectedSoftware.includes(sw);
                    return (
                      <label
                        key={sw}
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedSoftware(prev =>
                            prev.includes(sw)
                              ? prev.filter(s => s !== sw)
                              : [...prev, sw]
                          );
                        }}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border bg-white flex items-center justify-center transition-colors",
                          isSelected
                            ? "border-blue-600 bg-blue-600"
                            : "border-zinc-300 group-hover:border-blue-500"
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={cn(
                          "text-sm transition-colors",
                          isSelected
                            ? "text-blue-600 font-medium"
                            : "text-zinc-600 group-hover:text-blue-600"
                        )}>{sw}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Plugins */}
            <div>
              <div
                className="flex items-center justify-between cursor-pointer mb-4"
                onClick={() => toggleSection('plugins')}
              >
                <h3 className="font-bold text-zinc-900">Plugins</h3>
                <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", !expandedSections.plugins && "-rotate-90")} />
              </div>
              {expandedSections.plugins && (
                <div className="space-y-2">
                  {['No Plugin Required', 'Element 3D', 'Optical Flares', 'Particular'].map(plugin => {
                    const isSelected = selectedPlugins.includes(plugin);
                    return (
                      <label
                        key={plugin}
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedPlugins(prev =>
                            prev.includes(plugin)
                              ? prev.filter(p => p !== plugin)
                              : [...prev, plugin]
                          );
                        }}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border bg-white flex items-center justify-center transition-colors",
                          isSelected
                            ? "border-blue-600 bg-blue-600"
                            : "border-zinc-300 group-hover:border-blue-500"
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={cn(
                          "text-sm transition-colors",
                          isSelected
                            ? "text-blue-600 font-medium"
                            : "text-zinc-600 group-hover:text-blue-600"
                        )}>{plugin}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Resolution */}
            <div>
              <div
                className="flex items-center justify-between cursor-pointer mb-4"
                onClick={() => toggleSection('resolution')}
              >
                <h3 className="font-bold text-zinc-900">Resolution</h3>
                <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", !expandedSections.resolution && "-rotate-90")} />
              </div>
              {expandedSections.resolution && (
                <div className="space-y-2">
                  {['4K', '1080p (Full HD)', '720p', 'Vertical (9:16)'].map(res => {
                    const isSelected = selectedResolutions.includes(res);
                    return (
                      <label
                        key={res}
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedResolutions(prev =>
                            prev.includes(res)
                              ? prev.filter(r => r !== res)
                              : [...prev, res]
                          );
                        }}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border bg-white flex items-center justify-center transition-colors",
                          isSelected
                            ? "border-blue-600 bg-blue-600"
                            : "border-zinc-300 group-hover:border-blue-500"
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={cn(
                          "text-sm transition-colors",
                          isSelected
                            ? "text-blue-600 font-medium"
                            : "text-zinc-600 group-hover:text-blue-600"
                        )}>{res}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* 3. Main Content Grid (75%) */}
          <div className="flex-1">

            {/* Mobile Filters Toggle */}
            <div className="lg:hidden mb-6">
              <button className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-zinc-200 rounded-xl text-zinc-700 font-medium hover:bg-zinc-50">
                <Filter className="w-4 h-4" /> Filters & Categories
              </button>
            </div>

            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedTemplates.map((template) => (
                  <div key={template.slug} className="group flex flex-col bg-white rounded-xl overflow-hidden border border-zinc-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300">
                    {/* Thumbnail / Video Player */}
                    <div className="relative aspect-video overflow-hidden bg-zinc-100">
                      {/* Using the YouTubeVideoPlayer for hover autoplay behavior */}
                      {template.video ? (
                        <div className="w-full h-full">
                          <YouTubeVideoPlayer
                            videoUrl={template.video}
                            title={template.name}
                            className="w-full h-full"
                          />
                        </div>
                      ) : (
                        <Link href={`/product/${template.slug}`} className="block w-full h-full">
                          <img
                            src={getThumbnail(template)}
                            alt={template.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-blue-600 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                              <PlayCircle className="w-6 h-6 fill-current" />
                            </div>
                          </div>
                        </Link>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-30">
                        {template.software.includes('After Effects') && (
                          <span className="px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">Ae</span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col flex-1 relative z-30 bg-white">
                      <Link href={`/product/${template.slug}`} className="block">
                        <h3 className="font-bold text-zinc-900 text-lg leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {template.name}
                        </h3>
                      </Link>

                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                            C
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-zinc-500">By Celite</span>
                            <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="w-2 h-2 text-white" strokeWidth={3} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-zinc-400">
                          <button
                            onClick={() => handleDownload(template.slug)}
                            className="hover:text-blue-600 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 border-dashed">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">No templates found</h3>
                <p className="text-zinc-500 mb-6">We couldn't find any templates matching your search.</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Pagination */}
            {filteredTemplates.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center items-center gap-4 mt-12">
                <button
                  onClick={() => {
                    setCurrentPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center text-zinc-400 disabled:opacity-30 hover:text-zinc-900 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .map((page) => (
                    <button
                      key={page}
                      onClick={() => {
                        setCurrentPage(page);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-200",
                        currentPage === page
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-100"
                          : "bg-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 scale-95 hover:scale-100"
                      )}
                    >
                      {page}
                    </button>
                  ))}

                <button
                  onClick={() => {
                    setCurrentPage(p => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center text-zinc-400 disabled:opacity-30 hover:text-zinc-900 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Become a Creator Section */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 py-20 mt-20 border-y border-blue-100/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
            Become a Celite Creator
          </h2>
          <p className="text-zinc-600 mb-8 text-lg max-w-2xl mx-auto">
            Upload your designs and become part of a growing creator community celebrated for creativity and innovation.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-900 text-white rounded-xl font-bold shadow-xl shadow-blue-900/10 hover:bg-blue-800 hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 5. FAQs Section */}
      <section className="max-w-3xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-zinc-900 text-center mb-12">FAQs</h2>
        <div className="space-y-4">
          {[
            'Who can become a seller on Celite?',
            'What type of content can I upload?',
            'How does Celite support creators?'
          ].map((question, i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <button className="w-full flex items-center justify-between p-6 text-left hover:bg-zinc-50 transition-colors group">
                <span className="font-bold text-zinc-800 group-hover:text-blue-600 transition-colors">{question}</span>
                <ChevronDown className="w-5 h-5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
              </button>
            </div>
          ))}
        </div>
      </section>

    </main >
  );
}
