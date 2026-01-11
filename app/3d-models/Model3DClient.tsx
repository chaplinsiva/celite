'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { useLoginModal } from '../../context/LoginModalContext';
import { cn, convertR2UrlToCdn } from '../../lib/utils';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Check, Download, Filter, ArrowRight } from 'lucide-react';

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
  model_3d_path?: string | null;
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

const ITEMS_PER_PAGE = 30;

export default function Model3DClient({
  initialTemplates,
  pageTitle = '3D Models',
  pageSubtitle = 'Discover high-quality 3D models for your projects.',
  breadcrumbLabel = '3D Models',
  basePath = '/3d-models'
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

  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [availableSubcategories, setAvailableSubcategories] = useState<Subcategory[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
  const [availableSubSubcategories, setAvailableSubSubcategories] = useState<SubSubcategory[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
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
      const { data: subSubcats } = await supabase.from('sub_subcategories').select('id,subcategory_id,name,slug').order('name');

      // Filter to only show 3D Models category
      const filteredCats = (cats || []).filter(cat =>
        cat.slug === '3d-models' ||
        cat.slug === '3d-models' ||
        cat.name.toLowerCase().includes('3d') && cat.name.toLowerCase().includes('model')
      );

      setCategories([{ id: 'featured', name: 'Featured Models', slug: 'featured' }, ...filteredCats]);
      setSubcategories(subcats || []);
      setSubSubcategories(subSubcats || []);

      // Auto-select the category if there's only one
      if (filteredCats.length === 1) {
        setSelectedCategory(filteredCats[0].id);
      }
    };
    fetchData();
  }, [basePath]);

  // Filter subcategories
  useEffect(() => {
    if (subcategories.length === 0 || initialTemplates.length === 0 || !selectedCategory || selectedCategory === 'featured' || selectedCategory === 'all') {
      setAvailableSubcategories([]);
      return;
    }

    const subcatsWithTemplates = subcategories
      .filter(subcat => subcat.category_id === selectedCategory)
      .filter(subcat => {
        return initialTemplates.some(t => t.subcategory_id === subcat.id);
      });

    setAvailableSubcategories(subcatsWithTemplates);
  }, [subcategories, initialTemplates, selectedCategory]);

  // Filter sub-subcategories to only show those with available templates for the selected subcategory
  useEffect(() => {
    if (subSubcategories.length === 0 || initialTemplates.length === 0 || !selectedSubcategory || selectedSubcategory === 'all') {
      setAvailableSubSubcategories([]);
      setSelectedSubSubcategory('all');
      return;
    }

    const subSubcatsWithTemplates = subSubcategories
      .filter(subSubcat => subSubcat.subcategory_id === selectedSubcategory)
      .filter(subSubcat => {
        return initialTemplates.some(t => t.sub_subcategory_id === subSubcat.id);
      });

    setAvailableSubSubcategories(subSubcatsWithTemplates);
    if (selectedSubSubcategory !== 'all' && !subSubcatsWithTemplates.find(s => s.id === selectedSubSubcategory)) {
      setSelectedSubSubcategory('all');
    }
  }, [subSubcategories, initialTemplates, selectedSubcategory, selectedSubSubcategory]);

  // Filter Logic
  const filteredTemplates = useMemo(() => {
    let filtered = [...initialTemplates];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => {
        const nameMatch = t.name?.toLowerCase().includes(q);
        const subtitleMatch = t.subtitle?.toLowerCase().includes(q);
        const descriptionMatch = t.description?.toLowerCase().includes(q);
        const tagMatch = (Array.isArray(t.tags) ? t.tags : (typeof t.tags === 'string' ? JSON.parse(t.tags) : [])).some((tag: any) => tag?.toLowerCase().includes(q));
        const featureMatch = (Array.isArray(t.features) ? t.features : (typeof t.features === 'string' ? JSON.parse(t.features) : [])).some((feat: any) => feat?.toLowerCase().includes(q));
        const softwareMatch = t.software?.some(sw => (sw?.toLowerCase() || '').includes(q));

        return nameMatch || subtitleMatch || descriptionMatch || tagMatch || featureMatch || softwareMatch;
      });
    }

    if (selectedCategory === 'featured') {
      filtered = filtered.filter(t => t.feature || t.is_featured || (t as any).isFeatured);
    } else if (selectedCategory && selectedCategory !== 'all') {
      if (selectedSubSubcategory !== 'all') {
        filtered = filtered.filter(t => t.sub_subcategory_id === selectedSubSubcategory);
      } else if (selectedSubcategory !== 'all') {
        filtered = filtered.filter(t => t.subcategory_id === selectedSubcategory);
      } else {
        filtered = filtered.filter(t => t.category_id === selectedCategory);
      }
    }

    if (sortBy === 'newest') filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    if (sortBy === 'oldest') filtered.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    if (sortBy === 'name') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return filtered;
  }, [initialTemplates, searchQuery, selectedCategory, selectedSubcategory, selectedSubSubcategory, sortBy]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSubcategory, sortBy]);

  const totalPages = Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE);
  const paginatedTemplates = filteredTemplates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDownload = async (slug: string) => {
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

      const json = await res.json();

      // Handle redirect URL (signed URL for direct download)
      if (json.redirect && json.url) {
        window.location.href = json.url;
        return;
      }

      // Handle errors
      if (json.error) {
        if (json.error.includes('Access denied') || json.error.includes('subscription')) {
          router.push('/pricing');
        } else {
          alert(json.error || 'Download failed');
        }
      }
    } catch (e: any) {
      console.error('Download failed:', e);
      alert('Download failed');
    }
  };

  return (
    <main className="bg-zinc-50 min-h-screen pt-20 pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-zinc-200 pb-8 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
                <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                <span>/</span>
                <span className="text-zinc-900">{breadcrumbLabel}</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">
                  <span className="text-blue-600">{pageTitle.split(' ')[0]}</span> {pageTitle.split(' ').slice(1).join(' ')}
                </h1>
              </div>
              <p className="text-zinc-500 mt-2 max-w-2xl">
                {pageSubtitle}
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
                  const params = new URLSearchParams(window.location.search);
                  if (e.target.value.trim()) {
                    params.set('search', e.target.value.trim());
                  } else {
                    params.delete('search');
                  }
                  router.replace(`${basePath}?${params.toString()}`, { scroll: false });
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
                    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
                  }
                }}
                className="block w-full pl-11 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                placeholder="Search 3D models..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar Filters */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-8 hidden lg:block">
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
                  {categories.filter(cat => cat.id !== 'featured').map(cat => (
                    <div key={cat.id}>
                      <button
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setSelectedSubcategory('all');
                          setSelectedSubSubcategory('all');
                        }}
                        className={cn("block w-full text-left px-3 py-1.5 text-sm rounded-r-lg transition-colors border-l-2 -ml-[1px]",
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
                            onClick={() => {
                              setSelectedSubcategory('all');
                              setSelectedSubSubcategory('all');
                            }}
                            className={cn("block w-full text-left px-2 py-1 text-xs rounded-r transition-colors",
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
                              const templateCount = initialTemplates.filter(t => t.subcategory_id === subcat.id && !t.sub_subcategory_id).length;
                              const subSubcatsForThis = availableSubSubcategories.filter(s => s.subcategory_id === subcat.id);
                              return (
                                <div key={subcat.id}>
                                  <button
                                    onClick={() => {
                                      setSelectedSubcategory(subcat.id);
                                      setSelectedSubSubcategory('all');
                                    }}
                                    className={cn("block w-full text-left px-2 py-1 text-xs rounded-r transition-colors flex items-center justify-between",
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
                                        onClick={() => setSelectedSubSubcategory('all')}
                                        className={cn("block w-full text-left px-2 py-1 text-[10px] rounded-r transition-colors",
                                          selectedSubSubcategory === 'all'
                                            ? "text-blue-600 font-medium"
                                            : "text-zinc-500 hover:text-zinc-700"
                                        )}
                                      >
                                        All {subcat.name}
                                      </button>
                                      {subSubcatsForThis.map(subSubcat => {
                                        const subSubTemplateCount = initialTemplates.filter(t => t.sub_subcategory_id === subSubcat.id).length;
                                        return (
                                          <button
                                            key={subSubcat.id}
                                            onClick={() => setSelectedSubSubcategory(subSubcat.id)}
                                            className={cn("block w-full text-left px-2 py-1 text-[10px] rounded-r transition-colors flex items-center justify-between",
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
                    {/* Thumbnail Preview */}
                    <Link href={`/product/${template.slug}`} className="block relative aspect-video overflow-hidden bg-zinc-100">
                      {template.thumbnail_path ? (
                        <img
                          src={convertR2UrlToCdn(template.thumbnail_path) || template.thumbnail_path}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : template.img ? (
                        <img
                          src={convertR2UrlToCdn(template.img) || template.img}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-200 text-zinc-400">
                          No Preview
                        </div>
                      )}
                    </Link>

                    {/* Content */}
                    <div className="p-4 flex flex-col flex-1 relative z-30 bg-white">
                      <Link href={`/product/${template.slug}`} className="block">
                        <h3 className="font-bold text-zinc-900 text-lg leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {template.name}
                        </h3>
                      </Link>

                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-100">
                        {template.vendor_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                              {template.vendor_name.charAt(0).toUpperCase() || "C"}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-zinc-500">
                                By {template.vendor_name}
                              </span>
                              <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                <Check className="w-2 h-2 text-white" strokeWidth={3} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div></div>
                        )}
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
            ) : null}

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

      {/* Become a Creator Section */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 py-20 mt-20 border-y border-blue-100/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
            Become a Celite Creator
          </h2>
          <p className="text-zinc-600 mb-8 text-lg max-w-2xl mx-auto">
            Upload your 3D models and become part of a growing creator community celebrated for creativity and innovation.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-900 text-white rounded-xl font-bold shadow-xl shadow-blue-900/10 hover:bg-blue-800 hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

