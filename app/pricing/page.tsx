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
    <main className="bg-white min-h-screen pt-20 pb-20 px-4 sm:px-8">
      <Suspense fallback={<LoadingSpinnerServer message="Loading pricing..." />}>
        <PricingContent />
      </Suspense>
    </main>
  );
}
