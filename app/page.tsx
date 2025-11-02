import Hero from '../components/Hero';
import TemplateCarousel from '../components/TemplateCarousel';
import CategoriesSection from '../components/CategoriesSection';
import StatsSection from '../components/StatsSection';
import TestimonialsSection from '../components/TestimonialsSection';
import CTASection from '../components/CTASection';

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Home() {
  return (
    <main className="bg-black min-h-screen pt-16">
      <Hero />
      <TemplateCarousel />
      <StatsSection />
      <CategoriesSection />
      <TestimonialsSection />
      <CTASection />
    </main>
  );
}
