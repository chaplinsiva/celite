// agent-notes: { ctx: "Client component for capturing and syncing visitor attribution", deps: ["lib/attribution.ts", "lib/supabaseClient.ts"], state: active, last: "sato@2026-08-14" }
"use client";

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { captureAttribution, getStoredAttribution, recordProductView } from '../lib/attribution';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';

export default function AttributionTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSyncedUserRef = useRef<string | null>(null);

  // 1. Capture touchpoint on navigation or URL param change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    captureAttribution();

    // If on a product page, record the product view
    if (pathname && pathname.startsWith('/product/')) {
      const slug = pathname.replace('/product/', '').split('/')[0];
      if (slug) {
        recordProductView(slug);
      }
    }
  }, [pathname, searchParams]);

  // 2. Sync attribution with backend when user is authenticated
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const syncUserAttribution = async (userId: string, accessToken: string) => {
      if (lastSyncedUserRef.current === userId) return;
      const attribution = getStoredAttribution();
      if (!attribution) return;

      try {
        const res = await fetch('/api/attribution/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ attribution }),
        });
        if (res.ok) {
          lastSyncedUserRef.current = userId;
        }
      } catch (err) {
        console.warn('Failed to sync attribution on auth:', err);
      }
    };

    // Check initial session
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user && data?.session?.access_token) {
        syncUserAttribution(data.session.user.id, data.session.access_token);
      }
    });

    // Subscribe to auth state transitions
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && session?.access_token) {
        syncUserAttribution(session.user.id, session.access_token);
      } else if (!session) {
        lastSyncedUserRef.current = null;
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return null;
}
