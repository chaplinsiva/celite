"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';

type Showcase = {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  slug: string;
};

export default function ShowcasesSection() {
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShowcases = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        
        // Fetch templates grouped by common tags/categories
        // Get templates with different tags to show variety
        const { data: allTemplates } = await supabase
          .from('templates')
          .select('slug,name,subtitle,description,img,tags')
          .limit(20);

        if (!allTemplates || allTemplates.length === 0) {
          setShowcases([]);
          setLoading(false);
          return;
        }

        // Group templates by their first tag to create showcases
        const tagGroups = new Map<string, any[]>();
        
        allTemplates.forEach((template: any) => {
          const tags = template.tags || [];
          if (tags.length > 0) {
            const primaryTag = tags[0];
            if (!tagGroups.has(primaryTag)) {
              tagGroups.set(primaryTag, []);
            }
            tagGroups.get(primaryTag)!.push(template);
          }
        });

        // Create showcases from tag groups (up to 3 showcases)
        const showcaseList: Showcase[] = [];
        let count = 0;
        const maxShowcases = 3;

        for (const [tag, templates] of tagGroups.entries()) {
          if (count >= maxShowcases) break;
          
          // Get the first template from this category
          const template = templates[0];
          const categoryName = tag.charAt(0).toUpperCase() + tag.slice(1).replace(/_/g, ' ');
          
          showcaseList.push({
            id: `showcase-${count}`,
            title: `${categoryName} Collection`,
            description: template.subtitle || template.description || `Professional ${categoryName.toLowerCase()} templates`,
            image: template.img || '/PNG1.png',
            category: categoryName,
            slug: template.slug,
          });
          
          count++;
        }

        // If we don't have enough showcases, fill with featured templates
        if (showcaseList.length < maxShowcases) {
          const { data: featuredTemplates } = await supabase
            .from('templates')
            .select('slug,name,subtitle,description,img,tags')
            .eq('is_featured', true)
            .limit(maxShowcases - showcaseList.length);

          if (featuredTemplates) {
            featuredTemplates.forEach((template: any, index: number) => {
              if (showcaseList.length < maxShowcases) {
                const tags = template.tags || [];
                const categoryName = tags.length > 0 
                  ? tags[0].charAt(0).toUpperCase() + tags[0].slice(1).replace(/_/g, ' ')
                  : 'Featured';
                
                showcaseList.push({
                  id: `showcase-featured-${index}`,
                  title: template.name || `${categoryName} Template`,
                  description: template.subtitle || template.description || `Professional ${categoryName.toLowerCase()} template`,
                  image: template.img || '/PNG1.png',
                  category: categoryName,
                  slug: template.slug,
                });
              }
            });
          }
        }

        // Ensure we have at least 3 showcases (fill with defaults if needed)
        while (showcaseList.length < 3) {
          showcaseList.push({
            id: `showcase-default-${showcaseList.length}`,
            title: 'Premium Templates',
            description: 'Discover our collection of premium After Effects templates',
            image: '/PNG1.png',
            category: 'Featured',
            slug: '/templates',
          });
        }

        setShowcases(showcaseList.slice(0, 3));
      } catch (error) {
        console.error('Error loading showcases:', error);
        // Fallback to default showcases
        setShowcases([
          {
            id: '1',
            title: 'Logo Reveal Collection',
            description: 'Stunning logo animations that make brands stand out',
            image: '/PNG1.png',
            category: 'Logo Reveals',
            slug: '/templates',
          },
          {
            id: '2',
            title: 'Cinematic Slideshows',
            description: 'Professional slideshow templates for your videos',
            image: '/PNG1.png',
            category: 'Slideshows',
            slug: '/templates',
          },
          {
            id: '3',
            title: 'Title Cards Gallery',
            description: 'Eye-catching title cards for any project',
            image: '/PNG1.png',
            category: 'Title Cards',
            slug: '/templates',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadShowcases();
  }, []);

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
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-zinc-900/80 border border-white/10 p-6 animate-pulse">
                <div className="h-48 mb-4 rounded-xl bg-zinc-800"></div>
                <div className="h-6 mb-2 rounded bg-zinc-800"></div>
                <div className="h-4 rounded bg-zinc-800"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {showcases.map((showcase, index) => (
              <Link
                key={showcase.id}
                href={showcase.slug.startsWith('/') ? showcase.slug : `/product/${showcase.slug}`}
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
        )}

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            href="/video-templates"
            className="inline-flex items-center px-8 py-3 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
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

