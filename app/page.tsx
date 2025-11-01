import Hero from '../components/Hero';
import TemplateCarousel from '../components/TemplateCarousel';
import ShowcasesSection from '../components/ShowcasesSection';
import TemplatesSection from '../components/TemplatesSection';

export default function Home() {
  return (
    <main className="bg-black min-h-screen pt-16">
      <Hero />
      <TemplateCarousel />
      <ShowcasesSection />
      <TemplatesSection />
    </main>
  );
}
