"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import PromoBanner from './PromoBanner';
import { useAppContext } from '../context/AppContext';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAppContext();
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Removed hideLayout - header should show on all pages including login/signup


  // Load maintenance flag once on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/maintenance', { cache: 'no-store' });
        const json = await res.json();
        if (res.ok && json.ok) {
          setMaintenance(!!json.maintenance);
        } else {
          setMaintenance(false);
        }
      } catch {
        setMaintenance(false);
      }
    };
    load();
  }, []);

  // Check if current user is admin (only if maintenance is enabled)
  useEffect(() => {
    const checkAdmin = async () => {
      if (!maintenance || !user) {
        setIsAdmin(false);
        return;
      }
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        setIsAdmin(!!data);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [maintenance, user]);

  // During maintenance, block the site for non-admin users (except auth routes)
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/auth');

  // Check for admin / creator routes that use their own layout
  const isAdminPage = pathname.startsWith('/admin') || pathname.startsWith('/creator');

  if (maintenance && !isAdmin && !isAuthRoute) {
    return (
      <main className="bg-white min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">
            Celite is on maintenance mode
          </h1>
          <p className="text-zinc-500 mb-6">
            Please check back later. You can still sign in to your account once maintenance is over.
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            Go to Login
          </a>
        </div>
      </main>
    );
  }

  // Admin pages: Render without public layout
  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <div className="isolate flex flex-col min-h-screen">
      <Header />
      <div className="mt-20">
        <PromoBanner />
      </div>
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

