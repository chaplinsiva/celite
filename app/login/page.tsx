"use client";

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Suspense, useState, useEffect, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { SignInPage, Testimonial } from '../../components/ui/sign-in';
import LoadingSpinner from '../../components/ui/loading-spinner';

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
    name: "Sarah Chen",
    handle: "@sarahdigital",
    text: "Amazing platform! The user experience is seamless and the features are exactly what I needed."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
    name: "Marcus Johnson",
    handle: "@marcustech",
    text: "This service has transformed how I work. Clean design, powerful features, and excellent support."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80",
    name: "David Martinez",
    handle: "@davidcreates",
    text: "I've tried many platforms, but this one stands out. Intuitive, reliable, and genuinely helpful for productivity."
  },
];

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

  const handleResetPassword = () => {
    router.push('/forgot-password');
  };

  const handleCreateAccount = () => {
    router.push('/signup');
  };

  if (user) {
    return (
      <div className="fixed inset-0 h-screen w-screen flex flex-col justify-center items-center bg-black">
        <div className="w-full max-w-md bg-black/40 backdrop-blur-sm border border-white/10 p-10 rounded-2xl shadow-2xl">
          <p className="mb-6 text-center text-sm text-green-300">
            You are already logged in as {user.email}.
          </p>
          <Link href="/" className="block w-full text-center py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SignInPage
      title={<span className="font-light text-white tracking-tighter">Welcome to Celite</span>}
      description="Access your account and continue your journey with premium After Effects templates"
      heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
      testimonials={sampleTestimonials}
      onSignIn={handleSubmit}
      onGoogleSignIn={handleGoogle}
      onResetPassword={handleResetPassword}
      onCreateAccount={handleCreateAccount}
      isSubmitting={isSubmitting}
      error={error}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <LoginContent />
    </Suspense>
  );
}
