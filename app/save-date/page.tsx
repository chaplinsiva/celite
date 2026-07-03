import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Save the Date Templates for After Effects | Wedding Video Templates 2026',
  description:
    'Download premium Save the Date video templates for Adobe After Effects. Beautiful wedding invitation templates, romantic motion graphics, and customizable wedding video intros. Free & premium AE templates.',
  alternates: {
    canonical: 'https://celite.in/video-templates',
  },
};

export default function SaveDatePage() {
  redirect('/video-templates');
}
