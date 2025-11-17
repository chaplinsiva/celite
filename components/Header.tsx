"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppContext } from '../context/AppContext';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { ShinyButton } from './ui/shiny-button';

export default function Header() {
  const { user, logout } = useAppContext();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setIsSubscribed(false);
        setIsExpired(false);
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
        return;
      }
      
      const now = Date.now();
      const validUntil = sub.valid_until ? new Date(sub.valid_until).getTime() : null;
      const actuallyActive = !!sub.is_active && (!validUntil || validUntil > now);
      const expired: boolean = !!(sub.is_active && validUntil && validUntil <= now);
      
      setIsSubscribed(actuallyActive);
      setIsExpired(expired);
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
        {/* Right: Subscribe + Auth + Mobile Menu */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Desktop: Subscribe + Auth */}
          <div className="hidden md:flex items-center space-x-3">
            {!isSubscribed && (
              <Link href={user ? "/pricing" : "/signup"} className="no-underline">
                <ShinyButton className="!px-5 !py-2 !text-sm">
                  {user ? "Subscribe Now" : "Start Free"}
                </ShinyButton>
              </Link>
            )}
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
                ) : isExpired ? (
                  <div className="h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center font-semibold uppercase cursor-pointer hover:bg-red-600 transition-colors">
                    {(user.email || '?').charAt(0)}
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
              <Link href="/login" className="text-zinc-300 text-[15px] px-4 py-1.5 rounded-md hover:text-white transition-colors">Login</Link>
            )}
          </div>
          
          {/* Mobile: Subscribe Button */}
          {!isSubscribed && (
            <Link href={user ? "/pricing" : "/signup"} className="md:hidden no-underline">
              <ShinyButton className="!px-4 !py-2 !text-xs">
                {user ? "Subscribe" : "Start Free"}
              </ShinyButton>
            </Link>
          )}
          
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
              ) : isExpired ? (
                <div className="h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center font-semibold uppercase cursor-pointer hover:bg-red-600 transition-colors text-sm">
                  {(user.email || '?').charAt(0)}
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center font-semibold uppercase cursor-pointer hover:bg-zinc-200 transition-colors text-sm">
                  {(user.email || '?').charAt(0)}
                </div>
              )}
            </Link>
          )}
        </div>
      </nav>
    </header>
    </>
  );
}
