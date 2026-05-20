import type { Metadata } from 'next';
import TemplatesClient from './TemplatesClient';

export const metadata: Metadata = {
    title: "All Creative Templates | After Effects, Wedding, Video & More",
    description: "Browse all creative templates and assets across multiple categories — After Effects templates, wedding save the date videos, cinematic intros, graphics, fonts, music, and more. Download free & premium templates.",
    keywords: ['after effects templates', 'wedding templates', 'save the date template', 'video templates', 'creative templates', 'motion graphics', 'ae templates'],
    alternates: {
        canonical: 'https://celite.in/templates',
    },
};

export const dynamic = 'force-dynamic';

export default function TemplatesPage() {
    return <TemplatesClient />;
}

