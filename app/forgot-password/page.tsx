"use client";

import Link from 'next/link';
import { Suspense, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import LoadingSpinner from '../../components/ui/loading-spinner';

function ForgotPasswordContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = getSupabaseBrowserClient();
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setError(error.message);
        setIsSubmitting(false);
      } else {
        setSuccess(true);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to send reset link. Please try again.');
      setIsSubmitting(false);
    }
  };

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
            <h2 className="text-2xl font-bold mb-4 text-white">Check your email</h2>
            <p className="text-zinc-300 mb-6">
              We've sent a password reset link to <span className="font-semibold text-white">{email}</span>
            </p>
            <p className="text-sm text-zinc-400 mb-6">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-black">
      <div className="w-full max-w-md bg-zinc-900/90 p-10 rounded-2xl shadow-2xl mt-24">
        <h2 className="text-2xl font-bold mb-8 text-center text-white">Reset Password</h2>
        <p className="text-sm text-zinc-400 mb-6 text-center">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-3 rounded-lg bg-zinc-800 text-zinc-100 border border-zinc-800 focus:outline-none focus:border-blue-400 placeholder-zinc-400"
            autoComplete="email"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full py-3 rounded-xl bg-white text-black font-semibold shadow hover:bg-zinc-200 transition disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}

