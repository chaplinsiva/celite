'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { useLoginModal } from '../../context/LoginModalContext';
import { getYouTubeEmbedUrl } from '../../lib/utils';
import YouTubeVideoPlayer from '../../components/YouTubeVideoPlayer';
import { GlowingEffect } from '../../components/ui/glowing-effect';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/neon-button';
import { Liquid } from '../../components/ui/button-1';

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

export default function TemplatesClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const initialFilter = searchParams.get('filter') === 'featured' ? 'featured' : 'all';
  const [selectedCategory, setSelectedCategory] = useState<string>(initialFilter);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  // Debug: Log templates
  useEffect(() => {
    if (initialTemplates.length === 0) {
      console.log('No templates found in initialTemplates');
    } else {
      console.log(`Loaded ${initialTemplates.length} templates`);
    }
  }, [initialTemplates]);

  // Fetch categories and subcategories from database
  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabaseBrowserClient();
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id,name,slug')
        .order('name', { ascending: true });
      
      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      } else {
        setCategories([{ id: 'featured', name: 'Featured Templates', slug: 'featured' }, ...(categoriesData || [])]);
      }
      
      // Fetch subcategories
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('id,category_id,name,slug')
        .order('name', { ascending: true });
      
      if (subcategoriesError) {
        console.error('Error fetching subcategories:', subcategoriesError);
      } else {
        setSubcategories(subcategoriesData || []);
      }
    };
    
    fetchData();
  }, []);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Get subcategories for a specific category
  const getSubcategoriesForCategory = (categoryId: string) => {
    return subcategories.filter(sub => sub.category_id === categoryId);
  };

  // Auto-expand category when it's selected
  useEffect(() => {
    if (selectedCategory !== 'all') {
      const categorySubcategories = subcategories.filter(sub => sub.category_id === selectedCategory);
      if (categorySubcategories.length > 0) {
        setExpandedCategories(prev => {
          const newSet = new Set(prev);
          newSet.add(selectedCategory);
          return newSet;
        });
      }
    }
  }, [selectedCategory, subcategories]);

  useEffect(() => {
    if (selectedCategory === 'featured' && selectedSubcategory !== 'all') {
      setSelectedSubcategory('all');
    }
  }, [selectedCategory, selectedSubcategory]);

  // Get unique software
  const softwareList = useMemo(() => {
    const allSoftware = initialTemplates.flatMap(t => t.software || []);
    return Array.from(new Set(allSoftware)).sort();
  }, [initialTemplates]);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setIsSubscribed(false);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('is_active')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsSubscribed(!!sub?.is_active);
    };
    checkSubscription();
  }, [user]);


  const handleDownload = async (slug: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        openLoginModal();
        return;
      }
      const downloadUrl = `/api/download/${slug}?token=${encodeURIComponent(session.access_token)}`;
      const popup = window.open(downloadUrl, '_blank');
      if (!popup) {
        window.location.href = downloadUrl;
      }
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  // Filter and search templates
  const filteredTemplates = useMemo(() => {
    if (!initialTemplates || initialTemplates.length === 0) {
      return [];
    }

    let filtered = [...initialTemplates];

    // Search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => 
        t.name?.toLowerCase().includes(query) ||
        t.subtitle?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        (t.tags && Array.isArray(t.tags) && t.tags.some(tag => tag?.toLowerCase().includes(query))) ||
        (t.features && Array.isArray(t.features) && t.features.some(f => f?.toLowerCase().includes(query)))
      );
    }

    // Category and subcategory filter
    if (selectedCategory === 'featured') {
      filtered = filtered.filter((t) => t.feature === true || t.is_featured === true || (t as any).isFeatured === true);
    } else if (selectedCategory !== 'all') {
      if (selectedSubcategory !== 'all') {
        filtered = filtered.filter((t) => t.subcategory_id === selectedSubcategory);
      } else {
        filtered = filtered.filter((t) => t.category_id === selectedCategory);
      }
    }

    // Sort
    if (sortBy === 'newest') {
      filtered = filtered.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
    } else if (sortBy === 'oldest') {
      filtered = filtered.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb;
      });
    } else if (sortBy === 'name') {
      filtered = filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return filtered;
  }, [initialTemplates, searchQuery, selectedCategory, selectedSubcategory, sortBy]);

  return (
    <main className="bg-black min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Browse Templates</h1>
          <p className="text-zinc-400">Discover our complete collection of After Effects templates</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Overlay */}
          {isCategoriesOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsCategoriesOpen(false)}
            />
          )}
          
          {/* Categories Sidebar */}
          <aside className={cn(
            "lg:w-64 flex-shrink-0",
            "lg:block",
            isCategoriesOpen ? "block fixed left-0 top-0 h-full w-64 z-50 lg:relative lg:h-auto lg:w-64 overflow-y-auto bg-black lg:bg-transparent" : "hidden lg:block"
          )}>
            <div className="sticky top-0 lg:top-24 p-4 lg:p-0">
              <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm p-6 lg:bg-black/40 h-[calc(100vh-2rem)] lg:h-auto overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Categories</h2>
                  <button
                    onClick={() => setIsCategoriesOpen(false)}
                    className="lg:hidden text-zinc-400 hover:text-white transition"
                    aria-label="Close categories"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedSubcategory('all');
                      setIsCategoriesOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2 rounded-lg transition",
                      selectedCategory === 'all'
                        ? "bg-white/10 text-white font-medium"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    All Categories
                  </button>
                  {categories.map(category => {
                    const categorySubcategories = getSubcategoriesForCategory(category.id);
                    const isExpanded = expandedCategories.has(category.id);
                    const isSelected = selectedCategory === category.id && selectedSubcategory === 'all';
                    
                    return (
                      <div key={category.id} className="space-y-1">
                        <div className="flex items-center">
                          {categorySubcategories.length > 0 && (
                            <button
                              onClick={() => toggleCategory(category.id)}
                              className="p-1 text-zinc-400 hover:text-white transition"
                              aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              <svg
                                className={cn(
                                  "w-4 h-4 transition-transform",
                                  isExpanded && "rotate-90"
                                )}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}
                          {categorySubcategories.length === 0 && (
                            <div className="w-6" />
                          )}
                          <button
                            onClick={() => {
                              setSelectedCategory(category.id);
                              setSelectedSubcategory('all');
                              setIsCategoriesOpen(false);
                            }}
                            className={cn(
                              "flex-1 text-left px-3 py-2 rounded-lg transition",
                              isSelected
                                ? "bg-white/10 text-white font-medium"
                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                            )}
                          >
                            {category.name}
                          </button>
                        </div>
                        {isExpanded && categorySubcategories.length > 0 && (
                          <div className="ml-6 space-y-1">
                            {categorySubcategories.map(subcategory => {
                              const isSubSelected = selectedSubcategory === subcategory.id;
                              return (
                                <button
                                  key={subcategory.id}
                                  onClick={() => {
                                    setSelectedCategory(category.id);
                                    setSelectedSubcategory(subcategory.id);
                                    setIsCategoriesOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-3 py-1.5 rounded-lg text-sm transition",
                                    isSubSelected
                                      ? "bg-white/10 text-white font-medium"
                                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                  )}
                                >
                                  {subcategory.name}
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

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search and Filters */}
            <div className="mb-8 space-y-4">
              {/* Mobile Categories Toggle Button */}
              <button
                onClick={() => setIsCategoriesOpen(true)}
                className="lg:hidden w-full px-4 py-3 rounded-lg bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800 transition flex items-center justify-between"
              >
                <span className="font-medium">Categories</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Search Bar and Sort By Row */}
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search templates by name, tags, features..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-12 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition"
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {/* Sort By */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-white/30 transition sm:w-auto w-full"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name: A-Z</option>
                </select>
              </div>

              {/* Results Count */}
              <p className="text-sm text-zinc-400">
                Showing {filteredTemplates.length} of {initialTemplates.length} templates
              </p>
            </div>

            {/* Templates Grid */}
            {initialTemplates.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-zinc-400 mb-4">No templates available</p>
                <p className="text-sm text-zinc-500">Please check back later or contact support</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-zinc-400 mb-4">No templates found</p>
                <p className="text-sm text-zinc-500 mb-4">Try adjusting your search or filters</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedSubcategory('all');
                    setSortBy('newest');
                  }}
                  className="px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 transition"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard 
                    key={template.slug} 
                    template={template} 
                    isSubscribed={isSubscribed}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function TemplateCard({ 
  template, 
  isSubscribed,
  onDownload,
}: { 
  template: Template; 
  isSubscribed: boolean;
  onDownload: (slug: string) => void;
}) {

  return (
    <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={3}
      />
      <div className="relative flex h-full flex-col overflow-hidden rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-4 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
        <Link href={`/product/${template.slug}`} className="absolute inset-0 z-10" aria-label={template.name || 'Template'} />
        <div className="relative w-full h-40 sm:h-48 md:h-40 rounded-lg mb-3 overflow-hidden pointer-events-none">
          {template.video ? (
            <YouTubeVideoPlayer 
              videoUrl={template.video}
              title={template.name || 'Template'}
              className="w-full h-full"
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-2 flex-1 relative z-0">
          <h3 className="text-base sm:text-lg font-semibold text-white text-center leading-tight">{template.name}</h3>
        </div>
      </div>
    </div>
  );
}

