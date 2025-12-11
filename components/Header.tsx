"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../context/AppContext';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { ShinyButton } from './ui/shiny-button';
import { Menu, ShoppingCart, User, X } from 'lucide-react';
import PromoBanner from './PromoBanner';

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAppContext();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasCreatorShop, setHasCreatorShop] = useState(false);


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

  const navLinks = [
    { name: 'Video Templates', href: '/templates?category=video-templates' },
    { name: 'Stock Footage', href: '/templates?category=stock-footage' },
    { name: 'Web Templates', href: '/templates?category=web-templates' },
    { name: 'Audio', href: '/templates?category=audio' },
    { name: 'Graphics', href: '/templates?category=graphics' },
  ];

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
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-[14px] font-medium text-zinc-600 hover:text-black transition-colors"
                >
                  {link.name}
                </Link>
              ))}

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
          <div className="lg:hidden absolute top-20 left-0 w-full bg-white border-b border-zinc-100 shadow-xl py-6 px-6 flex flex-col gap-4 animate-in slide-in-from-top-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-lg font-medium text-zinc-800 py-2 border-b border-zinc-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
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
              href="/templates"
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

