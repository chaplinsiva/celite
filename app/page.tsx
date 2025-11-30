import type { Metadata } from 'next';
import Hero from '../components/Hero';
import TemplateCarousel from '../components/TemplateCarousel';
import LatestTemplatesCarousel from '../components/LatestTemplatesCarousel';
import WebsiteShowcaseCarousel from '../components/WebsiteShowcaseCarousel';
import CategoriesSection from '../components/CategoriesSection';
import TestimonialsSection from '../components/TestimonialsSection';
import CTASection from '../components/CTASection';

export const metadata: Metadata = {
  title: "Celite - Professional After Effects Templates",
  description: "Discover premium After Effects templates for logo reveals, slideshows, and more. Join thousands of creators using our templates.",
};

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Home() {
  return (
    <main className="bg-black min-h-screen pt-16">
      <Hero />
      <LatestTemplatesCarousel />
      <TemplateCarousel />
      <WebsiteShowcaseCarousel />
      <CategoriesSection />
      <TestimonialsSection />
      <CTASection />
    </main>
  );
}
