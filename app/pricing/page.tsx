import type { Metadata } from 'next';
import { Suspense } from 'react';
import PricingContent from './PricingContent';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: "Pricing • Celite - Choose Your Plan",
  description: "Unlock unlimited access to premium After Effects templates. Choose from weekly, monthly, or yearly subscription plans.",
};

export default function PricingPage() {
  return (
    <main className="bg-black min-h-screen pt-24 pb-20 px-4 sm:px-8 text-white relative">
      {/* Colorful Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      <div className="relative">
        <Suspense fallback={<LoadingSpinnerServer message="Loading pricing..." />}>
          <PricingContent />
        </Suspense>
      </div>
    </main>
  );
}
