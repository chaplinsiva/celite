'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { convertR2UrlToCdn } from '@/lib/utils';
import VideoThumbnailPlayer from './VideoThumbnailPlayer';
import { ArrowRight } from 'lucide-react';

type CinemaTemplate = {
  slug: string;
  name: string;
  subtitle?: string;
  img?: string;
  video_path?: string;
  thumbnail_path?: string;
  category?: { id: string; name: string; slug: string } | null;
};

export default function CinemaTemplatesShowcase() {
  const [templates, setTemplates] = useState<CinemaTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        
        // Search for cinema-related templates by tags or name
        const { data, error } = await supabase
          .from('templates')
          .select(`
            slug,
            name,
            subtitle,
            img,
            video_path,
            thumbnail_path,
            category_id,
            categories(id, name, slug)
          `)
          .eq('status', 'approved')
          .or('tags.ilike.%cinema%,tags.ilike.%cinematic%,tags.ilike.%film%,name.ilike.%cinema%,name.ilike.%cinematic%,name.ilike.%film%')
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) {
          console.error('Error loading cinema templates:', error);
        } else {
          setTemplates(data || []);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  if (loading) {
    return null;
  }

  if (templates.length === 0) {
    return null;
  }

  return (
    <section className="relative w-full py-6 md:py-10 px-4 sm:px-6 bg-background">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-black tracking-tight mb-2">
              Cinema Templates
            </h2>
            <p className="text-zinc-600 text-sm md:text-base">
              Professional cinematic templates for your next project
            </p>
          </div>
          <Link
            href="/video-templates?search=cinema"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group"
          >
            View all
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {templates.map((template) => {
            const thumbnail = template.thumbnail_path 
              ? convertR2UrlToCdn(template.thumbnail_path)
              : template.img 
              ? convertR2UrlToCdn(template.img)
              : '/placeholder.jpg';
            
            const videoUrl = template.video_path ? convertR2UrlToCdn(template.video_path) : null;

            return (
              <Link
                key={template.slug}
                href={`/product/${template.slug}`}
                className="group relative overflow-hidden rounded-xl bg-zinc-900 aspect-[16/9] hover:scale-[1.02] transition-transform duration-300"
              >
                {videoUrl ? (
                  <VideoThumbnailPlayer
                    videoUrl={videoUrl}
                    thumbnailUrl={thumbnail || '/placeholder.jpg'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={thumbnail || '/placeholder.jpg'}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-sm font-bold text-white line-clamp-2">
                    {template.name}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

