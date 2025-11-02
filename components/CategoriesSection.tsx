"use client";

import Link from 'next/link';
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

const categories = [
  {
    name: "After Effects Templates",
    description: "Premium motion graphics and video templates",
    href: "/templates?category=after-effects",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    area: "md:[grid-area:1/1/2/5] xl:[grid-area:1/1/2/4]",
  },
  {
    name: "Website Templates",
    description: "Modern and responsive website designs",
    href: "/templates?category=website",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    area: "md:[grid-area:1/5/2/9] xl:[grid-area:2/1/3/4]",
  },
  {
    name: "PSD Templates",
    description: "Professional Photoshop design templates",
    href: "/templates?category=psd",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    area: "md:[grid-area:1/9/2/13] xl:[grid-area:1/4/3/7]",
  },
  {
    name: "Logo Templates",
    description: "Creative logo designs and brand identity",
    href: "/templates?category=logo",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
    area: "md:[grid-area:2/1/3/5] xl:[grid-area:1/7/2/10]",
  },
  {
    name: "Video Templates",
    description: "Professional video editing templates",
    href: "/templates?category=video",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    area: "md:[grid-area:2/5/3/9] xl:[grid-area:2/7/3/10]",
  },
  {
    name: "Social Media Templates",
    description: "Templates for Instagram, Facebook & more",
    href: "/templates?category=social-media",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
    area: "md:[grid-area:2/9/3/13] xl:[grid-area:1/10/3/13]",
  },
];

interface GridItemProps {
  area: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

const GridItem = ({ area, icon, title, description, href }: GridItemProps) => {
  return (
    <li className={cn("min-h-[14rem] list-none", area)}>
      <Link href={href}>
        <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] border-white/10 bg-black/40 p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)] md:p-6">
            <div className="relative flex flex-1 flex-col justify-between gap-3">
              <div className="w-fit rounded-lg border-[0.75px] border-white/10 bg-zinc-900/50 p-2">
                <div className="text-white">
                  {icon}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="pt-0.5 text-xl leading-[1.375rem] font-semibold font-sans tracking-[-0.04em] md:text-2xl md:leading-[1.875rem] text-balance text-white">
                  {title}
                </h3>
                <h2 className="[&_b]:md:font-semibold [&_strong]:md:font-semibold font-sans text-sm leading-[1.125rem] md:text-base md:leading-[1.375rem] text-zinc-400">
                  {description}
                </h2>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
};

export default function CategoriesSection() {
  return (
    <section className="relative w-full py-20 sm:py-24 md:py-28 overflow-hidden bg-black">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            What We Offer
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Explore our diverse collection of premium templates for all your creative needs
          </p>
        </div>

        {/* Categories Grid */}
        <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-3 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2">
          {categories.map((category, index) => (
            <GridItem
              key={index}
              area={category.area}
              icon={category.icon}
              title={category.name}
              description={category.description}
              href={category.href}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
