"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../context/AppContext';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { Menu, X } from 'lucide-react';
import { Menu as NavMenu, MenuItem, HoveredLink } from './ui/navbar-menu';
import { motion } from 'framer-motion';
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
    'musics-and-sfx': '/music-sfx',
    'stock-images': '/stock-photos',
    'web-templates': '/web-templates',
    'graphics': '/graphics',
    'music': '/music-sfx',
    'audio': '/music-sfx',
    'sound-effects': '/music-sfx',
    'stock-photos': '/stock-photos',
    'video-templates': '/video-templates',
    'ui-templates': '/web-templates',
    '3d-models': '/3d-models',
  };
  
  if (routeMap[normalizedSlug]) {
    return routeMap[normalizedSlug];
  }
  
  // Check for partial matches
  if (normalizedSlug.includes('music') || normalizedSlug.includes('audio') || normalizedSlug.includes('sfx') || normalizedSlug.includes('sound')) {
    return '/music-sfx';
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
  const { user, logout } = useAppContext();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasCreatorShop, setHasCreatorShop] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
  const [activeNavItem, setActiveNavItem] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);


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
              <img src="/logo/logo.png" alt="Celite Logo" className="h-9 w-auto object-contain" />
              <span className="text-xl font-bold text-zinc-900">Celite</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-6">
              {categories.length > 0 ? (
                <NavMenu setActive={setActiveNavItem} className="relative flex items-center gap-6">
                  {/* Define the order for main categories */}
                  {[
                    { name: 'Video Templates', route: '/video-templates', slug: 'video-templates' },
                    { name: 'Stock Images', route: '/stock-photos', slug: 'stock-images' },
                    { name: 'Music & SFX', route: '/music-sfx', slug: 'musics-and-sfx' },
                    { name: 'Web Templates', route: '/web-templates', slug: 'website-templates' },
                    { name: 'Graphics', route: '/graphics', slug: 'psd-templates' },
                    { name: '3D Models', route: '/3d-models', slug: '3d-models' },
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
                      <MenuItem
                        key={category.id}
                        setActive={setActiveNavItem}
                        active={activeNavItem}
                        item={navItem.name}
                        className="relative"
                      >
                        {categorySubcategories.length > 0 ? (
                          <div className="flex flex-col space-y-1 text-sm min-w-[200px]">
                            {/* Show subcategories with nested sub-subcategories on hover */}
                            {categorySubcategories.map((subcategory) => {
                              const subSubcats = subSubcategories.filter(
                                ss => ss.subcategory_id === subcategory.id
                              );
                              
                              return (
                                <div
                                  key={subcategory.id}
                                  className="relative group/subcat"
                                  onMouseEnter={() => setActiveSubcategory(subcategory.id)}
                                  onMouseLeave={() => setActiveSubcategory(null)}
                                >
                                  <HoveredLink
                                    href={`${categoryRoute}?subcategory=${subcategory.slug}`}
                                    className="block py-1.5 px-2 rounded hover:bg-zinc-50"
                                  >
                                    {subcategory.name}
                                  </HoveredLink>
                                  {/* Show sub-subcategories on hover - positioned to the right */}
                                  {subSubcats.length > 0 && activeSubcategory === subcategory.id && (
                                    <div className="absolute left-full top-0 ml-2 z-50">
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.9, x: -10 }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="bg-white dark:bg-black backdrop-blur-sm rounded-lg border border-zinc-200 dark:border-white/[0.2] shadow-xl p-3 min-w-[180px]"
                                      >
                                        <div className="flex flex-col space-y-1">
                                          {subSubcats.map((subSubcat) => (
                                            <HoveredLink
                                              key={subSubcat.id}
                                              href={`${categoryRoute}?subcategory=${subcategory.slug}&subsubcategory=${subSubcat.slug}`}
                                              className="block py-1.5 px-2 rounded hover:bg-zinc-50 text-xs"
                                            >
                                              {subSubcat.name}
                                            </HoveredLink>
                                          ))}
                                        </div>
                                      </motion.div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm">
                            <HoveredLink href={categoryRoute}>
                              View {category.name}
                            </HoveredLink>
                          </div>
                        )}
                      </MenuItem>
                    );
                  })}
                </NavMenu>
              ) : null}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Creator link (Desktop) - show Start Selling until shop exists, then Creator Dashboard */}
            {user && !hasCreatorShop && (
              <Link
                href="/start-selling"
                className="hidden md:block text-[14px] font-medium text-zinc-500 hover:text-black transition-colors mr-2"
              >
              Start Selling
            </Link>
            )}
            {user && hasCreatorShop && (
              <Link
                href="/creator/dashboard"
                className="hidden md:block text-[14px] font-medium text-zinc-500 hover:text-black transition-colors mr-2"
              >
                Creator Dashboard
              </Link>
            )}

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              {!user ? (
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
                    <div className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full border border-zinc-200 hover:shadow-md transition-all bg-white">
                      <span className="text-xs font-semibold text-zinc-700 pl-2 hidden sm:block">
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
              { name: 'Stock Images', route: '/stock-photos', slug: 'stock-images' },
              { name: 'Music & SFX', route: '/music-sfx', slug: 'musics-and-sfx' },
              { name: 'Web Templates', route: '/web-templates', slug: 'website-templates' },
              { name: 'Graphics', route: '/graphics', slug: 'psd-templates' },
              { name: '3D Models', route: '/3d-models', slug: '3d-models' },
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
                          className="text-sm text-zinc-600 py-1 block hover:text-zinc-900"
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
            {user && !hasCreatorShop && (
            <Link
              href="/start-selling"
              className="text-lg font-medium text-zinc-500 py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Start Selling
            </Link>
            )}
            {user && hasCreatorShop && (
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
            {!user && (
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

