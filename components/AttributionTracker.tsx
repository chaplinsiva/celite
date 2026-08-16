// agent-notes: { ctx: "Universal Client component for capturing and syncing visitor touchpoints & customer journey events", deps: ["lib/attribution.ts", "lib/supabaseClient.ts"], state: active, last: "sato@2026-08-16" }
"use client";

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  captureAttribution,
  getStoredAttribution,
  recordProductView,
  EventType,
} from '../lib/attribution';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';

export default function AttributionTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSyncedUserRef = useRef<string | null>(null);
  const lastTrackedPathRef = useRef<string | null>(null);

  // 1. Capture touchpoint on navigation and send granular event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    if (lastTrackedPathRef.current === fullPath) return;
    lastTrackedPathRef.current = fullPath;

    // Capture & update localStorage attribution state
    const attribution = captureAttribution();

    // Determine event type based on path
    let eventType: EventType = 'landing';
    if (pathname === '/' || pathname === '') {
      eventType = 'homepage';
    } else if (pathname.startsWith('/product/')) {
      eventType = 'product_view';
      const slug = pathname.replace('/product/', '').split('/')[0];
      if (slug) {
        recordProductView(slug);
      }
    } else if (pathname.startsWith('/categories') || pathname.startsWith('/templates')) {
      eventType = 'category_view';
    } else if (pathname.startsWith('/pricing') || pathname.startsWith('/plans')) {
      eventType = 'pricing_view';
    } else if (pathname.startsWith('/checkout')) {
      eventType = 'checkout_started';
    }

    // Send touchpoint event stream to server (fire and forget, non-blocking)
    if (attribution) {
      const payload = {
        anonymousId: attribution.anonymousId,
        sessionId: attribution.sessionId,
        eventType,
        path: pathname,
        url: window.location.href,
        touchPoint: attribution.lastTouch,
      };

      try {
        fetch('/api/attribution/track-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {
          // Non-blocking fallback
        });
      } catch {
        // Suppress client network errors
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
