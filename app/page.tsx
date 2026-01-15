import type { Metadata } from 'next';
import Hero from '../components/Hero';
import CinemaTemplatesShowcase from '../components/CinemaTemplatesShowcase';
import RoyaltyFreeMusicShowcase from '../components/RoyaltyFreeMusicShowcase';
import SfxShowcase from '../components/SfxShowcase';
import LatestTemplatesCarousel from '../components/LatestTemplatesCarousel';
import WebsiteShowcaseCarousel from '../components/WebsiteShowcaseCarousel';
import CategoriesSection from '../components/CategoriesSection';
import VideoCollectionsCarousel from '../components/VideoCollectionsCarousel';
import FAQAndSubscribe from '../components/FAQAndSubscribe';

export const metadata: Metadata = {
  title: "Celite - Professional After Effects Templates",
  description:
    "Discover premium After Effects templates for logo reveals, slideshows, and more. Join thousands of creators using our templates.",
};

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Home() {
  return (
    <main className="bg-background min-h-screen">
      <Hero />
      <CinemaTemplatesShowcase />
      <RoyaltyFreeMusicShowcase />
      <SfxShowcase />
      <CategoriesSection />
      <VideoCollectionsCarousel />
      <WebsiteShowcaseCarousel />
      <FAQAndSubscribe />
    </main>
  );
}
