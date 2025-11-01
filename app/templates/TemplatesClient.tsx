'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { useLoginModal } from '../../context/LoginModalContext';
import { getYouTubeEmbedUrl } from '../../lib/utils';

type Template = {
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  img: string | null;
  video: string | null;
  features: string[];
  software: string[];
  plugins: string[];
  tags: string[];
  is_featured: boolean;
  is_limited_offer?: boolean;
  limited_offer_duration_days?: number | null;
  limited_offer_start_date?: string | null;
};

export default function TemplatesClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const router = useRouter();
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [featuredFilter, setFeaturedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Debug: Log templates
  useEffect(() => {
    if (initialTemplates.length === 0) {
      console.log('No templates found in initialTemplates');
    } else {
      console.log(`Loaded ${initialTemplates.length} templates`);
    }
  }, [initialTemplates]);

  // Get unique categories from tags
  const categories = useMemo(() => {
    const allTags = initialTemplates.flatMap(t => t.tags || []);
    const uniqueTags = Array.from(new Set(allTags));
    return uniqueTags.sort();
  }, [initialTemplates]);

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
      const res = await fetch(`/api/download/${slug}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        return;
      }
      
      // Check if response is JSON (redirect to external URL)
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const json = await res.json();
        if (json.redirect && json.url) {
          // Redirect to external drive link
          window.open(json.url, '_blank');
          return;
        }
        return; // If it's JSON but no redirect, return early
      }
      
      // Otherwise, download as blob (Supabase storage file)
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slug}.rar`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
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

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => 
        t.tags && Array.isArray(t.tags) && t.tags.includes(selectedCategory)
      );
    }

    // Price filter
    if (priceFilter === 'free') {
      filtered = filtered.filter(t => {
        if (t.price === 0) return true;
        if (t.is_limited_offer && isSubscribed) {
          // Check if limited offer is still active
          if (t.limited_offer_start_date && t.limited_offer_duration_days) {
            const startDate = new Date(t.limited_offer_start_date);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + (t.limited_offer_duration_days || 0));
            return new Date() <= endDate;
          }
        }
        return false;
      });
    } else if (priceFilter === 'paid') {
      filtered = filtered.filter(t => {
        if (t.price === 0) return false;
        if (t.is_limited_offer && isSubscribed) {
          // If it's a limited offer for subscribed user, it's free, so exclude
          if (t.limited_offer_start_date && t.limited_offer_duration_days) {
            const startDate = new Date(t.limited_offer_start_date);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + (t.limited_offer_duration_days || 0));
            return new Date() > endDate;
          }
        }
        return true;
      });
    }

    // Featured filter
    if (featuredFilter === 'featured') {
      filtered = filtered.filter(t => t.is_featured === true);
    }

    // Sort
    if (sortBy === 'oldest') {
      filtered = filtered.reverse();
    } else if (sortBy === 'price-low') {
      filtered = filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price-high') {
      filtered = filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'name') {
      filtered = filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return filtered;
  }, [initialTemplates, searchQuery, selectedCategory, priceFilter, featuredFilter, sortBy, isSubscribed]);

  return (
    <main className="bg-black min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Browse Templates</h1>
          <p className="text-zinc-400">Discover our complete collection of After Effects templates</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
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

          {/* Filters Row */}
          <div className="flex flex-wrap gap-4">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-white/30 transition"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Price Filter */}
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-white/30 transition"
            >
              <option value="all">All Prices</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>

            {/* Featured Filter */}
            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value)}
              className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-white/30 transition"
            >
              <option value="all">All Templates</option>
              <option value="featured">Featured Only</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-white/30 transition ml-auto"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
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
                setPriceFilter('all');
                setFeaturedFilter('all');
                setSortBy('newest');
              }}
              className="px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 transition"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-7">
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
  const hasActiveLimitedOffer = useMemo(() => {
    if (!template.is_limited_offer || !template.limited_offer_start_date || !template.limited_offer_duration_days) {
      return false;
    }
    const startDate = new Date(template.limited_offer_start_date);
    const durationDays = template.limited_offer_duration_days || 0;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    const now = new Date();
    return endDate > now;
  }, [template.is_limited_offer, template.limited_offer_start_date, template.limited_offer_duration_days]);

  const daysRemaining = useMemo(() => {
    if (!hasActiveLimitedOffer) return null;
    const startDate = new Date(template.limited_offer_start_date!);
    const durationDays = template.limited_offer_duration_days || 0;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    const now = new Date();
    return Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, [hasActiveLimitedOffer, template.limited_offer_start_date, template.limited_offer_duration_days]);

  return (
    <div
      className="bg-zinc-900 rounded-2xl shadow-lg p-3 sm:p-4 flex flex-col items-center transition-all duration-200 relative"
    >
      {hasActiveLimitedOffer && (
        <div className="absolute top-3 left-3 z-20 bg-white text-black px-2 py-1 rounded-lg text-xs font-semibold border border-black/20">
          LIMITED
        </div>
      )}
      <div className="relative w-full h-40 sm:h-48 md:h-40 rounded-xl mb-3 sm:mb-4 overflow-hidden">
        {template.video ? (() => {
          const embedUrl = getYouTubeEmbedUrl(template.video);
          return embedUrl ? (
            <div className="w-full h-full rounded-xl overflow-hidden">
              <iframe
                src={embedUrl}
                title={template.name || 'Template'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : null;
        })() : null}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-white mb-1 text-center">{template.name}</h3>
      {hasActiveLimitedOffer && (
        <div className="mb-2 text-xs text-white font-medium text-center">
          {isSubscribed ? (
            'Only for Subscribed Users'
          ) : (
            daysRemaining !== null ? `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining` : ''
          )}
        </div>
      )}
      {isSubscribed ? (
        <div className="flex gap-2 w-full mt-auto">
          <Link href={`/product/${template.slug}`} className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white text-black font-medium hover:bg-zinc-200 transition text-center">View</Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              onDownload(template.slug);
            }}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-black text-white font-medium border border-white/20 hover:bg-zinc-800 transition text-center"
          >
            Download
          </button>
        </div>
      ) : (
        <Link href={`/product/${template.slug}`} className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm rounded-full bg-white text-black font-medium shadow hover:bg-zinc-200 transition text-center">View Template</Link>
      )}
    </div>
  );
}

