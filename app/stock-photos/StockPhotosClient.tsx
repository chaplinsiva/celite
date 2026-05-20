'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { useLoginModal } from '../../context/LoginModalContext';
import { Download, Search } from 'lucide-react';
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
  source_path?: string | null;
};

export default function StockPhotosClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const router = useRouter();
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>(initialTemplates);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name: string; slug: string; category_id: string }>>([]);
  const [availableSubcategories, setAvailableSubcategories] = useState<Array<{ id: string; name: string; slug: string; category_id: string }>>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const stockPhotoCategoryId = 'ba7f68c3-6f0f-4a29-a337-3b2cef7b4f47';

  // Fetch subcategories
  useEffect(() => {
    const fetchSubcategories = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('subcategories')
        .select('id,name,slug,category_id')
        .eq('category_id', stockPhotoCategoryId)
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

    // Show all subcategories that belong to Stock Photos category
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
        const tagMatch = (Array.isArray(t.tags) ? t.tags : (typeof t.tags === 'string' ? JSON.parse(t.tags) : [])).some((tag: any) => tag?.toLowerCase().includes(q));
        const featureMatch = (Array.isArray(t.features) ? t.features : (typeof t.features === 'string' ? JSON.parse(t.features) : [])).some((feat: any) => feat?.toLowerCase().includes(q));

        return nameMatch || subtitleMatch || descriptionMatch || tagMatch || featureMatch;
      });
    }

    setFilteredTemplates(filtered);
  }, [searchQuery, initialTemplates, selectedSubcategory]);

  const handleDownload = async (slug: string) => {
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

      // Direct download
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

  const getThumbnail = (template: Template) => {
    if (template.thumbnail_path) {
      return convertR2UrlToCdn(template.thumbnail_path) || template.thumbnail_path;
    }
    if (template.img) {
      return convertR2UrlToCdn(template.img) || template.img;
    }
    return '/PNG1.png';
  };

  // Create collage layout with varying sizes
  const getCollageClass = (index: number) => {
    const patterns = [
      'col-span-1 row-span-1', // Small
      'col-span-2 row-span-2', // Large
      'col-span-1 row-span-2', // Tall
      'col-span-2 row-span-1', // Wide
      'col-span-1 row-span-1', // Small
      'col-span-2 row-span-2', // Large
    ];
    return patterns[index % patterns.length];
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
                <span className="text-zinc-900">Stock Photos</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">
                <span className="text-blue-600">Stock Photos</span> Gallery
              </h1>
              <p className="text-zinc-500 mt-2 max-w-2xl">
                Browse our collection of high-quality royalty-free stock photos for your projects.
              </p>
            </div>
          </div>

          {/* Search Bar and Subcategory Filter */}
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-11 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                placeholder="Search stock photos..."
              />
            </div>
            {subcategories.length > 0 && (
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="px-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm text-sm font-medium cursor-pointer"
              >
                <option value="all">All Categories</option>
                {subcategories.map(subcat => {
                  const count = initialTemplates.filter(t => t.subcategory_id === subcat.id).length;
                  return (
                    <option key={subcat.id} value={subcat.id}>
                      {subcat.name}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stock Photos Collage Gallery */}
        {filteredTemplates.length > 0 ? (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-zinc-900">
                Photos
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[200px]">
              {filteredTemplates.map((template, index) => {
                const thumbnail = getThumbnail(template);
                const collageClass = getCollageClass(index);
                return (
                  <Link
                    key={template.slug}
                    href={`/product/${template.slug}`}
                    className={`group relative overflow-hidden rounded-xl bg-zinc-100 ${collageClass} cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-sm hover:shadow-xl block`}
                  >
                    <img
                      src={thumbnail}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      <div className="text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{template.name}</h3>
                        {template.subtitle && (
                          <p className="text-xs text-white/80 line-clamp-1">{template.subtitle}</p>
                        )}
                      </div>
                    </div>
                    {/* Download button in corner */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDownload(template.slug);
                      }}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110 shadow-lg z-10"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-zinc-900" />
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 border-dashed">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">No photos found</h3>
            <p className="text-zinc-500 mb-6">We couldn't find any stock photos matching your search.</p>
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

