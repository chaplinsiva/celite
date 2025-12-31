'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { ArrowRight, TrendingUp, Play } from 'lucide-react';
import { convertR2UrlToCdn } from '../lib/utils';

interface TopTemplate {
  slug: string;
  name: string;
  video_path?: string | null;
  thumbnail_path?: string | null;
  img?: string | null;
  downloadCount: number;
  category?: { id: string; name: string; slug: string } | null;
}

export default function TopDownloadedShowcase() {
  const [templates, setTemplates] = useState<TopTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTopTemplates = async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        // Get video templates category ID
        const { data: videoCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', 'video-templates')
          .single();

        // Get After Effects subcategory ID
        const { data: afterEffectsSubcategory } = await supabase
          .from('subcategories')
          .select('id')
          .eq('slug', 'after-effects')
          .single();

        // Get Movie Templates sub-subcategory ID
        const { data: movieTemplatesSubSubcategory } = await supabase
          .from('sub_subcategories')
          .select('id')
          .eq('slug', 'movie-templates')
          .single();

        if (!videoCategory?.id) {
          console.error('Video Templates category not found');
          setLoading(false);
          return;
        }

        if (!afterEffectsSubcategory?.id) {
          console.error('After Effects subcategory not found');
          setLoading(false);
          return;
        }

        if (!movieTemplatesSubSubcategory?.id) {
          console.error('Movie Templates sub-subcategory not found');
          setLoading(false);
          return;
        }

        // Fetch only Movie Templates sub-subcategory templates
        const { data: movieTemplates } = await supabase
          .from('templates')
          .select('slug')
          .eq('status', 'approved')
          .eq('category_id', videoCategory.id)
          .eq('subcategory_id', afterEffectsSubcategory.id)
          .eq('sub_subcategory_id', movieTemplatesSubSubcategory.id);

        if (!movieTemplates || movieTemplates.length === 0) {
          console.warn('No movie templates found');
          setLoading(false);
          return;
        }

        console.log(`Found ${movieTemplates.length} movie templates`);

        const videoTemplateSlugs = movieTemplates.map(t => t.slug);

        // Fetch only subscriber downloads (from downloads table, not free_downloads)
        const { data: subscriberDownloads } = await supabase
          .from('downloads')
          .select('template_slug')
          .in('template_slug', videoTemplateSlugs);

        // Count subscriber downloads per template
        const downloadCounts: Record<string, number> = {};
        
        if (subscriberDownloads) {
          subscriberDownloads.forEach((d: any) => {
            if (d.template_slug) {
              downloadCounts[d.template_slug] = (downloadCounts[d.template_slug] || 0) + 1;
            }
          });
          console.log(`Found ${subscriberDownloads.length} subscriber downloads`);
        } else {
          console.log('No subscriber downloads found');
        }

        // Get template slugs sorted by download count - get all with downloads first
        let sortedSlugs = Object.entries(downloadCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([slug]) => slug);

        // Add remaining templates that don't have downloads yet
        const templatesWithDownloads = new Set(sortedSlugs);
        const templatesWithoutDownloads = movieTemplates
          .filter(t => !templatesWithDownloads.has(t.slug))
          .map(t => t.slug);

        // Combine: templates with downloads first, then templates without downloads
        // Always ensure we have templates to show - use all available if no downloads
        if (sortedSlugs.length === 0 && templatesWithoutDownloads.length > 0) {
          sortedSlugs = templatesWithoutDownloads;
        } else {
          sortedSlugs = [...sortedSlugs, ...templatesWithoutDownloads];
        }

        console.log(`Selected ${sortedSlugs.length} templates to display (${sortedSlugs.length - templatesWithoutDownloads.length} with downloads, ${templatesWithoutDownloads.length} without)`);

        // Fetch template details for all movie templates (no limit)
        const { data: templatesData, error } = await supabase
          .from('templates')
          .select(`
            slug,name,img,video_path,thumbnail_path,
            categories(id,name,slug)
          `)
          .eq('status', 'approved')
          .eq('sub_subcategory_id', movieTemplatesSubSubcategory.id)
          .in('slug', sortedSlugs);

        if (error) {
          console.error('Error loading top templates:', error);
          setLoading(false);
          return;
        }

        if (!templatesData || templatesData.length === 0) {
          console.warn('No template data returned from query');
          setLoading(false);
          return;
        }

        console.log(`Fetched ${templatesData.length} template details`);

        // Map templates with download counts, maintaining order from sortedSlugs
        const templateMap = new Map((templatesData ?? []).map((r: any) => [r.slug, r]));
        
        // Maintain the order from sortedSlugs (downloads first, then others)
        const mapped: TopTemplate[] = sortedSlugs
          .map(slug => {
            const r = templateMap.get(slug);
            if (!r) return null;
            return {
              slug: r.slug,
              name: r.name,
              video_path: r.video_path,
              thumbnail_path: r.thumbnail_path,
              img: r.img,
              downloadCount: downloadCounts[r.slug] || 0,
              category: r.categories ? (Array.isArray(r.categories) ? r.categories[0] : r.categories) : null,
            };
          })
          .filter((t): t is TopTemplate => t !== null);

        // If we have an odd number of templates, adjust to even number for better grid layout
        // Remove the last one if odd, or ensure we have a good number for the grid
        const finalTemplates = mapped.length % 2 === 0 ? mapped : mapped.slice(0, -1);

        console.log(`Setting ${finalTemplates.length} templates to display`);
        setTemplates(finalTemplates);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching top downloaded templates:', error);
        setLoading(false);
      }
    };

    loadTopTemplates();
  }, []);

  const getThumbnail = (template: TopTemplate) => {
    if (template.thumbnail_path) return convertR2UrlToCdn(template.thumbnail_path) || template.thumbnail_path;
    if (template.img) return convertR2UrlToCdn(template.img) || template.img;
    return '/PNG1.png';
  };

  if (loading) {
    return (
      <section className="relative w-full py-12 px-4 sm:px-6 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-video bg-zinc-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Always show templates - don't return null even if empty

  return (
    <section className="relative w-full py-12 px-4 sm:px-6 bg-white">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-900">Popular Movie Templates</h2>
            </div>
            <p className="text-zinc-600 text-sm sm:text-base">Most loved movie templates by creators</p>
          </div>
          <Link
            href="/video-templates"
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            View All
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Collage Grid - Responsive */}
        {templates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500">Loading movie templates...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4 auto-rows-[180px] lg:auto-rows-[200px]">
            {templates.map((tpl, index) => {
            // Determine size based on index for visual variety - collage style
            const isLarge = index === 0 || index === 4 || index === 7;
            const isMedium = index === 1 || index === 5 || index === 8;

            return (
              <div
                key={tpl.slug}
                className={`group relative rounded-2xl overflow-hidden bg-white border border-zinc-200 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ${
                  isLarge ? 'col-span-2 row-span-2' : isMedium ? 'row-span-2' : ''
                }`}
              >
                <Link href={`/product/${tpl.slug}`} className="block w-full h-full">
                  <img
                    src={getThumbnail(tpl)}
                    alt={tpl.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />

                  {/* Overlay Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none">
                    <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-semibold text-white mb-1">
                      {tpl.category?.name || 'Movie Template'}
                    </span>
                    <h3 className={`font-bold text-white leading-tight line-clamp-1 ${isLarge ? 'text-lg' : 'text-sm'}`}>
                      {tpl.name}
                    </h3>
                  </div>

                  {/* Play indicator */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 text-blue-600 fill-current" />
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </section>
  );
}

