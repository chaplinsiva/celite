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
};

export default function Hero() {
  const [freeAfterEffects, setFreeAfterEffects] = useState<FreeTemplate[]>([]);
  const [freeAlightMotion, setFreeAlightMotion] = useState<FreeTemplate[]>([]);
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
          <div className="flex-[3] relative bg-[#1a1a1a] rounded-[1.5rem] overflow-hidden flex flex-col md:flex-row min-h-[280px] md:min-h-[320px]">
            {/* Background Image Effect */}
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-y-0 right-0 w-full md:w-1/2 h-full">
                <img
                  src="/hero-simple.png"
                  alt="Creative Lifestyle"
                  className="w-full h-full object-cover opacity-80 md:opacity-100"
                />
                {/* Gradient Fade to Black */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] via-[#1a1a1a]/40 to-transparent"></div>
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center p-6 md:p-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-6 h-6 bg-[#2563eb] rounded-full mb-4 invisible md:visible"
              />

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl sm:text-5xl md:text-6xl font-[900] tracking-tighter text-[#2563eb] leading-[0.9] mb-4"
              >
                PLACE OF <br className="hidden sm:block" />
                CREATIVITY
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-lg"
              >
                <p className="text-base sm:text-lg md:text-xl font-bold text-white leading-tight mb-2">
                  Unlimited After Effects templates, stock music, sfx, stock images, 3d models all like that
                </p>
                <p className="text-white/60 text-[10px]">
                  ^2026 New Year Gift Try Remo After Effects Template as Free
                </p>
              </motion.div>
            </div>
          </div>

          {/* Pricing Card Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-w-[280px]"
          >
            <div className="h-full bg-white rounded-[1.5rem] p-6 md:p-8 shadow-xl border border-zinc-100 flex flex-col">
              <div className="mb-4">
                <p className="text-zinc-500 text-xs font-medium mb-1">From</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl font-black text-zinc-900">₹599</span>
                  <span className="text-zinc-500 font-medium text-sm">/month</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {[
                  { icon: Download, text: 'Unlimited After Effects templates' },
                  { icon: Star, text: 'Stock music, SFX & images' },
                  { icon: Check, text: 'Commercial license included' },
                  { icon: ArrowRight, text: 'Cancel anytime' }
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-700 font-semibold text-sm">
                    <item.icon className="w-4 h-4 flex-shrink-0 text-zinc-400" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/pricing"
                className="w-full bg-[#2563eb] text-white py-3 md:py-4 rounded-xl font-bold text-center text-sm hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
              >
                Get unlimited downloads
              </Link>
            </div>
          </motion.div>

        </div>

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
