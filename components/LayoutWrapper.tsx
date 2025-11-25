"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import { useAppContext } from '../context/AppContext';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAppContext();
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const hideLayout =
    pathname === '/login' ||
    pathname === '/signup';

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

  if (maintenance && !isAdmin && !isAuthRoute) {
    return (
      <main className="bg-black min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Celite is on maintenance mode
          </h1>
          <p className="text-zinc-400 mb-6">
            Please check back later. You can still sign in to your account once maintenance is over.
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition"
          >
            Go to Login
          </a>
        </div>
      </main>
    );
  }

  if (hideLayout) {
    return <>{children}</>;
  }

  return (
    <div className="isolate flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

