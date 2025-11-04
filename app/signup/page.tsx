"use client";

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, type FormEvent } from 'react';
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

  const handleResetPassword = () => {
    router.push('/forgot-password');
  };

  const handleCreateAccount = () => {
    router.push('/login');
  };

  if (user) {
    return (
      <div className="fixed inset-0 h-screen w-screen flex flex-col justify-center items-center bg-black">
        <div className="w-full max-w-md bg-black/40 backdrop-blur-sm border border-white/10 p-10 rounded-2xl shadow-2xl">
          <p className="mb-6 text-center text-sm text-green-300">
            You are logged in as {user.email}.
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
      title={<span className="font-light text-white tracking-tighter">Create Your Account</span>}
      description="Join thousands of creators using premium After Effects templates"
      heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
      testimonials={sampleTestimonials}
      onSignIn={handleSubmit}
      onGoogleSignIn={handleGoogle}
      onResetPassword={handleResetPassword}
      onCreateAccount={handleCreateAccount}
      isSubmitting={isSubmitting}
      error={error}
      showRememberMe={false}
      additionalFields={
        <div className="animate-element animate-delay-250 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-zinc-400">First Name</label>
            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
              <input name="first_name" type="text" placeholder="Enter your first name" className="w-full bg-transparent text-white text-sm p-4 rounded-2xl focus:outline-none placeholder-zinc-500" autoComplete="given-name" required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-400">Last Name</label>
            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
              <input name="last_name" type="text" placeholder="Enter your last name" className="w-full bg-transparent text-white text-sm p-4 rounded-2xl focus:outline-none placeholder-zinc-500" autoComplete="family-name" required />
            </div>
          </div>
        </div>
      }
    />
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <SignupContent />
    </Suspense>
  );
}
