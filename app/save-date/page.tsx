import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import VideoTemplatesClient from '../video-templates/VideoTemplatesClient';
import LoadingSpinnerServer from '../../components/ui/loading-spinner-server';

export const metadata: Metadata = {
  title: 'Save the Date Templates for After Effects | Wedding Video Templates 2026',
  description:
    'Download premium Save the Date video templates for Adobe After Effects. Beautiful wedding invitation templates, romantic motion graphics, and customizable wedding video intros. Free & premium AE templates.',
  keywords: [
    'save the date template',
    'save the date after effects',
    'wedding template after effects',
    'wedding video template',
    'save the date video',
    'wedding invitation template',
    'after effects wedding',
    'wedding intro template',
    'wedding ae template',
    'save the date motion graphics',
    'wedding save the date',
    'wedding video intro',
    'romantic video template',
    'marriage invitation template',
    'wedding slideshow template',
    'free wedding template after effects',
    'wedding opener after effects',
    'engagement video template',
    'wedding title template ae',
    'save the date animation',
  ],
  openGraph: {
    title: 'Save the Date Templates for After Effects | Wedding Video Templates',
    description: 'Download premium Save the Date & wedding video templates for Adobe After Effects. Beautiful, customizable motion graphics for your wedding.',
    url: 'https://celite.in/save-date',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Save the Date After Effects Templates - Celite',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Save the Date Templates for After Effects | Celite',
    description: 'Premium wedding save the date video templates for After Effects. Download customizable AE templates for wedding invitations.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://celite.in/save-date',
  },
};

export const revalidate = 60;

