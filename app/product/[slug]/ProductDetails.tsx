
"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Share2, Check, Download, AlertCircle, PlayCircle, Star, Shield, Clock, Layers, Zap, HardDrive, Music2, Copy, Gift } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import { useLoginModal } from '../../../context/LoginModalContext';
import { trackViewItem } from '../../../lib/gtag';
import VideoThumbnailPlayer from '../../../components/VideoThumbnailPlayer';
import Model3DViewerInteractive from '../../../components/Model3DViewerInteractive';
import StockPhotoViewer from '../../../components/StockPhotoViewer';
import MusicSfxPlayer from '../../../components/MusicSfxPlayer';
import SimpleMusicPlayer from '../../../components/SimpleMusicPlayer';
import { cn, convertR2UrlToCdn } from '../../../lib/utils';
import type { Template } from '../../../data/templateData';

interface Review {
  name: string;
  rating: number;
  comment: string;
  date: string;
}

interface ProductDetailsProps {
  product: Template & { source_path?: string | null; vendor_name?: string | null; model_3d_path?: string | null; category_id?: string | null; subcategory_id?: string | null; category_slug?: string | null; category_name?: string | null };
  related: Template[];
  reviews: Review[];
}

const getThumbnail = (item: Template | (Template & { source_path?: string | null; thumbnail_path?: string | null })) => {
  // Prioritize thumbnail_path for new templates
  if ((item as any).thumbnail_path) return convertR2UrlToCdn((item as any).thumbnail_path) || (item as any).thumbnail_path;
  // Fallback to img
  if (item.img) return convertR2UrlToCdn(item.img) || item.img;
  return '/PNG1.png';
};

const MUSIC_SFX_CATEGORY_ID = '143d45f1-a55b-42be-9f51-aab507a20fac';

const isMusicItem = (item: any) => {
  const categoryId = item.category_id;
  return categoryId === MUSIC_SFX_CATEGORY_ID;
};

