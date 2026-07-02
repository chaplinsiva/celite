"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import CategoryNav from './CategoryNav';
import Footer from './Footer';
import PromoBanner from './PromoBanner';
import { useAppContext } from '../context/AppContext';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAppContext();
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCreator, setIsCreator] = useState<boolean>(false);

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

  // Check if current user is admin or creator (only if maintenance is enabled)
  useEffect(() => {
    const checkAdminOrCreator = async () => {
      if (!maintenance || !user) {
        setIsAdmin(false);
        setIsCreator(false);
        return;
      }
      try {
        const supabase = getSupabaseBrowserClient();

        // Check admin status
        const { data: adminData } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        setIsAdmin(!!adminData);

        // Check creator/vendor status
        const { data: creatorData } = await supabase
          .from('creator_shops')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        setIsCreator(!!creatorData);
      } catch {
        setIsAdmin(false);
        setIsCreator(false);
      }
    };
    checkAdminOrCreator();
  }, [maintenance, user]);

  // During maintenance, block the site for non-admin and non-creator users (except auth routes)
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/auth');

  // Check for admin / creator routes that use their own layout
  const isAdminPage = pathname.startsWith('/admin') || pathname.startsWith('/creator');

  // Allow access if user is admin OR creator during maintenance
  if (maintenance && !isAdmin && !isCreator && !isAuthRoute) {
    return (
      <main className="bg-white min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-6">
            We're Under Maintenance
          </h1>
          <p className="text-lg text-zinc-700 mb-4">
            Our site will be back online before December 18, 2025.
          </p>
          <p className="text-base text-zinc-600 mb-4">
            For subscribed users: Don't worry, we will extend your subscription days accordingly.
          </p>
          <p className="text-base text-zinc-600 mb-8">
            More templates are coming soon.
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            Login
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
      <CategoryNav />
      <div className="lg:mt-[140px] mt-24">
        <PromoBanner />
      </div>
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

