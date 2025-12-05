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
    <main className="bg-gradient-to-br from-purple-50/30 via-white to-blue-50/30 min-h-screen pt-20 pb-20 px-4 sm:px-8 relative">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
      </div>
      <div className="relative">
        <Suspense fallback={<LoadingSpinnerServer message="Loading pricing..." />}>
          <PricingContent />
        </Suspense>
      </div>
    </main>
  );
}