export default function ProductDetails({ product, related, reviews }: ProductDetailsProps) {
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubActive, setIsSubActive] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [moreInStyleIndex, setMoreInStyleIndex] = useState(0);
  const [moreInStyleTemplates, setMoreInStyleTemplates] = useState<Template[]>([]);
  const [youMayAlsoLikeTemplates, setYouMayAlsoLikeTemplates] = useState<Template[]>([]);
  const [loadingMoreInStyle, setLoadingMoreInStyle] = useState(true);
  const [loadingYouMayAlsoLike, setLoadingYouMayAlsoLike] = useState(true);
  const [promptCopied, setPromptCopied] = useState(false);

  // Check if this is a prompt product (only requires login, not subscription)
  const isPromptProduct = (product as any).category_slug === 'prompts' ||
    (product as any).category_name?.toLowerCase() === 'prompts' ||
    (product as any).category_slug?.includes('prompt');

  // Handle copy prompt (for prompts category - no login required)
  const handleCopyPrompt = async () => {
    const promptText = product.desc || product.subtitle || product.name;
    try {
      await navigator.clipboard.writeText(promptText);
      setPromptCopied(true);
      setFeedback('Prompt copied to clipboard!');
      setTimeout(() => {
        setPromptCopied(false);
        setFeedback(null);
      }, 3000);
    } catch (err) {
      setFeedback('Failed to copy prompt');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Track view_item event when product page loads
  useEffect(() => {
    trackViewItem({
      item_id: product.slug,
      item_name: product.name,
      price: 0, // Subscription model
      currency: 'INR',
    });
  }, [product.slug, product.name]);

  // Function to load subscription status from backend
  const loadSubscriptionStatus = useCallback(async () => {
    try {
      if (!user) {
        setIsSubActive(false);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('subscriptions')
        .select('is_active, valid_until')
        .eq('user_id', (user as any).id)
        .maybeSingle();

      if (error || !data) {
        setIsSubActive(false);
        return;
      }

      const now = Date.now();
      const validUntil = data.valid_until ? new Date(data.valid_until).getTime() : null;
      const active = !!data.is_active && (!validUntil || validUntil > now);

      setIsSubActive(active);
    } catch (error) {
      console.error('Error loading subscription:', error);
      setIsSubActive(false);
    }
  }, [user]);

  useEffect(() => {
    loadSubscriptionStatus();
  }, [loadSubscriptionStatus, product.slug]);

  // Fetch "More in This Style" templates based on keyword matching
  useEffect(() => {
    const fetchMoreInStyle = async () => {
      try {
        setLoadingMoreInStyle(true);
        const supabase = getSupabaseBrowserClient();

        // Get keywords from current template
        const keywords: string[] = [
          ...(product.tags || []),
          ...(product.features || []),
          ...(product.software || []),
          ...(product.plugins || []),
        ].filter(k => k && typeof k === 'string' && k.trim() !== '');

        if (keywords.length === 0) {
          // If no keywords, fetch templates from same category
          let query = supabase
            .from('templates')
            .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,model_3d_path,features,software,plugins,tags,vendor_name,category_id')
            .neq('slug', product.slug)
            .eq('status', 'approved');

          if (product.category_id) {
            query = query.eq('category_id', product.category_id);
          }

          const { data } = await query
            .limit(8)
            .order('created_at', { ascending: false });

          if (data) {
            setMoreInStyleTemplates(data.map((r: any) => ({
              slug: r.slug,
              name: r.name,
              subtitle: r.subtitle,
              desc: r.description ?? '',
              price: 0,
              img: r.img,
              video: r.video,
              video_path: r.video_path ?? null,
              thumbnail_path: r.thumbnail_path ?? null,
              model_3d_path: r.model_3d_path ?? null,
              vendor_name: r.vendor_name ?? null,
              category_id: r.category_id ?? null,
              features: r.features ?? [],
              software: r.software ?? [],
              plugins: r.plugins ?? [],
              tags: r.tags ?? [],
              isFeatured: false,
            })));
          }
          setLoadingMoreInStyle(false);
          return;
        }

        // Search for templates matching keywords in the same category
        let query = supabase
          .from('templates')
          .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,model_3d_path,features,software,plugins,tags,vendor_name')
          .neq('slug', product.slug)
          .eq('status', 'approved');

        if (product.category_id) {
          query = query.eq('category_id', product.category_id);
        }

        const { data: allTemplates } = await query.limit(50);

        if (!allTemplates) {
          setLoadingMoreInStyle(false);
          return;
        }

        // Score templates based on keyword matches
        const scored = allTemplates.map((t: any) => {
          let score = 0;
          const allTemplateText = [
            ...(t.tags || []),
            ...(t.features || []),
            ...(t.software || []),
            ...(t.plugins || []),
            t.name || '',
            t.subtitle || '',
            t.description || '',
          ].map(s => String(s).toLowerCase()).join(' ');

          keywords.forEach(keyword => {
            const kwLower = keyword.toLowerCase();
            if (allTemplateText.includes(kwLower)) {
              score += 1;
            }
          });

          return { template: t, score };
        }).filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map(item => ({
            slug: item.template.slug,
            name: item.template.name,
            subtitle: item.template.subtitle,
            desc: item.template.description ?? '',
            price: 0,
            img: item.template.img,
            video: item.template.video,
            video_path: item.template.video_path ?? null,
            thumbnail_path: item.template.thumbnail_path ?? null,
            model_3d_path: item.template.model_3d_path ?? null,
            vendor_name: item.template.vendor_name ?? null,
            category_id: item.template.category_id ?? null,
            features: item.template.features ?? [],
            software: item.template.software ?? [],
            plugins: item.template.plugins ?? [],
            tags: item.template.tags ?? [],
            isFeatured: false,
          }));

        // If we don't have enough matches, fill with random
        if (scored.length < 4) {
          const randomTemplates = allTemplates
            .filter((t: any) => !scored.some(s => s.slug === t.slug))
            .slice(0, 4 - scored.length)
            .map((r: any) => ({
              slug: r.slug,
              name: r.name,
              subtitle: r.subtitle,
              desc: r.description ?? '',
              price: 0,
              img: r.img,
              video: r.video,
              video_path: r.video_path ?? null,
              thumbnail_path: r.thumbnail_path ?? null,
              vendor_name: r.vendor_name ?? null,
              category_id: r.category_id ?? null,
              features: r.features ?? [],
              software: r.software ?? [],
              plugins: r.plugins ?? [],
              tags: r.tags ?? [],
              isFeatured: false,
            }));
          setMoreInStyleTemplates([...scored, ...randomTemplates]);
        } else {
          setMoreInStyleTemplates(scored);
        }
      } catch (error) {
        console.error('Error fetching more in style templates:', error);
        setMoreInStyleTemplates([]);
      } finally {
        setLoadingMoreInStyle(false);
      }
    };

    fetchMoreInStyle();
  }, [product.slug, product.tags, product.features, product.software, product.plugins, product.category_id]);

  // Fetch "You May Also Like" templates based on subscription status
  useEffect(() => {
    const fetchYouMayAlsoLike = async () => {
      try {
        setLoadingYouMayAlsoLike(true);
        const supabase = getSupabaseBrowserClient();

        if (isSubActive && user) {
          // For subscribed users: fetch templates matching subscription keywords
          const subscriptionKeywords = [
            'premium', 'professional', 'high quality', '4k', 'after effects',
            'motion graphics', 'animation', 'template', 'intro', 'outro',
            'logo', 'title', 'trailer', 'promo', 'commercial'
          ];

          // Fetch templates from same category
          let query = supabase
            .from('templates')
            .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,model_3d_path,features,software,plugins,tags,vendor_name,category_id')
            .neq('slug', product.slug)
            .eq('status', 'approved');

          if (product.category_id) {
            query = query.eq('category_id', product.category_id);
          }

          const { data: allTemplates } = await query.limit(50);

          if (!allTemplates) {
            setLoadingYouMayAlsoLike(false);
            return;
          }

          // Score templates based on subscription keyword matches
          const scored = allTemplates.map((t: any) => {
            let score = 0;
            const allTemplateText = [
              ...(t.tags || []),
              ...(t.features || []),
              ...(t.software || []),
              ...(t.plugins || []),
              t.name || '',
              t.subtitle || '',
              t.description || '',
            ].map(s => String(s).toLowerCase()).join(' ');

            subscriptionKeywords.forEach(keyword => {
              if (allTemplateText.includes(keyword.toLowerCase())) {
                score += 1;
              }
            });

            return { template: t, score };
          }).filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(item => ({
              slug: item.template.slug,
              name: item.template.name,
              subtitle: item.template.subtitle,
              desc: item.template.description ?? '',
              price: 0,
              img: item.template.img,
              video: item.template.video,
              video_path: item.template.video_path ?? null,
              thumbnail_path: item.template.thumbnail_path ?? null,
              vendor_name: item.template.vendor_name ?? null,
              category_id: item.template.category_id ?? null,
              features: item.template.features ?? [],
              software: item.template.software ?? [],
              plugins: item.template.plugins ?? [],
              tags: item.template.tags ?? [],
              isFeatured: false,
            }));

          // If we don't have enough matches, fill with random
          if (scored.length < 4) {
            const randomTemplates = allTemplates
              .filter((t: any) => !scored.some(s => s.slug === t.slug))
              .slice(0, 4 - scored.length)
              .map((r: any) => ({
                slug: r.slug,
                name: r.name,
                subtitle: r.subtitle,
                desc: r.description ?? '',
                price: 0,
                img: r.img,
                video: r.video,
                video_path: r.video_path ?? null,
                thumbnail_path: r.thumbnail_path ?? null,
                model_3d_path: r.model_3d_path ?? null,
                vendor_name: r.vendor_name ?? null,
                features: r.features ?? [],
                software: r.software ?? [],
                plugins: r.plugins ?? [],
                tags: r.tags ?? [],
                isFeatured: false,
              }));
            setYouMayAlsoLikeTemplates([...scored, ...randomTemplates]);
          } else {
            setYouMayAlsoLikeTemplates(scored);
          }
        } else {
          // For non-subscribed users: fetch templates from same category
          let query = supabase
            .from('templates')
            .select('slug,name,subtitle,description,img,video,video_path,thumbnail_path,model_3d_path,features,software,plugins,tags,vendor_name,category_id')
            .neq('slug', product.slug)
            .eq('status', 'approved');

          if (product.category_id) {
            query = query.eq('category_id', product.category_id);
          }

          const { data } = await query
            .limit(8)
            .order('created_at', { ascending: false });

          if (data) {
            setYouMayAlsoLikeTemplates(data.map((r: any) => ({
              slug: r.slug,
              name: r.name,
              subtitle: r.subtitle,
              desc: r.description ?? '',
              price: 0,
              img: r.img,
              video: r.video,
              video_path: r.video_path ?? null,
              thumbnail_path: r.thumbnail_path ?? null,
              model_3d_path: r.model_3d_path ?? null,
              vendor_name: r.vendor_name ?? null,
              category_id: r.category_id ?? null,
              features: r.features ?? [],
              software: r.software ?? [],
              plugins: r.plugins ?? [],
              tags: r.tags ?? [],
              isFeatured: false,
            })));
          }
        }
      } catch (error) {
        console.error('Error fetching you may also like templates:', error);
        setYouMayAlsoLikeTemplates([]);
      } finally {
        setLoadingYouMayAlsoLike(false);
      }
    };

    fetchYouMayAlsoLike();
  }, [isSubActive, user, product.slug, product.category_id]);


  const handleDownload = async () => {
    try {
      setDownloading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        openLoginModal();
        setDownloading(false);
        return;
      }

      const res = await fetch(`/api/download/${product.slug}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 403) {
        const errorJson = await res.json();
        if (errorJson.limitReached) {
          setFeedback(errorJson.message || 'You have reached your weekly download limit. Your credits will reset next week.');
        } else {
        router.push('/pricing');
        setFeedback('Please subscribe to download this template.');
        }
        setDownloading(false);
        return;
      }

      if (res.status === 401) {
        openLoginModal();
        setFeedback('Please log in to download.');
        setDownloading(false);
        return;
      }

      const json = await res.json();

      // Handle redirect URL (signed URL for direct download)
      if (json.redirect && json.url) {
        // Use window.location.href for direct browser download
        // This allows the browser to handle large files efficiently
        window.location.href = json.url;
        setDownloading(false);
        return;
      }

      // Handle errors
      if (json.error) {
        if (json.error.includes('Access denied') || json.error.includes('subscribe')) {
          router.push('/pricing');
          setFeedback('Please subscribe to download this template.');
        } else if (json.error.includes('not found') || json.error.includes('not available')) {
          setFeedback('Source file not available for this template.');
        } else {
          setFeedback(json.error || 'Download failed.');
        }
        setDownloading(false);
        return;
      }

      // Unknown response
      setFeedback('Download not available.');
      setDownloading(false);
    } catch (e) {
      setFeedback('Error opening download.');
      setDownloading(false);
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const thumbnailUrl = convertR2UrlToCdn((product as any).thumbnail_path) || (product as any).thumbnail_path || convertR2UrlToCdn(product.img) || product.img;

    // Create detailed share text
    const shareText = product.subtitle
      ? `${product.subtitle} - Check out this template on Celite!`
      : 'Check out this amazing template on Celite!';

    try {
      if (navigator.share) {
        const shareData: ShareData = {
          title: product.name,
          text: shareText,
          url: shareUrl,
        };

        // Try to include thumbnail for platforms that support file sharing (Web Share API Level 2)
        if (thumbnailUrl && navigator.canShare) {
          try {
            const response = await fetch(thumbnailUrl);
            const blob = await response.blob();
            const file = new File([blob], 'template-preview.jpg', { type: blob.type || 'image/jpeg' });
            const shareDataWithFile = { ...shareData, files: [file] };
            if (navigator.canShare(shareDataWithFile)) {
              await navigator.share(shareDataWithFile);
              setShareFeedback('Shared!');
              return;
            }
          } catch {
            // Fall through to regular share without file
          }
        }

        await navigator.share(shareData);
        setShareFeedback('Shared!');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback('Link copied!');
      }
    } catch (err) {
      // User cancelled or share failed - copy link as fallback
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback('Link copied!');
      } catch {
        // Ignore clipboard errors
      }
    } finally {
      setTimeout(() => setShareFeedback(null), 2000);
    }
  };

  return (
    <main className="bg-white min-h-screen pb-20 pt-20 sm:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Breadcrumbs / Title */}
        <div className="mb-8">
          {/* Mobile: Shorter breadcrumb */}
          <div className="text-xs sm:text-sm text-zinc-500 mb-2">
            {(() => {
              const categorySlug = (product as any).category_slug?.toLowerCase() || '';
              const categoryName = (product as any).category_name || '';
              const categoryId = (product as any).category_id;

              // Determine category route and display name
              let categoryRoute = '/video-templates';
              let categoryDisplayName = 'Video Templates';

              // Check for 3D Models
              if (categorySlug === '3d-models' ||
                (categorySlug.includes('3d') && categorySlug.includes('model')) ||
                (categoryName?.toLowerCase().includes('3d') && categoryName?.toLowerCase().includes('model'))) {
                categoryRoute = '/3d-models';
                categoryDisplayName = '3D Models';
              }
              // Check for Stock Photos
              else if (categoryId === 'ba7f68c3-6f0f-4a29-a337-3b2cef7b4f47' ||
                categorySlug === 'stock-images' ||
                categorySlug === 'stock-photos' ||
                (categorySlug.includes('stock') && (categorySlug.includes('photo') || categorySlug.includes('image'))) ||
                (categoryName?.toLowerCase().includes('stock') && (categoryName?.toLowerCase().includes('photo') || categoryName?.toLowerCase().includes('image')))) {
                categoryRoute = '/stock-photos';
                categoryDisplayName = 'Stock Photos';
              }
              // Check for Music & SFX
              else if (categoryId === '143d45f1-a55b-42be-9f51-aab507a20fac' ||
                categorySlug === 'musics-and-sfx' ||
                categorySlug === 'stock-musics' ||
                categorySlug === 'music' ||
                categorySlug === 'audio' ||
                (categorySlug.includes('music') || categorySlug.includes('audio')) ||
                (categoryName?.toLowerCase().includes('music') || categoryName?.toLowerCase().includes('audio'))) {
                categoryRoute = '/stock-musics';
                categoryDisplayName = 'Stock Musics';
              }
              // Check for Sound Effects (separate from Music)
              else if (categorySlug === 'sound-effects' ||
                (categorySlug.includes('sfx') || categorySlug.includes('sound')) ||
                (categoryName?.toLowerCase().includes('sfx') || categoryName?.toLowerCase().includes('sound effect'))) {
                categoryRoute = '/sound-effects';
                categoryDisplayName = 'Sound Effects';
              }
              // Check for Web Templates
              else if (categorySlug === 'website-templates' ||
                categorySlug === 'web-templates' ||
                (categorySlug.includes('web') || categorySlug.includes('website')) ||
                (categoryName?.toLowerCase().includes('web') || categoryName?.toLowerCase().includes('website'))) {
                categoryRoute = '/web-templates';
                categoryDisplayName = 'Web Templates';
              }
              // Check for Graphics
              else if (categorySlug === 'psd-templates' ||
                categorySlug === 'graphics' ||
                (categorySlug.includes('graphic') || categorySlug.includes('psd')) ||
                (categoryName?.toLowerCase().includes('graphic') || categoryName?.toLowerCase().includes('psd'))) {
                categoryRoute = '/graphics';
                categoryDisplayName = 'Graphics';
              }
              // Check for After Effects / Video Templates
              else if (categorySlug === 'after-effects' ||
                categorySlug === 'video-templates' ||
                (categorySlug.includes('after-effects') || categorySlug.includes('video')) ||
                (categoryName?.toLowerCase().includes('after effects') || categoryName?.toLowerCase().includes('video'))) {
                categoryRoute = '/video-templates';
                categoryDisplayName = 'Video Templates';
              }
              // Fallback: Use category name if available
              else if (categoryName) {
                categoryDisplayName = categoryName;
                // Try to determine route from name
                const nameLower = categoryName.toLowerCase();
                if (nameLower.includes('sound effect') || nameLower.includes('sfx')) {
                  categoryRoute = '/sound-effects';
                } else if (nameLower.includes('music') || nameLower.includes('audio') || nameLower.includes('stock musics')) {
                  categoryRoute = '/stock-musics';
                } else if (nameLower.includes('stock') && (nameLower.includes('photo') || nameLower.includes('image'))) {
                  categoryRoute = '/stock-photos';
                } else if (nameLower.includes('3d') && nameLower.includes('model')) {
                  categoryRoute = '/3d-models';
                } else if (nameLower.includes('web') || nameLower.includes('website')) {
                  categoryRoute = '/web-templates';
                } else if (nameLower.includes('graphic') || nameLower.includes('psd')) {
                  categoryRoute = '/graphics';
                }
              }

              return (
                <>
                  <Link href={categoryRoute} className="hover:text-blue-600 transition-colors hidden sm:inline">
                    {categoryDisplayName}
                  </Link>
                  <span className="mx-2 hidden sm:inline">›</span>
                  <span className="text-zinc-900 font-medium truncate block sm:inline">{product.name}</span>
                </>
              );
            })()}
          </div>
          {/* Mobile: Smaller title */}
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-zinc-900 tracking-tight line-clamp-2 sm:line-clamp-none">{product.name}</h1>
          {/* Desktop: Vendor / brand info */}
          <div className="hidden sm:flex items-center gap-3 mt-3">
            {(() => {
              const vendor = (product as any).vendor_name;
              if (!vendor) return null; // Don't show vendor section if no vendor name
              const initial = vendor.charAt(0).toUpperCase() || 'C';
              return (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                    {initial}
                  </div>
                  <span className="text-sm font-medium text-zinc-700">{vendor}</span>
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">

          {/* LEFT COLUMN - CONTENT (66%) */}
          <div className="w-full lg:w-2/3">

            {/* Video Player / 3D Model / Stock Photo / Music Preview */}
            <div className="w-full h-[500px] rounded-xl overflow-hidden bg-black shadow-lg mb-8 relative group flex items-center justify-center">
              {(() => {
                const categorySlug = (product as any).category_slug?.toLowerCase() || '';
                const categoryId = (product as any).category_id;
                const isStockPhoto = categoryId === 'ba7f68c3-6f0f-4a29-a337-3b2cef7b4f47' ||
                  categorySlug === 'stock-images' ||
                  categorySlug === 'stock-photos' ||
                  (categorySlug.includes('stock') && (categorySlug.includes('photo') || categorySlug.includes('image')));
                const isMusicSfx = categoryId === '143d45f1-a55b-42be-9f51-aab507a20fac' ||
                  categorySlug === 'musics-and-sfx' ||
                  categorySlug === 'stock-musics' ||
                  categorySlug === 'music' ||
                  categorySlug === 'audio' ||
                  (categorySlug.includes('music') || categorySlug.includes('audio'));
                const isSoundEffects = categorySlug === 'sound-effects' ||
                  (categorySlug.includes('sfx') || categorySlug.includes('sound'));
                const isAudioProduct = isMusicSfx || isSoundEffects;

                if (isStockPhoto) {
                  const imageUrl = convertR2UrlToCdn((product as any).thumbnail_path) || (product as any).thumbnail_path || convertR2UrlToCdn(product.img) || product.img || '/PNG1.png';
                  return (
                    <StockPhotoViewer
                      imageUrl={imageUrl}
                      title={product.name}
                      onDownload={isSubActive ? handleDownload : undefined}
                      className="w-full h-full"
                    />
                  );
                }

                if (isAudioProduct && (product as any).audio_preview_path) {
                  return (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <SimpleMusicPlayer
                        audioUrl={convertR2UrlToCdn((product as any).audio_preview_path) || (product as any).audio_preview_path}
                        title={product.name}
                        subtitle={product.subtitle}
                        thumbnailUrl={convertR2UrlToCdn((product as any).thumbnail_path) || (product as any).thumbnail_path || convertR2UrlToCdn(product.img) || product.img || undefined}
                        className="w-full max-w-2xl"
                      />
                    </div>
                  );
                }

                // Default: 3D Model, Video, or Image
                if ((product as any).model_3d_path) {
                  return (
                    <Model3DViewerInteractive
                      modelUrl={(product as any).model_3d_path}
                      className="w-full h-full"
                    />
                  );
                }

                if ((product as any).video_path) {
                  return (
                    <VideoThumbnailPlayer
                      videoUrl={(product as any).video_path}
                      thumbnailUrl={(product as any).thumbnail_path || product.img || undefined}
                      title={product.name}
                      className="w-full h-full"
                    />
                  );
                }


                if ((product as any).thumbnail_path) {
                  return (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-100">
                      <img src={convertR2UrlToCdn((product as any).thumbnail_path) || (product as any).thumbnail_path} alt={product.name} className="max-w-full max-h-full object-contain" />
                      {(product as any).audio_preview_path && (
                        <div className="absolute bottom-4 left-4 right-4">
                          <audio src={convertR2UrlToCdn((product as any).audio_preview_path) || (product as any).audio_preview_path} controls className="w-full" />
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-100">
                    <img src={getThumbnail(product)} alt={product.name} className="max-w-full max-h-full object-contain" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                      <PlayCircle className="w-16 h-16 text-white opacity-90 drop-shadow-lg" />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Mobile Subscription Card (Hidden on Desktop) */}
            <SubscriptionCard
              isSubActive={isSubActive}
              downloading={downloading}
              handleDownload={handleDownload}
              router={router}
              className="mb-8 lg:hidden"
              isPrompt={isPromptProduct}
              handleCopyPrompt={handleCopyPrompt}
              promptCopied={promptCopied}
              user={user}
              isFree={!!product.is_free}
            />

            {/* Description / Prompt */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">
                {isPromptProduct ? 'Prompt' : 'Description'}
              </h2>

              {isPromptProduct ? (
                /* Prompt Text - Selectable and Copyable */
                <div className="relative">
                  <div
                    className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-zinc-800 leading-relaxed select-all cursor-text"
                    style={{ userSelect: 'text' }}
                  >
                    {product.subtitle && (
                      <p className="text-lg mb-3 font-medium text-violet-900">{product.subtitle}</p>
                    )}
                    <div className="whitespace-pre-line font-mono text-sm">{product.desc}</div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2 italic">
                    💡 Tip: Select the text above to copy, or use the Copy Prompt button
                  </p>
                </div>
              ) : (
                /* Regular Description */
                <div className="prose prose-zinc max-w-none text-zinc-600 leading-relaxed">
                  <p className="text-lg mb-4 font-medium text-zinc-800">{product.subtitle}</p>
                  <div className="whitespace-pre-line">{product.desc}</div>
                </div>
              )}

              {/* Features List */}
              {(() => {
                const features = product.features && typeof product.features === 'string'
                  ? JSON.parse(product.features)
                  : Array.isArray(product.features)
                    ? product.features
                    : [];
                return features.length > 0 ? (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-zinc-900 mb-3">Key Features</h3>
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {features.map((feature: any, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-zinc-600 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Tags */}
            <div className="mb-12">
              <h2 className="text-xl font-bold text-zinc-900 mb-4">Product Tags</h2>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const tags = product.tags && typeof product.tags === 'string'
                    ? JSON.parse(product.tags)
                    : Array.isArray(product.tags)
                      ? product.tags
                      : [];
                  return tags.length > 0 ? tags.map((tag: any, i: number) => (
                    <Link key={i} href={`/video-templates?search=${tag}`} className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-600 text-sm font-medium hover:bg-zinc-200 transition-colors">
                      {tag}
                    </Link>
                  )) : null;
                })()}
              </div>
            </div>

            {/* More in this style */}

          </div>


          {/* RIGHT COLUMN - STICKY SIDEBAR (33%) */}
          <div className="w-full lg:w-1/3 relative">
            <div className="sticky top-28 space-y-6">

              {/* Desktop Subscription Card (Hidden on Mobile) */}
              <SubscriptionCard
                isSubActive={isSubActive}
                downloading={downloading}
                handleDownload={handleDownload}
                router={router}
                className="hidden lg:block"
                isPrompt={isPromptProduct}
                handleCopyPrompt={handleCopyPrompt}
                promptCopied={promptCopied}
                user={user}
                isFree={!!product.is_free}
              />

              {/* Features Table / Tech Specs - Hidden for Prompts */}
              {!isPromptProduct && (
                <div className="bg-white p-2">
                  <h3 className="text-xl font-bold text-zinc-900 mb-4">Features</h3>

                  {/* Helper function to extract values from tags, features, and description */}
                  {(() => {
                    const parsedTags = product.tags && typeof product.tags === 'string'
                      ? JSON.parse(product.tags)
                      : Array.isArray(product.tags)
                        ? product.tags
                        : [];
                    const parsedFeatures = product.features && typeof product.features === 'string'
                      ? JSON.parse(product.features)
                      : Array.isArray(product.features)
                        ? product.features
                        : [];
                    const allText = [
                      ...parsedTags.map((t: any) => String(t).toLowerCase()),
                      ...parsedFeatures.map((f: any) => String(f).toLowerCase()),
                      product.desc?.toLowerCase() || '',
                      product.subtitle?.toLowerCase() || '',
                      product.name?.toLowerCase() || ''
                    ].join(' ');

                    // Extract resolution (check more specific first)
                    const getResolution = () => {
                      // Check for 4K first (most specific)
                      if (allText.includes('4k') || allText.includes('3840') || allText.includes('2160')) return '4K';
                      // Check for 1080p (more specific than just "1080")
                      if (allText.includes('1080p') || allText.includes('full hd') || allText.includes('fullhd')) return '1080p (Full HD)';
                      // Check for 720p (more specific than just "720")
                      if (allText.includes('720p')) return '720p';
                      // Check for vertical/portrait
                      if (allText.includes('vertical') || allText.includes('9:16') || allText.includes('portrait') || allText.includes('9x16')) return 'Vertical (9:16)';
                      // Fallback to generic HD if found
                      if (allText.includes('1080') && !allText.includes('1080p')) return '1080p (Full HD)';
                      if (allText.includes('720') && !allText.includes('720p')) return '720p';
                      return null;
                    };

                    // Extract length/duration
                    const getLength = () => {
                      const lengthMatch = allText.match(/(\d+(?:\.\d+)?)\s*(?:second|sec|minute|min|s|m)/i);
                      if (lengthMatch) {
                        const value = lengthMatch[1];
                        const unit = lengthMatch[0].toLowerCase().includes('min') ? 'Minutes' : 'Seconds';
                        return `${value} ${unit}`;
                      }
                      return null;
                    };

                    // Extract file size
                    const getFileSize = () => {
                      const sizeMatch = allText.match(/(\d+(?:\.\d+)?)\s*(mb|gb|kb)/i);
                      if (sizeMatch) {
                        return `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}`;
                      }
                      return null;
                    };

                    // Extract software version
                    const getSoftwareVersion = () => {
                      const versions: string[] = [];
                      if (allText.includes('cc') || allText.includes('creative cloud')) versions.push('CC');
                      if (allText.includes('cs6')) versions.push('CS6');
                      if (allText.includes('cs5')) versions.push('CS5');
                      if (allText.includes('cs4')) versions.push('CS4');
                      if (allText.includes('2024')) versions.push('2024');
                      if (allText.includes('2023')) versions.push('2023');
                      if (allText.includes('2022')) versions.push('2022');
                      if (allText.includes('2021')) versions.push('2021');
                      if (allText.includes('2020')) versions.push('2020');
                      if (allText.includes('2019')) versions.push('2019');
                      if (allText.includes('2018')) versions.push('2018');
                      return versions.length > 0 ? versions.join(', ') : null;
                    };

                    // Get software list
                    const getSoftware = () => {
                      const software = product.software && typeof product.software === 'string'
                        ? JSON.parse(product.software)
                        : Array.isArray(product.software)
                          ? product.software
                          : [];
                      if (software.length > 0) {
                        return software.join(', ');
                      }
                      return null;
                    };

                    // Get plugins
                    const getPlugins = () => {
                      const plugins = product.plugins && typeof product.plugins === 'string'
                        ? JSON.parse(product.plugins)
                        : Array.isArray(product.plugins)
                          ? product.plugins
                          : [];
                      if (plugins.length > 0) {
                        const pluginList = plugins.filter((p: any) => {
                          const pLower = String(p).toLowerCase();
                          return !pLower.includes('no plugin') && !pLower.includes('none') && pLower.trim() !== '';
                        });
                        return pluginList.length > 0 ? pluginList.join(', ') : 'No Plugin Required';
                      }
                      return 'No Plugin Required';
                    };

                    const resolution = getResolution();
                    const length = getLength();
                    const fileSize = getFileSize();
                    const softwareVersion = getSoftwareVersion();
                    const software = getSoftware();
                    const plugins = getPlugins();

                    const features = [
                      { label: 'Software', value: software },
                      { label: 'Software Version', value: softwareVersion },
                      { label: 'Resolution', value: resolution },
                      { label: 'Required Plugin', value: plugins },
                      { label: 'Length', value: length },
                      { label: 'File Size', value: fileSize },
                    ].filter(f => f.value !== null && f.value !== undefined && f.value !== '');

                    if (features.length === 0) return null;

                    return (
                      <div className="grid grid-cols-[110px_1fr] gap-y-4 text-sm">
                        {features.map((feature, idx) => (
                          <div key={idx}>
                            <div className="text-zinc-500 font-medium">{feature.label}</div>
                            <div className="text-zinc-900 font-medium">{feature.value}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Share Button Block */}
              <div className="flex justify-end pt-4 border-t border-zinc-100">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-blue-600 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  {shareFeedback || 'Share this item'}
                </button>
              </div>

              {/* Error/Feedback Toast */}
              {feedback && (
                <div className="absolute -top-16 left-0 right-0 bg-zinc-900 text-white text-xs p-3 rounded-lg shadow-xl text-center animate-in fade-in slide-in-from-bottom-2">
                  {feedback}
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Recommendations - Moved to separate container to fix sticky sidebar scrolling */}
        <div className="mt-12 w-full lg:w-2/3">
          {loadingMoreInStyle ? (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-zinc-900 mb-6">More in This Style</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-video rounded-lg bg-zinc-200 mb-3"></div>
                    <div className="h-4 bg-zinc-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-zinc-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : moreInStyleTemplates.length > 0 ? (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-zinc-900">More in This Style</h2>
                {moreInStyleTemplates.length > 4 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMoreInStyleIndex(Math.max(0, moreInStyleIndex - 1))}
                      disabled={moreInStyleIndex === 0}
                      className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      aria-label="Previous templates"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setMoreInStyleIndex(Math.min(Math.floor((moreInStyleTemplates.length - 1) / 4), moreInStyleIndex + 1))}
                      disabled={moreInStyleIndex >= Math.floor((moreInStyleTemplates.length - 1) / 4)}
                      className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      aria-label="Next templates"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {moreInStyleTemplates.slice(moreInStyleIndex * 4, (moreInStyleIndex + 1) * 4).map((item) => {
                  const itemIsMusic = isMusicItem(item);
                  return (
                    <Link key={item.slug} href={`/product/${item.slug}`} className="group">
                      <div className="aspect-video rounded-lg overflow-hidden bg-zinc-100 mb-3 relative">
                        {itemIsMusic ? (
                          // Music items - show simple thumbnail with music icon
                          <div className="relative w-full h-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500">
                            {(item as any).thumbnail_path || item.img ? (
                              <img
                                src={convertR2UrlToCdn((item as any).thumbnail_path) || (item as any).thumbnail_path || convertR2UrlToCdn(item.img) || item.img}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500"></div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/50 via-black/10 to-transparent">
                              <div className="w-14 h-14 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/40">
                                <Music2 className="w-7 h-7 text-white" />
                              </div>
                            </div>
                          </div>
                        ) : (item as any).video_path ? (
                          // Video items - show hover-to-play video player
                          <VideoThumbnailPlayer
                            videoUrl={(item as any).video_path}
                            thumbnailUrl={(item as any).thumbnail_path || item.img || undefined}
                            title={item.name}
                            className="w-full h-full"
                          />
                        ) : (
                          // Static images with hover effect
                          <>
                            <img
                              src={getThumbnail(item)}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src = '/PNG1.png';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-blue-600 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                                <PlayCircle className="w-6 h-6 fill-current" />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <h3 className="font-bold text-zinc-900 text-lg group-hover:text-blue-600 transition-colors">{item.name}</h3>
                      {(item as any).vendor_name && (
                        <p className="text-sm text-zinc-500">By {(item as any).vendor_name}</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* You May Also Like */}
          {loadingYouMayAlsoLike ? (
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-6">You May Also Like</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-video rounded-lg bg-zinc-200 mb-3"></div>
                    <div className="h-4 bg-zinc-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-zinc-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : youMayAlsoLikeTemplates.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-zinc-900">You May Also Like</h2>
                <Link href="/video-templates" className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all">→</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {youMayAlsoLikeTemplates.slice(0, 4).map((item) => {
                  const itemIsMusic = isMusicItem(item);
                  return (
                    <Link key={item.slug} href={`/product/${item.slug}`} className="group">
                      <div className="aspect-video rounded-lg overflow-hidden bg-zinc-100 mb-3 relative">
                        {itemIsMusic ? (
                          // Music items - show simple thumbnail with music icon
                          <div className="relative w-full h-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500">
                            {(item as any).thumbnail_path || item.img ? (
                              <img
                                src={convertR2UrlToCdn((item as any).thumbnail_path) || (item as any).thumbnail_path || convertR2UrlToCdn(item.img) || item.img}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500"></div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/50 via-black/10 to-transparent">
                              <div className="w-14 h-14 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/40">
                                <Music2 className="w-7 h-7 text-white" />
                              </div>
                            </div>
                          </div>
                        ) : (item as any).video_path ? (
                          // Video items - show hover-to-play video player
                          <VideoThumbnailPlayer
                            videoUrl={(item as any).video_path}
                            thumbnailUrl={(item as any).thumbnail_path || item.img || undefined}
                            title={item.name}
                            className="w-full h-full"
                          />
                        ) : (
                          // Static images with hover effect
                          <>
                            <img
                              src={getThumbnail(item)}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src = '/PNG1.png';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-blue-600 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                                <PlayCircle className="w-5 h-5 fill-current" />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <h3 className="font-bold text-zinc-900 text-sm group-hover:text-blue-600 transition-colors truncate">{item.name}</h3>
                      {(item as any).vendor_name && (
                        <p className="text-xs text-zinc-500">By {(item as any).vendor_name}</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function SubscriptionCard({ isSubActive, downloading, handleDownload, router, className, isPrompt, handleCopyPrompt, promptCopied, user, isFree }: {
  isSubActive: boolean;
  downloading: boolean;
  handleDownload: () => void;
  router: any;
  className?: string;
  isPrompt?: boolean;
  handleCopyPrompt?: () => void;
  promptCopied?: boolean;
  user?: any;
  isFree?: boolean;
}) {
  // For prompts: show Copy Prompt button (no login required)
  if (isPrompt) {
    // ... existing prompt logic ...
    return (
      <div className={cn("bg-violet-50/50 rounded-2xl p-6 border border-violet-100", className)}>
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-violet-900 mb-1">AI Prompt</h3>
          <p className="text-sm text-violet-600">Copy this prompt to use in your AI tools</p>
        </div>
        <button
          onClick={handleCopyPrompt}
          className={cn(
            "w-full py-3 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2",
            promptCopied
              ? "bg-green-500 text-white"
              : "bg-violet-600 text-white shadow-violet-600/20 hover:bg-violet-700 active:scale-[0.98]"
          )}
        >
          {promptCopied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Prompt
            </>
          )}
        </button>
      </div>
    );
  }

  // For free templates: show download button regardless of subscription
  if (isFree) {
    return (
      <div className={cn("bg-green-50/50 rounded-2xl p-6 border border-green-100", className)}>
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider mb-2">
            <Gift className="w-3 h-3" />
            Free New Year Gift
          </div>
          <h3 className="text-lg font-bold text-green-900">Download for Free</h3>
          <p className="text-xs text-green-600 mt-1">Sign in required to download</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={cn(
            "w-full py-3 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2",
            downloading
              ? "bg-green-500 text-white cursor-wait"
              : "bg-green-600 text-white shadow-green-600/20 hover:bg-green-700 active:scale-[0.98]"
          )}
        >
          {downloading ? (
            <>
              <div className="relative w-5 h-5">
                <div className="absolute inset-0 rounded-full border-2 border-white/30"></div>
                <div className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              </div>
              <span className="animate-pulse">Downloading...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Now
            </>
          )}
        </button>
        {downloading && (
          <p className="text-xs text-green-600 text-center mt-2 animate-pulse">
            Preparing your file for download...
          </p>
        )}
      </div>
    );
  }

  // For subscribed users, show only the download button
  if (isSubActive) {
    return (
      // ... existing active sub logic ...
      <div className={cn("bg-blue-50/50 rounded-2xl p-6 border border-blue-100", className)}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={cn(
            "w-full py-3 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2",
            downloading
              ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white cursor-wait"
              : "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98]"
          )}
        >
          {downloading ? (
            <>
              <div className="relative w-5 h-5">
                <div className="absolute inset-0 rounded-full border-2 border-white/30"></div>
                <div className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              </div>
              <span className="animate-pulse">Downloading...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Now
            </>
          )}
        </button>
        {downloading && (
          <p className="text-xs text-blue-600 text-center mt-2 animate-pulse">
            Preparing your file for download...
          </p>
        )}
      </div>
    );
  }

  // For non-subscribed users, show the full subscription card
  return (
    <div className={cn("bg-blue-50/50 rounded-2xl p-6 border border-blue-100", className)}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold text-blue-900">Monthly</h3>
          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded">
            Limited Offer
          </span>
        </div>
        <span className="bg-blue-900 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm shadow-blue-900/20 flex items-center gap-1">
          <Star className="w-3 h-3 fill-current" /> Popular
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-sm text-blue-400 line-through font-medium">₹899</span>
        <span className="text-3xl font-bold text-blue-700">₹799</span>
        <span className="text-sm text-blue-600/80 font-medium">/ month</span>
      </div>
      <p className="text-xs text-blue-600/70 mb-6 leading-relaxed">
        Best balance for creators who want full premium access
      </p>

      <ul className="space-y-3 mb-8">
        {[
          'Unlimited AE Templates',
          'Stock Music & SFX',
          'Stock Images & 3D Models',
          'Unlimited Downloads',
          'Commercial License'
        ].map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-[13px] text-blue-900 font-medium">
            <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="truncate">{item}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => router.push('/pricing')}
        className="w-full py-3 rounded-lg bg-blue-900 text-white font-bold text-sm shadow-xl shadow-blue-900/10 hover:bg-blue-800 active:scale-[0.98] transition-all"
      >
        Subscribe to Download
      </button>
    </div>
  );
}

