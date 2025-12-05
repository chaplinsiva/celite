import type { Metadata } from 'next';
import CategoriesClient from './CategoriesClient';

export const metadata: Metadata = {
    title: "Explore All Categories • Celite",
    description: "Browse all creative categories including stock videos, video templates, graphics, presentations, fonts, sound effects, and more.",
};

export const dynamic = 'force-dynamic';

export default function CategoriesPage() {
    return <CategoriesClient />;
}
