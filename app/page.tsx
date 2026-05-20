import type { Metadata } from 'next';
import Hero from '../components/Hero';
import CinemaTemplatesShowcase from '../components/CinemaTemplatesShowcase';
import SaveDateTemplatesShowcase from '../components/SaveDateTemplatesShowcase';
import RoyaltyFreeMusicShowcase from '../components/RoyaltyFreeMusicShowcase';
import SfxShowcase from '../components/SfxShowcase';
import LatestTemplatesCarousel from '../components/LatestTemplatesCarousel';
import WebsiteShowcaseCarousel from '../components/WebsiteShowcaseCarousel';
import CategoriesSection from '../components/CategoriesSection';
import VideoCollectionsCarousel from '../components/VideoCollectionsCarousel';
import FAQAndSubscribe from '../components/FAQAndSubscribe';

export const metadata: Metadata = {
  title: 'Celite – Premium After Effects Templates | Wedding, Save the Date & Video Templates',
  description:
    'Download premium After Effects templates for weddings, save the date videos, cinematic intros, logo reveals, and more. Free & premium AE templates with unlimited downloads. The best wedding video template marketplace.',
  keywords: [
    'after effects templates',
    'wedding template after effects',
    'save the date template',
    'save the date after effects',
    'wedding video template',
    'video templates',
    'motion graphics templates',
    'after effects wedding',
    'ae templates',
    'wedding intro after effects',
    'free after effects templates',
    'cinematic template',
    'logo reveal template',
    'wedding slideshow after effects',
  ],
  openGraph: {
    title: 'Celite – Premium After Effects Templates | Wedding & Save the Date Video Templates',
    description: 'Download premium After Effects templates for weddings, save the date videos, cinematic intros, and more. Unlimited downloads with subscription.',
    url: 'https://celite.in',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Celite - Premium After Effects Templates' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Celite – Premium After Effects & Wedding Video Templates',
    description: 'Download premium wedding save the date, cinematic intro & motion graphics templates for After Effects.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://celite.in',
  },
};

// Force dynamic rendering so new templates appear immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Home() {
  return (
    <main className="bg-background min-h-screen">
      <Hero />
      <CinemaTemplatesShowcase />
      <SaveDateTemplatesShowcase />
      <RoyaltyFreeMusicShowcase />
      <SfxShowcase />
      <CategoriesSection />
      <VideoCollectionsCarousel />
      <WebsiteShowcaseCarousel />
      <FAQAndSubscribe />
    </main>
  );
}
