import Hero from '../components/Hero';
import TemplateCarousel from '../components/TemplateCarousel';
import ShowcasesSection from '../components/ShowcasesSection';

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Home() {
  return (
    <main className="bg-black min-h-screen pt-16">
      <Hero />
      <TemplateCarousel />
      <ShowcasesSection />
    </main>
  );
}
