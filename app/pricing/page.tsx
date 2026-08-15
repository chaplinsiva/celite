import type { Metadata } from 'next';
import { Suspense } from 'react';
import PricingContent from './PricingContent';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: "Pricing • Celite - Choose Your Plan",
  description: "Unlock unlimited access to premium After Effects templates. Choose from monthly or yearly subscription plans.",
};

export default function PricingPage() {
  return (
    <main className="bg-[#fcfaf8] pt-4 sm:pt-6 pb-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden text-zinc-900">
      {/* Decorative Ambient Soft Flares */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[140px]" />
        <div className="absolute bottom-20 right-1/4 w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <Suspense fallback={<LoadingSpinnerServer message="Loading pricing..." />}>
          <PricingContent />
        </Suspense>
      </div>
    </main>
  );
}
