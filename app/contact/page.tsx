import type { Metadata } from 'next';
import ContactContent from './ContactContent';

export const metadata: Metadata = {
  title: "Contact Us | Celite",
  description: "Contact information for Celite - Professional After Effects Templates. Get in touch with our team.",
};

export default function ContactPage() {
  return <ContactContent />;
}
