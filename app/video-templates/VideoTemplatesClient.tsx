'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { useLoginModal } from '../../context/LoginModalContext';
import { cn, convertR2UrlToCdn } from '../../lib/utils';
import { Search, ChevronDown, ChevronRight, ChevronLeft, Download, ArrowRight } from 'lucide-react';
import VideoThumbnailPlayer from '../../components/VideoThumbnailPlayer';

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

type SubSubcategory = {
  id: string;
  subcategory_id: string;
  name: string;
  slug: string;
};

const getThumbnail = (item: Template) => {
  // Prioritize thumbnail_path for new templates
  if (item.thumbnail_path) return convertR2UrlToCdn(item.thumbnail_path) || item.thumbnail_path;
  // Fallback to img
  if (item.img) return convertR2UrlToCdn(item.img) || item.img;
  return '/PNG1.png';
};

const ITEMS_PER_PAGE = 30;
const MUSIC_SFX_CATEGORY_ID = '143d45f1-a55b-42be-9f51-aab507a20fac';
const STOCK_PHOTOS_CATEGORY_ID = 'ba7f68c3-6f0f-4a29-a337-3b2cef7b4f47';

export default function VideoTemplatesClient({
  initialTemplates,
  pageTitle = 'Video Templates',
  pageSubtitle = 'Discover professional, ready-to-edit video templates for openers, promos, logos, and more.',
  breadcrumbLabel = 'Video Templates',
  basePath = '/video-templates'
}: {
  initialTemplates: Template[];
  pageTitle?: string;
  pageSubtitle?: string;
  breadcrumbLabel?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();

  const subcategorySlugFromUrl = searchParams.get('subcategory') || null;

  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [viewMode, setViewMode] = useState<'discover' | 'following'>('discover');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSections, setExpandedSections] = useState({ categories: true, filters: false });

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
  const [followingCreatorIds, setFollowingCreatorIds] = useState<string[]>([]);

  // Fetch Categories, Subcategories, and Sub-Subcategories
  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabaseBrowserClient();

      const [catsResult, subcatsResult, subSubcatsResult] = await Promise.all([
        supabase.from('categories').select('id,name,slug').order('name'),
        supabase.from('subcategories').select('id,category_id,name,slug').order('name'),
        supabase.from('sub_subcategories').select('id,subcategory_id,name,slug').order('name')
      ]);

      let filteredCats = (catsResult.data || []).filter(cat =>
        cat.id !== MUSIC_SFX_CATEGORY_ID && cat.id !== STOCK_PHOTOS_CATEGORY_ID
      );

      if (basePath === '/video-templates') {
        filteredCats = filteredCats.filter(cat =>
          cat.slug === 'video-templates' ||
          (cat.name.toLowerCase().includes('video') && cat.name.toLowerCase().includes('template'))
        );
      }

      setCategories([{ id: 'featured', name: 'Featured Templates', slug: 'featured' }, ...filteredCats]);
      setSubcategories(subcatsResult.data || []);
      setSubSubcategories(subSubcatsResult.data || []);

      // Auto-select Video Templates category
      if (basePath === '/video-templates') {
        const videoTemplatesCat = filteredCats.find(cat =>
          cat.slug === 'video-templates' ||
          (cat.name.toLowerCase().includes('video') && cat.name.toLowerCase().includes('template'))
        );
        if (videoTemplatesCat) {
          setSelectedCategory(videoTemplatesCat.id);
          setSelectedSubcategory('all');
          setSelectedSubSubcategory('all');
        }
      }
    };
    fetchData();
  }, [basePath]);

  // Sync subcategory from URL
  useEffect(() => {
    if (subcategorySlugFromUrl && subcategories.length > 0) {
      const subcategory = subcategories.find(sub => sub.slug === subcategorySlugFromUrl);
      if (subcategory) {
        setSelectedSubcategory(subcategory.id);
        setSelectedCategory(subcategory.category_id);
      }
    }
  }, [subcategorySlugFromUrl, subcategories]);

  // Fetch following creators
  useEffect(() => {
    if (!user) {
      setFollowingCreatorIds([]);
      return;
    }

    const fetchFollowing = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('follows')
        .select('creator_shop_id')
        .eq('follower_id', user.id);

      if (data) {
        setFollowingCreatorIds(data.map(f => f.creator_shop_id).filter(Boolean));
      }
    };
    fetchFollowing();
  }, [user]);

  // Get available subcategories for selected category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'featured' || selectedCategory === 'all') {
      return [];
    }
    return subcategories.filter(sub => sub.category_id === selectedCategory);
  }, [selectedCategory, subcategories]);

  // Get available sub-subcategories for selected subcategory
  const availableSubSubcategories = useMemo(() => {
    if (!selectedSubcategory || selectedSubcategory === 'all') {
      return [];
    }
    return subSubcategories.filter(sub => sub.subcategory_id === selectedSubcategory);
  }, [selectedSubcategory, subSubcategories]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = [...initialTemplates].filter(t =>
      t.category_id !== MUSIC_SFX_CATEGORY_ID &&
      t.category_id !== STOCK_PHOTOS_CATEGORY_ID
    );

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => {
        const nameMatch = t.name?.toLowerCase().includes(q);
        const subtitleMatch = t.subtitle?.toLowerCase().includes(q);
        const descriptionMatch = t.description?.toLowerCase().includes(q);
        const tagMatch = (Array.isArray(t.tags) ? t.tags : (typeof t.tags === 'string' ? JSON.parse(t.tags) : [])).some((tag: any) => tag?.toLowerCase().includes(q));
        const featureMatch = (Array.isArray(t.features) ? t.features : (typeof t.features === 'string' ? JSON.parse(t.features) : [])).some((feat: any) => feat?.toLowerCase().includes(q));
        const softwareMatch = t.software?.some(sw => sw?.toLowerCase().includes(q));
        return nameMatch || subtitleMatch || descriptionMatch || tagMatch || featureMatch || softwareMatch;
      });
    }

    // Category/Subcategory filter
    if (selectedCategory === 'featured') {
      filtered = filtered.filter(t => t.feature || t.is_featured || (t as any).isFeatured);
    } else if (selectedCategory && selectedCategory !== 'all' && selectedCategory !== '') {
      if (selectedSubSubcategory && selectedSubSubcategory !== 'all' && selectedSubSubcategory !== '') {
        // Filter by sub-subcategory
        filtered = filtered.filter(t => t.sub_subcategory_id === selectedSubSubcategory);
      } else if (selectedSubcategory && selectedSubcategory !== 'all' && selectedSubcategory !== '') {
        // Filter by subcategory - show all templates in this subcategory (including those with sub-subcategories)
        filtered = filtered.filter(t => t.subcategory_id === selectedSubcategory);
      } else {
        // Show all templates in the category
        // Include templates that have category_id matching OR templates whose subcategory belongs to this category
        filtered = filtered.filter(t => {
          // Direct category match
          if (t.category_id === selectedCategory) return true;
          // Template's subcategory belongs to selected category
          if (t.subcategory_id) {
            const templateSubcategory = subcategories.find(sub => sub.id === t.subcategory_id);
            if (templateSubcategory?.category_id === selectedCategory) return true;
          }
          return false;
        });
      }
    }
    // If no category selected, show all templates (shouldn't happen on /video-templates page as it auto-selects)

    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return filtered;
  }, [initialTemplates, searchQuery, selectedCategory, selectedSubcategory, selectedSubSubcategory, sortBy]);

  // View mode filter
  const viewTemplates = useMemo(() => {
    if (viewMode === "discover") return filteredTemplates;
    if (!user || followingCreatorIds.length === 0) return [];
    return filteredTemplates.filter((t) =>
      followingCreatorIds.includes((t.creator_shop_id as any) || "")
    );
  }, [viewMode, filteredTemplates, followingCreatorIds, user]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSubcategory, selectedSubSubcategory, sortBy, viewMode]);

  const totalPages = Math.ceil(viewTemplates.length / ITEMS_PER_PAGE);
  const paginatedTemplates = viewTemplates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDownload = async (slug: string) => {
    if (!user) return openLoginModal();
    router.push(`/product/${slug}`);
  };

  return (
    <main className="bg-background min-h-screen pt-20 pb-20">
      {/* Header Section */}
      <div className="bg-background border-b border-zinc-200 pb-8 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
                <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                <span>/</span>
                <span className="text-zinc-900">{breadcrumbLabel}</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">{pageTitle}</h1>
                <div className="flex items-center gap-3 flex-wrap">

                  <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode('discover')}
                      className={cn(
                        "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                        viewMode === 'discover'
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-zinc-600 hover:text-zinc-900"
                      )}
                    >
                      Discover
                    </button>
                    <button
                      onClick={() => setViewMode('following')}
                      className={cn(
                        "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                        viewMode === 'following'
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-zinc-600 hover:text-zinc-900"
                      )}
                    >
                      Following
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-zinc-600 mt-4 max-w-3xl">{pageSubtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-zinc-200 rounded-xl bg-white text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search millions of creative assets..."
              className="w-full pl-12 pr-4 py-4 border border-zinc-200 rounded-2xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full">
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 hidden lg:block pl-4">
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 sticky top-24">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, categories: !prev.categories }))}
                className="w-full flex items-center justify-between text-sm font-semibold text-zinc-900 mb-4"
              >
                Categories
                {expandedSections.categories ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {expandedSections.categories && (
                <div className="space-y-1 pl-2 border-l border-zinc-200">
                  {categories.filter(cat => cat.id !== 'featured' && cat.id !== MUSIC_SFX_CATEGORY_ID && cat.id !== STOCK_PHOTOS_CATEGORY_ID).map(cat => (
                    <div key={cat.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setSelectedSubcategory('all');
                          setSelectedSubSubcategory('all');
                        }}
                        className={cn(
                          "block w-full text-left px-3 py-1.5 text-sm rounded-r-lg transition-colors border-l-2 -ml-[1px] cursor-pointer",
                          selectedCategory === cat.id
                            ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                            : "border-transparent text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                        )}
                      >
                        {cat.name}
                      </button>
                      {selectedCategory === cat.id && availableSubcategories.length > 0 && (
                        <div className="ml-4 mt-1 space-y-1 border-l border-zinc-200 pl-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSubcategory('all');
                              setSelectedSubSubcategory('all');
                            }}
                            className={cn(
                              "block w-full text-left px-2 py-1 text-xs rounded-r transition-colors cursor-pointer",
                              selectedSubcategory === 'all'
                                ? "text-blue-600 font-medium"
                                : "text-zinc-500 hover:text-zinc-700"
                            )}
                          >
                            All {cat.name}
                          </button>
                          {availableSubcategories
                            .filter(subcat => subcat.category_id === cat.id)
                            .map(subcat => {
                              // Count ALL templates in this subcategory (including those with sub-subcategories)
                              const templateCount = initialTemplates.filter(t => t.subcategory_id === subcat.id).length;
                              // Get sub-subcategories for THIS subcategory (not just the selected one)
                              const subSubcatsForThis = subSubcategories.filter(s => s.subcategory_id === subcat.id);
                              return (
                                <div key={subcat.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSubcategory(subcat.id);
                                      setSelectedSubSubcategory('all');
                                    }}
                                    className={cn(
                                      "block w-full text-left px-2 py-1 text-xs rounded-r transition-colors flex items-center justify-between cursor-pointer",
                                      selectedSubcategory === subcat.id && selectedSubSubcategory === 'all'
                                        ? "text-blue-600 font-medium"
                                        : "text-zinc-500 hover:text-zinc-700"
                                    )}
                                  >
                                    <span>{subcat.name}</span>
                                  </button>
                                  {selectedSubcategory === subcat.id && subSubcatsForThis.length > 0 && (
                                    <div className="ml-4 mt-1 space-y-1 border-l border-zinc-200 pl-2">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedSubSubcategory('all')}
                                        className={cn(
                                          "block w-full text-left px-2 py-1 text-[10px] rounded-r transition-colors cursor-pointer",
                                          selectedSubSubcategory === 'all'
                                            ? "text-blue-600 font-medium"
                                            : "text-zinc-500 hover:text-zinc-700"
                                        )}
                                      >
                                        All {subcat.name}
                                      </button>
                                      {subSubcatsForThis.map(subSubcat => {
                                        const subSubTemplateCount = initialTemplates.filter(t => t.sub_subcategory_id === subSubcat.id).length;
                                        // Show sub-subcategory even if it has 0 templates (so users can see it exists)
                                        return (
                                          <button
                                            key={subSubcat.id}
                                            type="button"
                                            onClick={() => setSelectedSubSubcategory(subSubcat.id)}
                                            className={cn(
                                              "block w-full text-left px-2 py-1 text-[10px] rounded-r transition-colors flex items-center justify-between cursor-pointer",
                                              selectedSubSubcategory === subSubcat.id
                                                ? "text-blue-600 font-medium"
                                                : "text-zinc-500 hover:text-zinc-700"
                                            )}
                                          >
                                            <span>{subSubcat.name}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Main Content Grid */}
          <div className="flex-1">
            {viewMode === "following" && (!user || followingCreatorIds.length === 0) && (
              <div className="mb-6 rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-4 text-xs text-zinc-600">
                {!user
                  ? "Log in to follow creators and see their templates in the Following tab."
                  : "You are not following any creators yet. Visit creator studio pages and follow your favorite creators to build your Following feed."}
              </div>
            )}

            {viewTemplates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-200">
                {paginatedTemplates.map((template) => (
                  <Link
                    key={template.slug}
                    href={`/product/${template.slug}`}
                    className="group relative aspect-video overflow-hidden bg-zinc-900 transition-all duration-300"
                  >
                    {/* Video/Image */}
                    {template.video_path ? (
                      <VideoThumbnailPlayer
                        videoUrl={template.video_path}
                        thumbnailUrl={template.thumbnail_path || template.img || undefined}
                        title={template.name}
                        className="w-full h-full"
                      />
                    ) : (
                      <img
                        src={getThumbnail(template)}
                        alt={template.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}

                    {/* Hover Overlay with Info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    {/* Bottom Info - Shows on Hover (pointer-events-none to not block audio button) */}
                    <div className="absolute bottom-0 left-0 right-12 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none z-20">
                      {/* Template Name */}
                      <h3 className="text-white text-xs sm:text-sm font-semibold line-clamp-1 mb-1 drop-shadow-lg">
                        {template.name}
                      </h3>
                      {/* Vendor Name */}
                      {template.vendor_name && (
                        <p className="text-white/70 text-[10px] sm:text-xs truncate drop-shadow">
                          by {template.vendor_name}
                        </p>
                      )}
                    </div>

                    {/* Top Right Icons - Shows on Hover */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownload(template.slug);
                        }}
                        className="p-1.5 sm:p-2 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-blue-600 transition-colors"
                        title="Download"
                      >
                        <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>

                    {/* Software Badge - Always visible */}
                    {template.software?.includes('After Effects') && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[9px] font-bold text-white uppercase tracking-wider">
                        Ae
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="max-w-md mx-auto">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">No templates found</h3>
                  <p className="text-zinc-500 mb-6">
                    {searchQuery.trim()
                      ? `No templates match your search "${searchQuery}"`
                      : selectedSubcategory !== 'all' && selectedSubcategory !== ''
                        ? "No templates in this subcategory"
                        : "Try selecting a different category or subcategory"}
                  </p>
                  {searchQuery.trim() && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Pagination */}
            {viewTemplates.length > ITEMS_PER_PAGE && (
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
        </div>
      </div>

      {/* Become a Creator Section */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 py-20 mt-20 border-y border-blue-100/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
            Become a Celite Creator
          </h2>
          <p className="text-zinc-600 mb-8 text-lg max-w-2xl mx-auto">
            Upload your designs and become part of a growing creator community celebrated for creativity and innovation.
          </p>
          <Link
            href="/creator/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
