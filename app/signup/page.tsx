"use client";

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, type FormEvent } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, user } = useAppContext();
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
    const firstName = (formData.get('first_name') as string) ?? '';
    const lastName = (formData.get('last_name') as string) ?? '';
    const email = (formData.get('email') as string) ?? '';
    const password = (formData.get('password') as string) ?? '';

    const success = await signUp(email, password, firstName, lastName);
    if (success) {
      // Redirect to return URL or home page
      router.push(returnUrl || '/');
    } else {
      setError('Signup failed. Try a different email or password.');
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const callbackUrl = `${window.location.origin}/auth/callback${returnUrl ? `?return=${encodeURIComponent(returnUrl)}` : ''}`;
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl } });
    } catch (e) {
      setError('Google sign-up failed.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-black">
      <div className="w-full max-w-md bg-zinc-900/90 p-10 rounded-2xl shadow-2xl mt-24">
        <h2 className="text-2xl font-bold mb-8 text-center text-white">Create your Celite account</h2>
        {user ? (
          <p className="mb-6 text-center text-sm text-green-300">
            You are logged in as {user.email}.
          </p>
        ) : null}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              name="first_name"
              placeholder="First name"
              className="px-4 py-3 rounded-lg bg-zinc-800 text-zinc-100 border border-zinc-800 focus:outline-none focus:border-blue-400 placeholder-zinc-400"
              autoComplete="given-name"
              required
            />
            <input
              type="text"
              name="last_name"
              placeholder="Last name"
              className="px-4 py-3 rounded-lg bg-zinc-800 text-zinc-100 border border-zinc-800 focus:outline-none focus:border-blue-400 placeholder-zinc-400"
              autoComplete="family-name"
              required
            />
          </div>
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
            autoComplete="new-password"
            minLength={6}
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full py-3 rounded-xl bg-white text-black font-semibold shadow hover:bg-zinc-200 transition disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Signing up...' : 'Sign up'}
          </button>
        </form>
        {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
        <p className="mt-2 text-center text-xs text-zinc-400">Use at least 6 characters. You may need to verify your email.</p>
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
          <button
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition"
            type="button"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M16.365 2.273c-.956.045-2.093.669-2.783 1.465-.605.698-1.147 1.82-.944 2.895h.032c1.076-.016 2.175-.631 2.85-1.417.635-.74 1.124-1.86.845-2.943zm-6.468 8.383c-1.632.046-3.034 1.007-3.838 2.547-.825 1.581-.674 3.653.206 5.491.69 1.477 2.044 3.267 3.559 3.222 1.448-.045 2-.936 3.754-.936 1.749 0 2.247.936 3.773.89 1.563-.03 2.54-1.46 3.226-2.648-.01-.006-2.62-1.003-2.63-3.968-.008-2.482 2.031-3.664 2.123-3.717-1.176-1.716-2.993-1.962-3.633-1.995-1.553-.127-3.02.913-3.749.913-.752 0-2.034-.893-3.235-.849zm-3.106-3.726C5.303 6.473 4.167 7.885 4.049 9.594c-.108 1.546.931 2.55 2.127 2.527 1.012-.02 2.086-.925 2.086-2.488-.025-1.433-1.083-2.54-2.264-2.504z" fill="#fff"/></svg>
            Continue with Apple
          </button>
        </div>
        <p className="mt-6 text-center text-zinc-400 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col justify-center items-center bg-black">
        <div className="w-full max-w-md bg-zinc-900/90 p-10 rounded-2xl shadow-2xl mt-24">
          <h2 className="text-2xl font-bold mb-8 text-center text-white">Loading...</h2>
        </div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
