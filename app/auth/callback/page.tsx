"use client";

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import LoadingSpinner from '../../../components/ui/loading-spinner';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  useEffect(() => {
    const returnParam = searchParams.get('return');
    if (returnParam) {
      setReturnUrl(decodeURIComponent(returnParam));
    }
  }, [searchParams]);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = getSupabaseBrowserClient();
      
      // Handle OAuth callback - Supabase will parse the URL hash/query params
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth callback error:', error);
        router.replace('/login?error=auth_failed');
        return;
      }

      if (session) {
        // Session is set, redirect to return URL or dashboard
        router.replace(returnUrl || '/dashboard');
      } else {
        // Wait a bit for the session to be set (OAuth redirect might be processing)
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            router.replace(returnUrl || '/dashboard');
          } else {
            router.replace('/login?error=session_not_found');
          }
        }, 1000);
      }
    };

    handleAuthCallback();
  }, [router, returnUrl]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Signing you in…</h1>
        <p className="mt-2 text-sm text-zinc-400">Please wait while we finish authentication.</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <AuthCallbackContent />
    </Suspense>
  );
}


