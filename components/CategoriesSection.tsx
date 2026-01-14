"use client";

import Link from 'next/link';
import { cn } from "@/lib/utils";
import { ArrowRight } from 'lucide-react';

const categories = [
  {
    name: "Video Templates",
    href: "/video-templates",
    imageUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80",
    span: "col-span-2 row-span-2"
  },
  {
    name: "Web Templates",
    href: "/web-templates",
    imageUrl: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80",
    span: "col-span-1 row-span-1"
  },
  {
    name: "Stock Photos",
    href: "/stock-photos",
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
    span: "col-span-1 row-span-1"
  },
  {
    name: "Music & SFX",
    href: "/music-sfx",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
    span: "col-span-1 row-span-1"
  },
  {
    name: "AI Prompts",
    href: "/prompts",
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
    span: "col-span-1 row-span-1"
  },
  {
    name: "3D Models",
    href: "/3d-models",
    imageUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
    span: "col-span-2 row-span-2"
  },
  {
    name: "Graphics",
    href: "/graphics",
    imageUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
    span: "col-span-1 row-span-2"
  },
  {
    name: "Sound Effects",
    href: "/sound-effects",
    imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80",
    span: "col-span-1 row-span-2"
  },
  {
    name: "Browse All",
    href: "/templates",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    span: "col-span-2 sm:col-span-3 md:col-span-4 row-span-1"
  },
];

export default function CategoriesSection() {
  return (
    <section className="relative w-full py-6 md:py-10 px-4 sm:px-6 bg-background">
      <div className="max-w-[1400px] mx-auto">
        {/* Header - Title on left, View all on right */}
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-3xl md:text-4xl font-black text-black tracking-tight">
            Explore Categories
          </h2>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group"
          >
            View all
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Categories Collage Grid - High rows for "scorable" feel */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 auto-rows-[180px] sm:auto-rows-[220px] md:auto-rows-[300px]">
          {categories.map((category, index) => (
            <Link
              key={index}
              href={category.href}
              className={cn(
                "group relative overflow-hidden rounded-xl bg-zinc-900 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.01]",
                category.span
              )}
            >
              {/* Image */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-500" />
              </div>

              {/* Category Name */}
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white drop-shadow-2xl tracking-tight">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        {/* Music Showcase Section */}
        <div className="mt-12 md:mt-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-black tracking-tight mb-2">
                Premium Music Collection
              </h2>
              <p className="text-zinc-600 text-sm md:text-base">
                Discover curated music tracks and sound effects
              </p>
            </div>
            <Link
              href="/music-sfx"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group"
            >
              View all
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Mock Album Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: 'Cinematic Scores', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80' },
              { name: 'Electronic Beats', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80' },
              { name: 'Ambient Soundscapes', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf16a53?w=400&q=80' },
              { name: 'Rock & Metal', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&q=80' },
              { name: 'Jazz & Blues', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80' },
              { name: 'Hip Hop Beats', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80' },
            ].map((album, index) => (
              <Link
                key={index}
                href="/music-sfx"
                className="group relative overflow-hidden rounded-xl bg-zinc-900 aspect-square hover:scale-[1.02] transition-transform duration-300"
              >
                <img
                  src={album.image}
                  alt={album.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-sm font-bold text-white drop-shadow-lg">
                    {album.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
