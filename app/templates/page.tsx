import type { Metadata } from 'next';
import TemplatesClient from './TemplatesClient';

export const metadata: Metadata = {
    title: "Explore All Templates • Celite",
    description: "Browse all creative templates and assets across multiple categories. From video templates to graphics, fonts to music - find everything you need for your creative projects.",
};

export const dynamic = 'force-dynamic';

export default function TemplatesPage() {
    return <TemplatesClient />;
}

