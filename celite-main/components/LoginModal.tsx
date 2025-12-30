'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    const returnUrl = encodeURIComponent(currentPath);
    router.push(`/login?return=${returnUrl}`);
    onClose();
  };

  const handleSignup = () => {
    const currentPath = window.location.pathname + window.location.search;
    const returnUrl = encodeURIComponent(currentPath);
    router.push(`/signup?return=${returnUrl}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-2xl shadow-xl border border-white/10 p-6 sm:p-8 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Sign in to continue</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-zinc-400 text-sm mb-6">
          You need to sign in to access this feature. Sign in to continue and we'll bring you back here.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleLogin}
            className="flex-1 px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={handleSignup}
            className="flex-1 px-6 py-3 rounded-full border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}

