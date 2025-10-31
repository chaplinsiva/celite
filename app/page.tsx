import Hero from '../components/Hero';
import TemplateCarousel from '../components/TemplateCarousel';

export default function Home() {
  return (
    <main className="bg-black min-h-screen pt-16">
      <Hero />
      <TemplateCarousel />
    </main>
  );
}
