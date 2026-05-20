import type { Metadata } from 'next';
import AboutContent from './AboutContent';

export const metadata: Metadata = {
  title: "About Celite • Creative Team",
  description: "Meet the Celite founding team building next-gen templates for creators.",
};

export default function AboutPage() {
  return <AboutContent />;
}