export default async function SaveDatePage() {
  const supabase = getSupabaseServerClient();

  const { data: saveDateCategory, error: catError } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'save-date')
    .maybeSingle();

  if (catError) {
    console.error('Save Date category lookup failed:', catError);
  }

  let templates: any[] = [];

  if (saveDateCategory) {
    const { data, error } = await supabase
      .from('templates')
      .select(
        'slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,features,software,plugins,tags,created_at,category_id,subcategory_id,sub_subcategory_id,feature,vendor_name,status,creator_shop_id'
      )
      .eq('status', 'approved')
      .eq('category_id', saveDateCategory.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching save date templates:', error);
    } else {
      templates = data || [];
    }
  }

  const mappedTemplates = templates.map((t) => ({
    ...t,
    price: 0,
    is_featured: Boolean((t as any).feature),
    feature: Boolean((t as any).feature),
  }));

  // Structured Data: CollectionPage + ItemList for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Save the Date Templates for After Effects",
    "description": "Download premium Save the Date video templates for Adobe After Effects. Beautiful wedding invitation templates and romantic motion graphics.",
    "url": "https://celite.in/save-date",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Celite",
      "url": "https://celite.in"
    },
    "about": {
      "@type": "Thing",
      "name": "Wedding Save the Date Video Templates",
      "description": "Professional After Effects templates for wedding save the date videos, invitations, and romantic motion graphics."
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Save the Date After Effects Templates",
      "numberOfItems": mappedTemplates.length,
      "itemListElement": mappedTemplates.slice(0, 10).map((t, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": t.name,
        "url": `https://celite.in/product/${t.slug}`,
      })),
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://celite.in" },
        { "@type": "ListItem", "position": 2, "name": "Video Templates", "item": "https://celite.in/video-templates" },
        { "@type": "ListItem", "position": 3, "name": "Save the Date Templates", "item": "https://celite.in/save-date" },
      ]
    }
  };

  // FAQ structured data for the save-date page
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is a Save the Date template for After Effects?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A Save the Date template for After Effects is a pre-designed motion graphics project file (.aep) that allows you to create professional wedding save-the-date videos. You simply customize the text, colors, photos, and dates to match your wedding theme, then render and share with guests."
        }
      },
      {
        "@type": "Question",
        "name": "How do I use wedding templates in After Effects?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Download the template .aep file, open it in Adobe After Effects (CC 2020 or later recommended), replace the placeholder text and images with your wedding details, customize colors and fonts, then render the final video to share via social media, email, or messaging apps."
        }
      },
      {
        "@type": "Question",
        "name": "Are these wedding After Effects templates free to download?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Celite offers both free and premium wedding After Effects templates. With a Celite subscription starting at ₹458/month, you get unlimited access to all premium save the date and wedding templates, along with stock music, sound effects, and other creative assets."
        }
      },
      {
        "@type": "Question",
        "name": "Can I customize the save the date video template with my own photos?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! All our Save the Date templates are fully customizable. You can replace photos, change text, modify colors, adjust timing, and add your own music. No advanced After Effects knowledge is required—each template includes easy-to-edit placeholders."
        }
      },
      {
        "@type": "Question",
        "name": "What resolution are the wedding video templates?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Most of our wedding and save the date templates are available in Full HD (1920×1080) and 4K (3840×2160) resolution. Many also include vertical (9:16) versions optimized for Instagram Stories and WhatsApp Status."
        }
      }
    ]
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      {/* SEO-Rich Content Section (visible to search engines, above the fold) */}
      <section className="bg-gradient-to-b from-rose-50 to-white pt-24 pb-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-900 tracking-tight mb-4">
            Save the Date Templates for After Effects
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto mb-2">
            Download premium <strong>wedding save the date video templates</strong> for Adobe After Effects. 
            Create stunning wedding invitations, romantic slideshows, and beautiful motion graphics 
            for your special day. Fully customizable AE project files.
          </p>
          <p className="text-sm text-zinc-500 max-w-xl mx-auto">
            Browse {mappedTemplates.length}+ professional save the date &amp; wedding templates — from elegant minimalist designs to luxurious cinematic openers.
          </p>
        </div>
      </section>

      <Suspense fallback={<LoadingSpinnerServer message="Loading templates..." />}>
        <VideoTemplatesClient
          initialTemplates={mappedTemplates as any}
          pageTitle="Save the Date Templates"
          pageSubtitle="Wedding save the dates, invitations, and romantic video templates for After Effects — ready to customize and download."
          breadcrumbLabel="Save the Date"
          basePath="/save-date"
        />
      </Suspense>

      {/* SEO-Rich FAQ Section (crawlable text content) */}
      <section className="bg-white py-12 px-4 sm:px-6 border-t border-zinc-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-8 text-center">
            Frequently Asked Questions About Save the Date Templates
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">What is a Save the Date template for After Effects?</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                A Save the Date template for After Effects is a pre-designed motion graphics project file (.aep) that allows you to create professional wedding save-the-date videos. You simply customize the text, colors, photos, and dates to match your wedding theme, then render and share with guests.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">How do I use wedding templates in After Effects?</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Download the template .aep file, open it in Adobe After Effects (CC 2020 or later recommended), replace the placeholder text and images with your wedding details, customize colors and fonts, then render the final video to share via social media, email, or messaging apps.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Are these wedding After Effects templates free to download?</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Celite offers both free and premium wedding After Effects templates. With a Celite subscription starting at ₹458/month, you get unlimited access to all premium save the date and wedding templates, along with stock music, sound effects, and other creative assets.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Can I customize the save the date video template with my own photos?</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Yes! All our Save the Date templates are fully customizable. You can replace photos, change text, modify colors, adjust timing, and add your own music. No advanced After Effects knowledge is required—each template includes easy-to-edit placeholders.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">What resolution are the wedding video templates?</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Most of our wedding and save the date templates are available in Full HD (1920×1080) and 4K (3840×2160) resolution. Many also include vertical (9:16) versions optimized for Instagram Stories and WhatsApp Status.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Internal Linking Section for SEO */}
      <section className="bg-zinc-50 py-8 px-4 sm:px-6 border-t border-zinc-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">Related Template Categories</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="/video-templates" className="px-4 py-2 bg-white border border-zinc-200 rounded-full text-sm text-zinc-700 hover:border-blue-500 hover:text-blue-600 transition-colors">
              Cinema Templates
            </a>
            <a href="/templates" className="px-4 py-2 bg-white border border-zinc-200 rounded-full text-sm text-zinc-700 hover:border-blue-500 hover:text-blue-600 transition-colors">
              All Templates
            </a>
            <a href="/music-sfx" className="px-4 py-2 bg-white border border-zinc-200 rounded-full text-sm text-zinc-700 hover:border-blue-500 hover:text-blue-600 transition-colors">
              Wedding Music &amp; SFX
            </a>
            <a href="/pricing" className="px-4 py-2 bg-white border border-zinc-200 rounded-full text-sm text-zinc-700 hover:border-blue-500 hover:text-blue-600 transition-colors">
              Pricing Plans
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
