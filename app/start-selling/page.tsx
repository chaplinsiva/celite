import type { Metadata } from 'next';
import StartSellingContent from './StartSellingContent';

export const metadata: Metadata = {
  title: "Start Selling | Celite",
  description: "Become a seller on Celite and share your creative templates with the world.",
};

export default function StartSellingPage() {
  return <StartSellingContent />;
}

