"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppContext } from '../context/AppContext';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { NavBar } from './ui/tubelight-navbar';
import { Home, LayoutGrid, Info, DollarSign, Mail } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { cartCount, user, logout } = useAppContext();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    { name: 'Home', url: '/', icon: Home },
    { name: 'Templates', url: '/templates', icon: LayoutGrid },
    { name: 'About', url: '/about', icon: Info },
    { name: 'Pricing', url: '/pricing', icon: DollarSign },
    { name: 'Contact', url: '/contact', icon: Mail },
  ];

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

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gradient-border {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}} />
      <header className="w-full fixed top-0 left-0 z-30 backdrop-blur bg-black/70 shadow-lg">
      <nav className="max-w-7xl mx-auto h-16 px-4 sm:px-8 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center py-1 px-1 focus:outline-none hover:opacity-80 transition-opacity">
          <Image src="/Logo.png" alt="Celite Logo" width={120} height={32} priority className="h-8 w-auto" />
        </Link>
        {/* Center: Nav - Using Tubelight Navbar */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <NavBar items={navItems} />
        </div>
        {/* Right: Auth + Cart + Mobile Menu */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Desktop: Cart + Auth */}
          <div className="hidden md:flex items-center space-x-3">
            <Link
              href="/cart"
              className="relative inline-flex items-center rounded-full border border-white/15 px-3 py-1.5 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
              aria-label="Cart"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                <path d="M7 4h-2l-1 2H1v2h2l3.6 7.59L5.25 18c-.41.75-.13 1.68.62 2.09.75.41 1.68.13 2.09-.62L9 16h7c.75 0 1.41-.41 1.75-1.03L21.58 7H6.42l-.7-1.4L7 4zm2 14a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4z"/>
              </svg>
              <span className="ml-2 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-white/20 px-2 text-xs font-semibold text-white">
                {cartCount}
              </span>
            </Link>
            {user ? (
              <Link href="/dashboard" className="relative group">
                {isSubscribed ? (
                  <div 
                    className="h-8 w-8 rounded-full flex items-center justify-center font-semibold uppercase cursor-pointer relative"
                    style={{
                      padding: '2px',
                      background: 'linear-gradient(90deg, #ec4899, #3b82f6, #ec4899, #3b82f6)',
                      backgroundSize: '200% 200%',
                      animation: 'gradient-border 3s ease infinite',
                    }}
                  >
                    <span className="relative z-10 bg-black rounded-full w-full h-full flex items-center justify-center text-white">
                      {(user.email || '?').charAt(0)}
                    </span>
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center font-semibold uppercase cursor-pointer hover:bg-zinc-200 transition-colors">
                    {(user.email || '?').charAt(0)}
                  </div>
                )}
                <div className="pointer-events-none absolute right-0 mt-2 hidden flex-col rounded-xl border border-white/15 bg-black/90 p-2 text-sm text-white shadow-lg group-hover:flex group-hover:pointer-events-auto">
                  <span className="px-3 py-1.5 rounded-lg">Dashboard</span>
                </div>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-zinc-300 text-[15px] px-4 py-1.5 rounded-md hover:text-white transition-colors">Login</Link>
                <Link href="/signup" className="bg-white text-black hover:bg-zinc-100 border border-zinc-400 px-5 py-1.5 text-[15px] rounded-full font-medium transition-all">Sign up</Link>
              </>
            )}
          </div>
          
          {/* Mobile: Cart Icon */}
          <Link
            href="/cart"
            className="md:hidden relative inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-white/10 transition-colors"
            aria-label="Cart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
              <path d="M7 4h-2l-1 2H1v2h2l3.6 7.59L5.25 18c-.41.75-.13 1.68.62 2.09.75.41 1.68.13 2.09-.62L9 16h7c.75 0 1.41-.41 1.75-1.03L21.58 7H6.42l-.7-1.4L7 4zm2 14a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4z"/>
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white/90 px-1.5 text-xs font-semibold text-black">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
          
          {/* Mobile: Profile Icon */}
          {user && (
            <Link
              href="/dashboard"
              className="md:hidden relative inline-flex items-center justify-center"
            >
              {isSubscribed ? (
                <div 
                  className="h-8 w-8 rounded-full flex items-center justify-center font-semibold uppercase cursor-pointer relative"
                  style={{
                    padding: '2px',
                    background: 'linear-gradient(90deg, #ec4899, #3b82f6, #ec4899, #3b82f6)',
                    backgroundSize: '200% 200%',
                    animation: 'gradient-border 3s ease infinite',
                  }}
                >
                  <span className="relative z-10 bg-black rounded-full w-full h-full flex items-center justify-center text-white text-sm">
                    {(user.email || '?').charAt(0)}
                  </span>
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center font-semibold uppercase cursor-pointer hover:bg-zinc-200 transition-colors text-sm">
                  {(user.email || '?').charAt(0)}
                </div>
              )}
            </Link>
          )}
          
          {/* Mobile: Hamburger Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>
        
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Mobile Menu */}
            <div className="fixed top-16 left-0 right-0 bg-black/95 backdrop-blur-lg border-b border-white/10 shadow-xl z-40 md:hidden">
              <nav className="px-4 py-6">
                {/* Mobile Navigation Links */}
                <ul className="flex flex-col space-y-4 mb-6">
                  <li>
                    <Link
                      href="/"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block text-white text-base font-medium py-2 hover:text-zinc-300 transition-colors"
                    >
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/templates"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block text-white text-base font-medium py-2 hover:text-zinc-300 transition-colors"
                    >
                      Templates
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/about"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block text-white text-base font-medium py-2 hover:text-zinc-300 transition-colors"
                    >
                      About
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/pricing"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block text-white text-base font-medium py-2 hover:text-zinc-300 transition-colors"
                    >
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block text-white text-base font-medium py-2 hover:text-zinc-300 transition-colors"
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
                
                {/* Mobile Cart */}
                <Link
                  href="/cart"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition-colors mb-4"
                >
                  <div className="flex items-center space-x-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                      <path d="M7 4h-2l-1 2H1v2h2l3.6 7.59L5.25 18c-.41.75-.13 1.68.62 2.09.75.41 1.68.13 2.09-.62L9 16h7c.75 0 1.41-.41 1.75-1.03L21.58 7H6.42l-.7-1.4L7 4zm2 14a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4z"/>
                    </svg>
                    <span className="text-white font-medium">Cart</span>
                  </div>
                  <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-white/20 px-2 text-xs font-semibold text-white">
                    {cartCount}
                  </span>
                </Link>
                
                {/* Mobile Auth */}
                {user ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center w-full px-4 py-3 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-white font-medium">Dashboard</span>
                  </Link>
                ) : (
                  <div className="flex flex-col space-y-3">
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center w-full px-4 py-3 rounded-lg text-zinc-300 border border-white/15 hover:text-white hover:border-white transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center w-full px-4 py-3 rounded-lg bg-white text-black font-medium hover:bg-zinc-100 transition-colors"
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </>
        )}
      </nav>
    </header>
    </>
  );
}
