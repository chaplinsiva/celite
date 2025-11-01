"use client";

import Link from 'next/link';
import Image from 'next/image';

export default function ShowcasesSection() {
  const showcases = [
    {
      id: 1,
      title: "Logo Reveal Collection",
      description: "Stunning logo animations that make brands stand out",
      image: "/Logo.png",
      category: "Logo Reveals",
    },
    {
      id: 2,
      title: "Cinematic Slideshows",
      description: "Professional slideshow templates for your videos",
      image: "/Logo.png",
      category: "Slideshows",
    },
    {
      id: 3,
      title: "Title Cards Gallery",
      description: "Eye-catching title cards for any project",
      image: "/Logo.png",
      category: "Title Cards",
    },
  ];

  return (
    <section className="relative w-full py-16 sm:py-20 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Showcases</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            See Our Work in Action
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Discover how our templates transform ordinary videos into extraordinary experiences
          </p>
        </div>

        {/* Showcases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {showcases.map((showcase, index) => (
            <Link
              key={showcase.id}
              href="/templates"
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 border border-white/10 backdrop-blur-sm p-6 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            >
              {/* Decorative Corner Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full"></div>
              
              {/* Image Container */}
              <div className="relative h-48 mb-4 rounded-xl overflow-hidden bg-zinc-900">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
                <Image
                  src={showcase.image}
                  alt={showcase.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {/* Category Badge */}
                <div className="absolute bottom-3 left-3 z-20">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-white/30">
                    {showcase.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {showcase.title}
                </h3>
                <p className="text-sm text-zinc-400 mb-4">
                  {showcase.description}
                </p>
                <div className="flex items-center text-blue-400 text-sm font-semibold">
                  <span>View Collection</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Hover Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            href="/templates"
            className="inline-flex items-center px-8 py-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          >
            View All Showcases
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

