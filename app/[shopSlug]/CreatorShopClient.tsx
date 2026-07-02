'use client';

import Link from 'next/link';
import { convertR2UrlToCdn } from '@/lib/utils';
import VideoThumbnailPlayer from '@/components/VideoThumbnailPlayer';
import MusicSfxPlayer from '@/components/MusicSfxPlayer';
import StockPhotoViewer from '@/components/StockPhotoViewer';
import { Music2, Image, Video, Box } from 'lucide-react';

type CreatorTemplate = {
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  img: string | null;
  video: string | null;
  video_path?: string | null;
  thumbnail_path?: string | null;
  audio_preview_path?: string | null;
  model_3d_path?: string | null;
  category_id: string | null;
  created_at: string | null;
};

type Category = {
  id: string;
  name: string;
  slug?: string | null;
};

type GroupedSection = {
  category: Category | null;
  items: CreatorTemplate[];
};

const MUSIC_SFX_CATEGORY_ID = '143d45f1-a55b-42be-9f51-aab507a20fac';
const STOCK_PHOTOS_CATEGORY_ID = 'ba7f68c3-6f0f-4a29-a337-3b2cef7b4f47';

function getThumbnail(t: CreatorTemplate) {
  if (t.thumbnail_path) return convertR2UrlToCdn(t.thumbnail_path) || t.thumbnail_path;
  if (t.img) return convertR2UrlToCdn(t.img) || t.img;
  return '/PNG1.png';
}

function TemplateCard({ template, category }: { template: CreatorTemplate; category: Category | null }) {
  const categoryId = category?.id || template.category_id;
  const categorySlug = category?.slug || '';

  const isStockPhoto = categoryId === STOCK_PHOTOS_CATEGORY_ID ||
    categorySlug === 'stock-images' ||
    categorySlug === 'stock-photos' ||
    (categorySlug.includes('stock') && (categorySlug.includes('photo') || categorySlug.includes('image')));

  const isMusicSfx = categoryId === MUSIC_SFX_CATEGORY_ID ||
    categorySlug === 'musics-and-sfx' ||
    categorySlug === 'music' ||
    categorySlug === 'audio' ||
    categorySlug === 'sound-effects' ||
    (categorySlug.includes('music') || categorySlug.includes('audio') || categorySlug.includes('sfx') || categorySlug.includes('sound'));

  const is3DModel = categorySlug === '3d-models' || categorySlug.includes('3d');

  // Render preview based on category and available paths
  const renderPreview = () => {
    // Stock Photos - show thumbnail only
    if (isStockPhoto) {
      const imageUrl = convertR2UrlToCdn(template.thumbnail_path) || template.thumbnail_path || convertR2UrlToCdn(template.img) || template.img || '/PNG1.png';
      return (
        <div className="relative w-full h-full">
          <img
            src={imageUrl}
            alt={template.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
      );
    }

    // Music & SFX - show thumbnail with music icon overlay
    if (isMusicSfx) {
      const thumbnailUrl = convertR2UrlToCdn(template.thumbnail_path) || template.thumbnail_path || convertR2UrlToCdn(template.img) || template.img;
      return (
        <div className="relative w-full h-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500"></div>
          )}
          {/* Music icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-black/20 to-transparent">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/30">
              <Music2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
      );
    }

    if (template.video_path) {
      return (
        <VideoThumbnailPlayer
          videoUrl={template.video_path}
          thumbnailUrl={convertR2UrlToCdn(template.thumbnail_path) || template.thumbnail_path || convertR2UrlToCdn(template.img) || template.img || undefined}
          title={template.name}
          className="w-full h-full"
        />
      );
    }


    // Default thumbnail
    return (
      <div className="relative w-full h-full">
        <img
          src={getThumbnail(template)}
          alt={template.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>
    );
  };

  return (
    <Link
      href={`/product/${template.slug}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-zinc-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-900/10 transition-all duration-300"
    >
      <div className="relative aspect-video overflow-hidden bg-zinc-100">
        {renderPreview()}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-zinc-900 text-lg leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors flex-1">
            {template.name}
          </h3>
          {isMusicSfx && (
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Music2 className="w-4 h-4 text-white" />
            </div>
          )}
          {isStockPhoto && (
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Image className="w-4 h-4 text-white" />
            </div>
          )}
          {is3DModel && (
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Box className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        {template.subtitle && (
          <p className="text-sm text-zinc-600 line-clamp-2 mb-2">
            {template.subtitle}
          </p>
        )}
        <div className="mt-auto pt-3 border-t border-zinc-100">
          <span className="text-xs text-zinc-500 font-medium">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CreatorShopClient({
  groupedSections
}: {
  groupedSections: GroupedSection[];
}) {
  return (
    <section className="space-y-12">
      {groupedSections.map((group, idx) => (
        <div key={group.category?.id || `uncat-${idx}`} className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-1 w-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900">
              {group.category ? group.category.name : "Other Templates"}
            </h2>
            <span className="text-sm text-zinc-500 font-medium bg-zinc-100 px-3 py-1 rounded-full">
              {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {group.items.map((t) => (
              <TemplateCard
                key={t.slug}
                template={t}
                category={group.category}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

