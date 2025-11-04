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
    const supabase = getSupabaseBrowserClient();
    // Supabase will parse the URL hash and store the session
    supabase.auth.getSession().then(() => {
      // Redirect to return URL or dashboard
      router.replace(returnUrl || '/dashboard');
    });
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


