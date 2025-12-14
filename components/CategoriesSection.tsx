"use client";

import Link from 'next/link';
import { cn } from "@/lib/utils";

const categories = [
  {
    name: "Video Templates",
    href: "/video-templates",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
    span: "col-span-1 row-span-2"
  },
  {
    name: "Web Templates",
    href: "/web-templates",
    imageUrl: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80",
    span: "col-span-1 row-span-1"
  },
  {
    name: "Graphics",
    href: "/graphics",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
    span: "col-span-1 row-span-2"
  },
  {
    name: "Stock Photos",
    href: "/stock-photos",
    imageUrl: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&q=80",
    span: "col-span-1 row-span-1"
  },
  {
    name: "Music & SFX",
    href: "/music-sfx",
    imageUrl: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800&q=80",
    span: "col-span-1 row-span-1"
  },
  {
    name: "3D Models",
    href: "/3d-models",
    imageUrl: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&q=80",
    span: "col-span-1 row-span-1"
  },
  {
    name: "All Categories",
    href: "/templates",
    imageUrl: "https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=800&q=80",
    span: "col-span-1 row-span-1"
  },
];

export default function CategoriesSection() {
  return (
    <section className="relative w-full py-20 bg-gradient-to-br from-purple-50/30 via-white to-blue-50/30">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header - Centered */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-500">
              Explore Categories
            </span>
          </h2>
          <p className="text-zinc-600 text-lg max-w-2xl mx-auto">
            Browse templates, assets, and tools tailored for your creative needs.
          </p>
        </div>

        {/* Categories Grid - Masonry/Bento Style - Same layout on all screens, just scaled */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 auto-rows-[100px] sm:auto-rows-[150px] lg:auto-rows-[200px]">
          {categories.map((category, index) => (
            <Link
              key={index}
              href={category.href}
              className={cn(
                "group relative overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-3xl border-2 border-zinc-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1",
                category.span
              )}
            >
              {/* Image */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
              </div>

              {/* Category Name */}
              <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 lg:p-6">
                <h3 className="text-[10px] sm:text-sm md:text-lg lg:text-2xl font-bold text-white drop-shadow-lg">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
