"use client";

import Link from 'next/link';
import { Suspense, useState, useEffect, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import LoadingSpinner from '../../components/ui/loading-spinner';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    
    // Check if we have a hash fragment with recovery token
    const hash = window.location.hash;
    const hasRecoveryToken = hash && hash.includes('type=recovery');
    
    // Set up auth state listener to handle when Supabase processes the hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && hasRecoveryToken)) {
        // Valid recovery session
        setIsValidToken(true);
        // Clear the hash from URL after processing
        if (hasRecoveryToken) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else if (event === 'SIGNED_IN' && session) {
        // User might already have a session
        setIsValidToken(true);
      } else if (event === 'SIGNED_OUT' && !hasRecoveryToken) {
        // No session and no recovery token
        setIsValidToken(false);
      }
    });

    // Also check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (hasRecoveryToken) {
        // If we have recovery token, wait for auth state change
        // The session might not be created yet
        return;
      }
      
      if (session && session.user) {
        setIsValidToken(true);
      } else {
        setIsValidToken(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message || 'Failed to reset password. The link may have expired.');
        setIsSubmitting(false);
      } else {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to reset password. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-black">
        <div className="w-full max-w-md bg-zinc-900/90 p-10 rounded-2xl shadow-2xl mt-24">
          <h2 className="text-2xl font-bold mb-8 text-center text-white">Loading...</h2>
        </div>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-black">
        <div className="w-full max-w-md bg-zinc-900/90 p-10 rounded-2xl shadow-2xl mt-24">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">Invalid Reset Link</h2>
            <p className="text-zinc-300 mb-6">
              This password reset link is invalid or has expired.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/forgot-password"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Request New Reset Link
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-black">
        <div className="w-full max-w-md bg-zinc-900/90 p-10 rounded-2xl shadow-2xl mt-24">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">Password Reset Successful</h2>
            <p className="text-zinc-300 mb-6">
              Your password has been successfully reset. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-black">
      <div className="w-full max-w-md bg-zinc-900/90 p-10 rounded-2xl shadow-2xl mt-24">
        <h2 className="text-2xl font-bold mb-8 text-center text-white">Set New Password</h2>
        <p className="text-sm text-zinc-400 mb-6 text-center">
          Enter your new password below.
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="password"
            name="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-3 rounded-lg bg-zinc-800 text-zinc-100 border border-zinc-800 focus:outline-none focus:border-blue-400 placeholder-zinc-400"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
        {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
        <p className="mt-6 text-center text-zinc-400 text-sm">
          Remember your password?{' '}
          <Link href="/login" className="text-blue-400 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

