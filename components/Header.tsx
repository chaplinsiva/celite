"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../context/AppContext';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { Menu, X, Search, ChevronDown } from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { cn } from '../lib/utils';

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

// Helper function to get the correct route for a category
const getCategoryRoute = (categorySlug: string): string => {
  const normalizedSlug = categorySlug.toLowerCase().trim();

  const routeMap: Record<string, string> = {
    'after-effects': '/video-templates',
    'website-templates': '/web-templates',
    'psd-templates': '/graphics',
    'stock-musics': '/stock-musics',
    'stock-images': '/stock-photos',
    'web-templates': '/web-templates',
    'graphics': '/graphics',
    'music': '/stock-musics',
    'audio': '/stock-musics',
    'sound-effects': '/sound-effects',
    'stock-photos': '/stock-photos',
    'video-templates': '/video-templates',
    'ui-templates': '/web-templates',
    '3d-models': '/3d-models',
    'prompts': '/prompts',
  };

  if (routeMap[normalizedSlug]) {
    return routeMap[normalizedSlug];
  }

  // Check for partial matches
  if (normalizedSlug.includes('music') || normalizedSlug.includes('audio')) {
    return '/stock-musics';
  }
  if (normalizedSlug.includes('sfx') || normalizedSlug.includes('sound')) {
    return '/sound-effects';
  }
  if (normalizedSlug.includes('stock') && (normalizedSlug.includes('photo') || normalizedSlug.includes('image'))) {
    return '/stock-photos';
  }
  if (normalizedSlug.includes('web') || normalizedSlug.includes('website') || normalizedSlug.includes('ui')) {
    return '/web-templates';
  }
  if (normalizedSlug.includes('graphic') || normalizedSlug.includes('psd')) {
    return '/graphics';
  }
  if (normalizedSlug.includes('after-effects') || normalizedSlug.includes('video')) {
    return '/video-templates';
  }
  if (normalizedSlug.includes('3d') || normalizedSlug.includes('model')) {
    return '/3d-models';
  }

  return `/video-templates?category=${categorySlug}`;
};

