"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../context/AppContext';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { Menu, X } from 'lucide-react';
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
      <header className="w-full fixed top-0 left-0 z-50 backdrop-blur-md bg-white/90 border-b border-zinc-100 transition-all duration-300">
        <nav className="max-w-[1440px] mx-auto h-20 px-6 sm:px-8 flex items-center justify-between">
          {/* Left: Logo & Nav */}
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2 focus:outline-none hover:opacity-80 transition-opacity">
              <img src={isDecember ? "/chirtsmaslogo.png" : "/logo/logo.png"} alt="Celite Logo" className="h-9 w-auto object-contain" />
              <span className="text-xl font-bold text-zinc-900">Celite</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-4">
              <NavigationMenu>
                <NavigationMenuList className="gap-1">
                  {/* Define the order for main categories */}
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
                    // Find the category
                    const category = categories.find(cat =>
                      cat.slug === navItem.slug ||
                      cat.name.toLowerCase() === navItem.name.toLowerCase()
                    );

                    if (!category) return null;

                    const categorySubcategories = subcategories.filter(
                      sub => sub.category_id === category.id
                    );
                    const categoryRoute = getCategoryRoute(category.slug);

                    return (
                      <NavigationMenuItem key={category.id}>
                        {categorySubcategories.length > 0 ? (
                          <>
                            <NavigationMenuTrigger className="text-sm font-medium">
                              {navItem.name}
                            </NavigationMenuTrigger>
                            <NavigationMenuContent>
                              <div className="grid gap-3 p-4 md:w-[500px] lg:w-[600px] lg:grid-cols-[.75fr_1fr]">
                                <div className="row-span-3">
                                  <NavigationMenuLink asChild>
                                    <a
                                      className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                                      href={categoryRoute}
                                    >
                                      <div className="mb-2 mt-4 text-lg font-medium">
                                        {navItem.name}
                                      </div>
                                      <p className="text-sm leading-tight text-muted-foreground">
                                        Browse our collection
                                      </p>
                                      <div className="mt-4 aspect-video rounded-md overflow-hidden relative">
                                        <img
                                          src={
                                            {
                                              'Video Templates': 'https://images.unsplash.com/photo-1536240478700-b869070f9279?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=225&q=80',
                                              'Photos': 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=225&q=80',
                                              'Music': 'https://images.unsplash.com/photo-1514888891-18e7d9652a92?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=225&q=80',
                                              'SFX': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=225&q=80',
                                              'Web': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=225&q=80',
                                              'Graphics': 'https://images.unsplash.com/photo-1626785774573-4b799315345d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=225&q=80',
                                              '3D': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=225&q=80',
                                              'Prompts': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=225&q=80'
                                            }[navItem.name] || 'https://images.unsplash.com/photo-1581291518633-83b4ebbf27b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=225&q=80'
                                          }
                                          alt={`Stock ${navItem.name}`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            const parent = e.currentTarget.parentElement;
                                            if (parent) {
                                              const fallbackIcon = parent.querySelector('.fallback-icon');
                                              if (fallbackIcon) {
                                                (fallbackIcon as HTMLElement).style.display = 'flex';
                                              }
                                            }
                                          }}
                                        />
                                        <div className="fallback-icon absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 hidden">
                                          {navItem.name === 'Video Templates' ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                                              <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                                            </svg>
                                          ) : navItem.name === 'Photos' ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                              <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                              <path d="M21 15l-5-5L5 21"></path>
                                            </svg>
                                          ) : navItem.name === 'Music' ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                                              <path d="M9 18V5l12-2v13"></path>
                                              <circle cx="6" cy="18" r="3"></circle>
                                              <circle cx="18" cy="16" r="3"></circle>
                                            </svg>
                                          ) : navItem.name === 'SFX' ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                                              <path d="M3 15v-6h4l5 5v-5h2m0 0v6m0-6v6m0-6h4l1 1v4m-1 0h-4"></path>
                                              <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"></path>
                                            </svg>
                                          ) : navItem.name === 'Web' ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                                              <circle cx="12" cy="12" r="10"></circle>
                                              <line x1="2" y1="12" x2="22" y2="12"></line>
                                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                            </svg>
                                          ) : navItem.name === 'Graphics' ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                              <line x1="8" y1="21" x2="16" y2="21"></line>
                                              <line x1="12" y1="17" x2="12" y2="21"></line>
                                            </svg>
                                          ) : navItem.name === '3D' ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                              <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                            </svg>
                                          ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                                              <path d="M12 8a5 5 0 0 1 5 5c0 2.76-2.5 5.24-5 5.8V22h-2v-3.2c-2.5-.6-5-3.08-5-5.8a5 5 0 0 1 5-5z"></path>
                                              <path d="M8.5 11.5 12 8l3.5 3.5"></path>
                                            </svg>
                                          )}
                                        </div>
                                      </div>
                                    </a>
                                  </NavigationMenuLink>
                                </div>
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    {categorySubcategories.slice(0, 4).map((subcategory) => {
                                      const subSubcats = subSubcategories.filter(
                                        ss => ss.subcategory_id === subcategory.id
                                      );

                                      return (
                                        <div key={subcategory.id} className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                                          <NavigationMenuLink
                                            href={`${categoryRoute}?subcategory=${subcategory.slug}`}
                                            className="text-sm font-medium leading-none peer-data-[state=active]:text-accent-foreground"
                                          >
                                            {subcategory.name}
                                          </NavigationMenuLink>
                                          {subSubcats.length > 0 && (
                                            <ul className="mt-2 space-y-1 ml-2 border-l border-zinc-200 pl-2">
                                              {subSubcats.slice(0, 3).map((subSubcat) => (
                                                <li key={subSubcat.id}>
                                                  <NavigationMenuLink
                                                    href={`${categoryRoute}?subcategory=${subcategory.slug}&subsubcategory=${subSubcat.slug}`}
                                                    className="block select-none space-y-1 rounded-md p-1 no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-xs"
                                                  >
                                                    {subSubcat.name}
                                                  </NavigationMenuLink>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {categorySubcategories.length > 4 && (
                                    <div className="pt-2 border-t border-zinc-200">
                                      <NavigationMenuLink
                                        href={categoryRoute}
                                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                                      >
                                        + {categorySubcategories.length - 4} more categories →
                                      </NavigationMenuLink>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </NavigationMenuContent>
                          </>
                        ) : (
                          <NavigationMenuLink href={categoryRoute} className="text-sm font-medium">
                            {navItem.name}
                          </NavigationMenuLink>
                        )}
                      </NavigationMenuItem>
                    );
                  })}
                </NavigationMenuList>
              </NavigationMenu>
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
          <div className="lg:hidden absolute top-20 left-0 w-full bg-white border-b border-zinc-100 shadow-xl py-6 px-6 flex flex-col gap-4 animate-in slide-in-from-top-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
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

