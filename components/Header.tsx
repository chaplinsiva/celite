"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppContext } from '../context/AppContext';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';

export default function Header() {
  const { cartCount, user, logout } = useAppContext();
  const [isSubscribed, setIsSubscribed] = useState(false);

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
        {/* Center: Nav */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <ul className="flex space-x-10 text-[16px] font-light text-zinc-200">
            <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
            <li><Link href="/templates" className="hover:text-white transition-colors">Templates</Link></li>
            <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
            <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
          </ul>
        </div>
        {/* Right: Auth + Cart */}
        <div className="flex items-center space-x-3">
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
              <Link href="/login" className="hidden sm:block text-zinc-300 text-[15px] px-4 py-1.5 rounded-md hover:text-white transition-colors">Login</Link>
              <Link href="/signup" className="bg-white text-black hover:bg-zinc-100 border border-zinc-400 px-5 py-1.5 text-[15px] rounded-full font-medium transition-all">Sign up</Link>
            </>
          )}
        </div>
        {/* Mobile menu: nav in dropdown (future extension). */}
      </nav>
    </header>
    </>
  );
}
