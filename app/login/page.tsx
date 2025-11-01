"use client";

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Suspense, useState, useEffect, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAppContext();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  useEffect(() => {
    const returnParam = searchParams.get('return');
    if (returnParam) {
      setReturnUrl(decodeURIComponent(returnParam));
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = (formData.get('email') as string) ?? '';
    const password = (formData.get('password') as string) ?? '';

    const success = await login(email, password);
    if (success) {
      // Redirect to return URL or home page
      router.push(returnUrl || '/');
    } else {
      setError('Login failed. Check your email and password.');
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const currentReturn = returnUrl || window.location.pathname;
      const callbackUrl = `${window.location.origin}/auth/callback${returnUrl ? `?return=${encodeURIComponent(returnUrl)}` : ''}`;
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl } });
    } catch (e) {
      setError('Google sign-in failed.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-black">
      <div className="w-full max-w-md bg-zinc-900/90 p-10 rounded-2xl shadow-2xl mt-24">
        <h2 className="text-2xl font-bold mb-8 text-center text-white">Login to Celite</h2>
        {user ? (
          <p className="mb-6 text-center text-sm text-green-300">
            You are already logged in as {user.email}.
          </p>
        ) : null}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="px-4 py-3 rounded-lg bg-zinc-800 text-zinc-100 border border-zinc-800 focus:outline-none focus:border-blue-400 placeholder-zinc-400"
            autoComplete="email"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="px-4 py-3 rounded-lg bg-zinc-800 text-zinc-100 border border-zinc-800 focus:outline-none focus:border-blue-400 placeholder-zinc-400"
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-blue-400 hover:underline">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full py-3 rounded-xl bg-white text-black font-semibold shadow hover:bg-zinc-200 transition disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
        {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
        <div className="my-6 flex items-center text-zinc-400 text-sm">
          <div className="flex-1 h-px bg-zinc-700" />
          <span className="px-4">Or</span>
          <div className="flex-1 h-px bg-zinc-700" />
        </div>
        <div className="flex flex-col gap-3">
          <button
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition"
            type="button"
            onClick={handleGoogle}
          >
            <svg height="22" width="22" viewBox="0 0 24 24" fill="none"><path d="M21.6 12.227c0-.818-.073-1.604-.211-2.356H12v4.462h5.433a4.627 4.627 0 0 1-2.006 3.045v2.526h3.24c1.89-1.742 2.993-4.31 2.993-7.677z" fill="#4285F4"/><path d="M12 22c2.7 0 4.967-.89 6.623-2.415l-3.24-2.526c-.898.601-2.043.955-3.383.955-2.604 0-4.81-1.76-5.599-4.127H3.03v2.59A9.998 9.998 0 0 0 12 22z" fill="#34A853"/><path d="M6.401 13.887A5.996 5.996 0 0 1 6 12c0-.654.112-1.289.313-1.887v-2.59H3.031A10.001 10.001 0 0 0 2 12c0 1.585.376 3.085 1.031 4.477l3.37-2.59z" fill="#FBBC05"/><path d="M12 6.544c1.47 0 2.777.506 3.81 1.497l2.857-2.857C16.964 3.508 14.697 2.5 12 2.5A9.997 9.997 0 0 0 3.03 7.523l3.37 2.59c.789-2.367 2.995-4.127 5.6-4.127z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
        </div>
        <p className="mt-6 text-center text-zinc-400 text-sm">
          Don't have an account?{' '}
          <Link href="/signup" className="text-blue-400 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col justify-center items-center bg-black">
        <div className="w-full max-w-md bg-zinc-900/90 p-10 rounded-2xl shadow-2xl mt-24">
          <h2 className="text-2xl font-bold mb-8 text-center text-white">Loading...</h2>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
