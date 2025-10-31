import Pricing from '../../components/Pricing';

export const metadata = {
  title: 'Celite Pricing • Flexible Plans for Creators',
  description: 'Compare Celite pricing tiers and choose the perfect plan for your creative workflow.',
};

export default function PricingPage() {
  return (
    <main className="bg-black min-h-screen pt-24">
      <Pricing />
    </main>
  );
}