export default function Header() {
  const router = useRouter();
  const { user, isAuthLoading, logout } = useAppContext();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasCreatorShop, setHasCreatorShop] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
  const [activeNavItem, setActiveNavItem] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState({ name: 'All Categories', slug: '' });
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  // Christmas theme: Show festive logo in December
  const isDecember = new Date().getMonth() === 11;


  // Fetch categories, subcategories, and sub-subcategories
  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = getSupabaseBrowserClient();
      try {
        const [catsRes, subcatsRes, subSubcatsRes] = await Promise.all([
          supabase.from('categories').select('id,name,slug').order('name'),
          supabase.from('subcategories').select('id,category_id,name,slug').order('name'),
          supabase.from('sub_subcategories').select('id,subcategory_id,name,slug').order('name'),
        ]);

        if (catsRes.data) {
          // Include all categories in the navbar menu
          setCategories(catsRes.data);
        }
        if (subcatsRes.data) {
          setSubcategories(subcatsRes.data);
        }
        if (subSubcatsRes.data) {
          setSubSubcategories(subSubcatsRes.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const checkSubscriptionAndCreator = async () => {
      if (!user) {
        setIsSubscribed(false);
        setIsExpired(false);
        setHasCreatorShop(false);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('is_active, valid_until')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!sub) {
        setIsSubscribed(false);
        setIsExpired(false);
      } else {
        const now = Date.now();
        const validUntil = sub.valid_until ? new Date(sub.valid_until).getTime() : null;
        const actuallyActive = !!sub.is_active && (!validUntil || validUntil > now);
        const expired: boolean = !!(sub.is_active && validUntil && validUntil <= now);

        setIsSubscribed(actuallyActive);
        setIsExpired(expired);
      }

      // Check if user has a creator shop
      try {
        const { data: shop } = await supabase
          .from('creator_shops')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        setHasCreatorShop(!!shop);
      } catch {
        setHasCreatorShop(false);
      }
    };
    checkSubscriptionAndCreator();
  }, [user]);


  return (
    <>
      <header className="w-full fixed top-0 left-0 z-[100] backdrop-blur-md bg-background/90 border-b border-zinc-100 transition-all duration-300">
        <nav className="max-w-[1440px] mx-auto h-20 px-6 sm:px-8 flex items-center justify-between">
          {/* Left: Logo & Nav */}
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2 focus:outline-none hover:opacity-80 transition-opacity shrink-0">
              <img src={isDecember ? "/chirtsmaslogo.png" : "/logo/logo.png"} alt="Celite Logo" className="h-9 w-auto object-contain" />
              <span className="text-xl font-bold text-zinc-900">Celite</span>
            </Link>

            {/* Global Search Bar */}
            <div className="hidden lg:flex items-center ml-4 bg-zinc-100/80 hover:bg-zinc-100 rounded-full border border-zinc-200/50 transition-all focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:border-blue-600/30 group">
              {/* Category Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                  className="flex items-center gap-1.5 px-4 h-10 text-[13px] font-semibold text-zinc-600 hover:text-black border-r border-zinc-200 transition-colors"
                >
                  <span className="max-w-[100px] truncate">{selectedCategory.name}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isCategoryMenuOpen && "rotate-180")} />
                </button>

                {isCategoryMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-zinc-100 py-2 z-[110] animate-in fade-in zoom-in-95 duration-200">
                    <button
                      onClick={() => {
                        setSelectedCategory({ name: 'All Categories', slug: '' });
                        setIsCategoryMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 transition-colors font-medium text-zinc-700"
                    >
                      All Categories
                    </button>
                    {[
                      { name: 'Video Templates', slug: 'video-templates' },
                      { name: 'Stock Photos', slug: 'stock-images' },
                      { name: 'Music & SFX', slug: 'stock-musics' },
                      { name: 'Web Templates', slug: 'website-templates' },
                      { name: 'Graphics', slug: 'psd-templates' },
                      { name: '3D Models', slug: '3d-models' },
                    ].map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsCategoryMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 transition-colors font-medium text-zinc-700"
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    const route = selectedCategory.slug ? getCategoryRoute(selectedCategory.slug) : '/video-templates';
                    router.push(`${route}?search=${encodeURIComponent(searchQuery)}`);
                  }
                }}
                className="flex items-center flex-1 min-w-[200px] xl:min-w-[350px]"
              >
                <input
                  type="text"
                  placeholder={`Search assets...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 text-[13px] font-medium placeholder:text-zinc-400 px-4"
                />
                <button type="submit" className="p-2 mr-1 rounded-full text-zinc-400 group-hover:text-black transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Creator link (Desktop) - show Start Selling until shop exists, then Creator Dashboard */}
            {!isAuthLoading && user && !hasCreatorShop && (
              <Link
                href="/start-selling"
                className="hidden md:block text-[14px] font-medium text-zinc-500 hover:text-black transition-colors"
              >
                Start Selling
              </Link>
            )}
            {!isAuthLoading && user && hasCreatorShop && (
              <Link
                href="/creator/dashboard"
                className="hidden md:block text-[14px] font-medium text-zinc-500 hover:text-black transition-colors"
              >
                Creator Dashboard
              </Link>
            )}

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              {isAuthLoading ? (
                /* Skeleton loader while auth is loading */
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block w-20 h-9 bg-zinc-100 rounded-full animate-pulse" />
                  <div className="w-8 h-8 sm:w-28 sm:h-10 bg-zinc-100 rounded-lg animate-pulse" />
                </div>
              ) : !user ? (
                <>
                  <Link href="/login" className="hidden sm:block text-[14px] font-medium text-zinc-900 px-4 py-2 hover:bg-zinc-100 rounded-full transition-colors">
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg border-2 border-blue-700 hover:bg-blue-700 hover:border-blue-800 transition-all shadow-sm hover:shadow-md"
                  >
                    Subscribe Now
                  </Link>
                </>
              ) : (
                <>
                  {/* Show Subscribe Now button if user is not subscribed */}
                  {!isSubscribed && (
                    <Link
                      href="/pricing"
                      className="hidden sm:block bg-blue-600 text-white px-4 py-2 text-xs font-semibold rounded-lg border-2 border-blue-700 hover:bg-blue-700 hover:border-blue-800 transition-all shadow-sm hover:shadow-md"
                    >
                      Subscribe Now
                    </Link>
                  )}

                  {/* User Profile */}
                  <Link href="/dashboard" className="relative group">
                    <div className="flex items-center gap-3 pl-3 pr-1 py-1 rounded-full border border-zinc-200 hover:shadow-md transition-all bg-white">
                      <span className="text-xs font-semibold text-zinc-700 hidden sm:block">
                        My Account
                      </span>
                      {isSubscribed ? (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 p-[2px]">
                          <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
                            <span className="font-bold text-xs text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                              {(user.email || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 text-xs font-bold">
                          {(user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden p-2 text-zinc-600 hover:bg-zinc-100 rounded-full"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-20 left-0 w-full bg-background border-b border-zinc-100 shadow-xl py-6 px-6 flex flex-col gap-4 animate-in slide-in-from-top-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
            {/* Mobile nav in specific order */}
            {[
              { name: 'Video Templates', route: '/video-templates', slug: 'video-templates' },
              { name: 'Photos', route: '/stock-photos', slug: 'stock-images' },
              { name: 'Music', route: '/stock-musics', slug: 'stock-musics' },
              { name: 'SFX', route: '/sound-effects', slug: 'sound-effects' },
              { name: 'Web', route: '/web-templates', slug: 'website-templates' },
              { name: 'Graphics', route: '/graphics', slug: 'psd-templates' },
              { name: '3D', route: '/3d-models', slug: '3d-models' },
              { name: 'Prompts', route: '/prompts', slug: 'prompts' },
            ].map((navItem) => {
              const category = categories.find(cat =>
                cat.slug === navItem.slug ||
                cat.name.toLowerCase() === navItem.name.toLowerCase()
              );

              if (!category) return null;

              const categorySubcategories = subcategories.filter(
                sub => sub.category_id === category.id
              );

              return (
                <div key={navItem.slug} className="border-b border-zinc-50 pb-2">
                  <Link
                    href={navItem.route}
                    className="text-lg font-semibold text-zinc-900 py-2 block"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {navItem.name}
                  </Link>
                  {categorySubcategories.length > 0 && (
                    <div className="ml-4 mt-2 space-y-1">
                      {categorySubcategories.map((subcategory) => (
                        <Link
                          key={subcategory.id}
                          href={`${navItem.route}?subcategory=${subcategory.slug}`}
                          className="text-xs text-zinc-600 py-0.5 block hover:text-zinc-900"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {subcategory.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {!isAuthLoading && user && !hasCreatorShop && (
              <Link
                href="/start-selling"
                className="text-lg font-medium text-zinc-500 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Start Selling
              </Link>
            )}
            {!isAuthLoading && user && hasCreatorShop && (
              <Link
                href="/creator/dashboard"
                className="text-lg font-medium text-zinc-500 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Creator Dashboard
              </Link>
            )}
            <Link
              href="/video-templates"
              className="text-lg font-medium text-zinc-800 py-2 border-b border-zinc-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Search Templates
            </Link>
            {!isAuthLoading && !user && (
              <Link
                href="/login"
                className="text-lg font-medium text-zinc-800 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log in
              </Link>
            )}
          </div>
        )}
      </header>
    </>
  );
}

