"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";

const collections = [
    {
        name: "Cinema Templates",
        slug: "cinema-templates",
        imageUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80",
    },
    {
        name: "Logo Reveals",
        slug: "logo-reveals",
        imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80",
    },
    {
        name: "Social Media",
        slug: "social-media-templates",
        imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
    },
    {
        name: "Titles & Typography",
        slug: "titles-typography",
        imageUrl: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80",
    },
    {
        name: "Intros & Openers",
        slug: "intros-openers",
        imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80",
    },
    {
        name: "Product Promo",
        slug: "product-promo",
        imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    },
    {
        name: "Slideshows",
        slug: "slideshows",
        imageUrl: "https://images.unsplash.com/photo-1496449903678-68ddcb189a24?w=800&q=80",
    },
    {
        name: "Infographics",
        slug: "infographics",
        imageUrl: "https://images.unsplash.com/photo-1543286386-2e659306cd6c?w=800&q=80",
    },
    {
        name: "Transitions",
        slug: "transitions",
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
    }
];

export default function VideoCollectionsCarousel() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 500;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <section className="relative w-full py-6 md:py-10 px-4 sm:px-6 bg-background overflow-hidden">
            <div className="max-w-[1400px] mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl md:text-4xl font-black text-black tracking-tight">
                        Video Collections
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className="p-3 rounded-full border border-zinc-200 hover:bg-zinc-50 transition-colors shadow-sm"
                            aria-label="Scroll left"
                        >
                            <ChevronLeft className="w-6 h-6 text-zinc-600" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-3 rounded-full border border-zinc-200 hover:bg-zinc-50 transition-colors shadow-sm"
                            aria-label="Scroll right"
                        >
                            <ChevronRight className="w-6 h-6 text-zinc-600" />
                        </button>
                    </div>
                </div>

                {/* Boxy Aesthetic Carousel */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-5 overflow-x-auto scrollbar-hide pb-6 snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {collections.map((item, index) => (
                        <Link
                            key={index}
                            href={`/video-templates?subcategory=${item.slug}`}
                            className="flex-shrink-0 w-[240px] sm:w-[320px] md:w-[400px] aspect-square relative group overflow-hidden bg-zinc-900 snap-start shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.01]"
                        >
                            <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                            />
                            {/* Artistic Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />

                            <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-2xl">
                                    {item.name}
                                </h3>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        </section>
    );
}
