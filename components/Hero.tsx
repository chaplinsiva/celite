"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Download, Star, Check, ArrowRight, Gift } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { convertR2UrlToCdn } from '../lib/utils';

type FreeTemplate = {
  slug: string;
  name: string;
  thumbnail_path?: string | null;
  img?: string | null;
  software?: string[] | null;
  vendor_name?: string | null;
  created_at?: string | null;
  displayDownloadCount?: number;
};

const stableMockCount = (slug: string) => {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash + slug.charCodeAt(i)) | 0;
  }
  const normalized = Math.abs(hash) % 151; // 0..150
  return 100 + normalized; // 100..250
};

export default function Hero() {
  const [freeAfterEffects, setFreeAfterEffects] = useState<FreeTemplate[]>([]);
  const [freeAlightMotion, setFreeAlightMotion] = useState<FreeTemplate[]>([]);
  const [minimalTemplates, setMinimalTemplates] = useState<FreeTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFreeTemplates = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        
        // Fetch all free Remo templates
        const { data: allRemoTemplates } = await supabase
          .from('templates')
          .select('slug, name, thumbnail_path, img, software')
          .eq('is_free', true)
          .ilike('name', '%remo%')
          .eq('status', 'approved')
          .limit(20);

        if (allRemoTemplates) {
          // Separate into After Effects and Alight Motion
          const afterEffectsTemplates: FreeTemplate[] = [];
          const alightMotionTemplates: FreeTemplate[] = [];

          allRemoTemplates.forEach((t: any) => {
            // Check if it's Alight Motion
            let isAlightMotion = false;
            
            // Check software field
            if (t.software) {
              const software = Array.isArray(t.software) ? t.software : [t.software];
              isAlightMotion = software.some((s: string) => 
                s && (s.toLowerCase().includes('alight') || 
                s.toLowerCase().includes('alightmotion') ||
                s.toLowerCase().includes('alight motion'))
              );
            }
            
            // Also check name for Alight Motion
            if (!isAlightMotion && t.name) {
              isAlightMotion = (
                t.name.toLowerCase().includes('alight motion') ||
                t.name.toLowerCase().includes('alightmotion') ||
                t.name.toLowerCase().includes('alight-motion')
              );
            }

            if (isAlightMotion) {
              alightMotionTemplates.push(t as FreeTemplate);
            } else {
              // If no software specified or not Alight Motion, assume After Effects
              afterEffectsTemplates.push(t as FreeTemplate);
            }
          });

          setFreeAfterEffects(afterEffectsTemplates.slice(0, 3));
          setFreeAlightMotion(alightMotionTemplates.slice(0, 3));
        }

        // Vendor showcase: minimal video templates (20 recent), show mock downloads for older items
        const { data: minimal } = await supabase
          .from('templates')
          .select('slug, name, thumbnail_path, img, vendor_name, created_at')
          .eq('status', 'approved')
          .eq('category_id', '448b09c7-addb-4875-83d9-a207e213f6d0') // video templates
          .order('created_at', { ascending: false })
          .limit(20);
        if (minimal) {
          const mapped = minimal.map((t: any) => {
            const createdAt = t.created_at ? new Date(t.created_at).getTime() : 0;
            const freshMs = 3 * 24 * 60 * 60 * 1000;
            const isNew = createdAt ? (Date.now() - createdAt) < freshMs : false;
            const displayDownloadCount = isNew ? 0 : stableMockCount(t.slug);
            return { ...t, displayDownloadCount };
          });
          setMinimalTemplates(mapped);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching free templates:', error);
        setLoading(false);
      }
    };

    fetchFreeTemplates();
  }, []);

  const getThumbnail = (template: FreeTemplate) => {
    if (template.thumbnail_path) return convertR2UrlToCdn(template.thumbnail_path) || template.thumbnail_path;
    if (template.img) return convertR2UrlToCdn(template.img) || template.img;
    return '/PNG1.png';
  };

  return (
    <section className="relative w-full py-4 md:py-6 px-4 sm:px-6 bg-[#fdf8f3]">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          {/* Main Dark Banner */}
          <div className="flex-1 relative bg-[#1a1a1a] rounded-[1.5rem] overflow-hidden min-h-[260px] md:min-h-[300px]">
            <div className="absolute inset-0">
              <img
                src="/hero-simple.png"
                alt="Creative Lifestyle"
                className="w-full h-full object-cover opacity-80 md:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] via-[#1a1a1a]/50 to-transparent"></div>
            </div>
            <div className="relative z-10 p-6 md:p-10 space-y-4 max-w-2xl">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl sm:text-5xl md:text-6xl font-[900] tracking-tighter text-white leading-[0.9]"
              >
                PLACE OF <br className="hidden sm:block" />
                CREATIVITY
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-base sm:text-lg md:text-xl font-bold text-white leading-tight"
              >
                Pay-per-product downloads. Premium video, music, SFX, photos, 3D—no subscriptions.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex flex-wrap gap-3"
              >
                <Link
                  href="/video-templates"
                  className="inline-flex items-center px-5 py-3 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                >
                  Browse templates
                </Link>
                <Link
                  href="/music-sfx"
                  className="inline-flex items-center px-5 py-3 rounded-full border border-white/30 text-white text-sm font-semibold hover:bg-white/10"
                >
                  Explore music & SFX
                </Link>
              </motion.div>
              <p className="text-[11px] text-white/70">
                Legacy freebies remain accessible for existing users.
              </p>
            </div>
          </div>
        </div>

        {/* Vendor showcase: minimal video templates */}
        {minimalTemplates.length > 0 && (
          <div className="mt-6 bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-900">Featured creators</h3>
                <p className="text-sm text-zinc-500">Recent video templates with vendor credits</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {minimalTemplates.map((tpl) => (
                <Link key={tpl.slug} href={`/product/${tpl.slug}`} className="group rounded-xl border border-zinc-200 bg-zinc-50 hover:border-blue-500 transition-all overflow-hidden">
                  <div className="aspect-video bg-zinc-100">
                    <img src={getThumbnail(tpl)} alt={tpl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-sm font-semibold text-zinc-900 line-clamp-2 group-hover:text-blue-600 transition-colors">{tpl.name}</p>
                    {tpl.vendor_name && <p className="text-[12px] text-zinc-500">By {tpl.vendor_name}</p>}
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Download className="w-3 h-3" /> {(tpl.displayDownloadCount ?? 0)}+ downloads
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Free Templates Section - Under Hero */}
        {(freeAfterEffects.length > 0 || freeAlightMotion.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border-2 border-blue-200"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-full p-2.5 sm:p-3">
                <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-zinc-900 mb-1">FREE Templates - 2026 New Year Gift</h3>
                <p className="text-sm sm:text-base text-zinc-700 font-medium">Download Remo Templates for After Effects & Alight Motion</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* After Effects Section */}
              {freeAfterEffects.length > 0 && (
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <h4 className="text-lg sm:text-xl font-bold text-blue-900">After Effects</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
                    {freeAfterEffects.map((template) => (
                      <Link
                        key={template.slug}
                        href={`/product/${template.slug}`}
                        className="group relative overflow-hidden rounded-lg bg-zinc-100 shadow-md hover:shadow-xl transition-all border border-blue-200"
                      >
                        <div className="aspect-video relative">
                          <img
                            src={getThumbnail(template)}
                            alt={template.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent">
                            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                              <p className="text-white text-sm sm:text-base font-bold line-clamp-2 mb-2">{template.name}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-blue-600 text-white text-xs font-bold px-2 sm:px-3 py-1 rounded-full">FREE</span>
                                <span className="text-white/90 text-xs">After Effects</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Alight Motion Section */}
              {freeAlightMotion.length > 0 && (
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <h4 className="text-lg sm:text-xl font-bold text-purple-900">Alight Motion</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
                    {freeAlightMotion.map((template) => (
                      <Link
                        key={template.slug}
                        href={`/product/${template.slug}`}
                        className="group relative overflow-hidden rounded-lg bg-zinc-100 shadow-md hover:shadow-xl transition-all border border-purple-200"
                      >
                        <div className="aspect-video relative">
                          <img
                            src={getThumbnail(template)}
                            alt={template.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent">
                            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                              <p className="text-white text-sm sm:text-base font-bold line-clamp-2 mb-2">{template.name}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-purple-600 text-white text-xs font-bold px-2 sm:px-3 py-1 rounded-full">FREE</span>
                                <span className="text-white/90 text-xs">Alight Motion</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
