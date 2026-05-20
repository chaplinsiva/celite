import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "../components/LayoutWrapper";
import GoogleAnalytics from "../components/GoogleAnalytics";
import { AppProvider } from "../context/AppContext";
import { LoginModalProvider } from "../context/LoginModalContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import SnowEffect from "../components/SnowEffect";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://celite.in'),
  title: {
    default: 'Celite – Premium After Effects Templates | Wedding, Save the Date & Video Templates',
    template: '%s | Celite',
  },
  description: 'Download premium After Effects templates: wedding save the date videos, cinematic intros, logo reveals, motion graphics, and more. Free & premium AE templates, 3D models, stock photos, music & SFX. The best wedding video template marketplace.',
  keywords: [
    'after effects templates',
    'wedding template after effects',
    'save the date template',
    'save the date after effects',
    'wedding video template',
    'video templates',
    'motion graphics templates',
    'ae templates free download',
    'wedding intro after effects',
    'free after effects templates',
    'cinematic template',
    'wedding slideshow template',
    'after effects wedding invitation',
    '3D models',
    'stock photos',
    'royalty free music',
    'sound effects',
    'AI prompts',
    'digital assets',
    'creative templates',
  ],
  authors: [{ name: 'Celite' }],
  creator: 'Celite',
  publisher: 'Celite',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://celite.in',
    siteName: 'Celite',
    title: 'Celite – Premium After Effects Templates | Wedding & Save the Date Video Templates',
    description: 'Download premium After Effects templates for weddings, save the date videos, cinematic intros, and more. Free & premium AE templates with unlimited downloads.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Celite - Premium After Effects Templates for Weddings & Creative Projects',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Celite – Premium After Effects & Wedding Video Templates',
    description: 'Download premium wedding save the date, cinematic intro & motion graphics templates for After Effects. Unlimited downloads.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon/fav.png', type: 'image/png' },
    ],
    shortcut: '/favicon/fav.png',
    apple: '/favicon/fav.png',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-WQE6FX8VET';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon/fav.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon/fav.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon/fav.png" />

        {/* Structured Data for Sitelinks */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Celite",
              "alternateName": ["Celite Digital Assets", "Celite Templates", "Celite Wedding Templates", "Celite After Effects Templates"],
              "url": "https://celite.in",
              "description": "Download premium After Effects templates for weddings, save the date videos, cinematic intros, logo reveals, and motion graphics. The best wedding video template marketplace with free & premium AE templates.",
              "potentialAction": [
                {
                  "@type": "SearchAction",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "https://celite.in/templates?search={search_term_string}"
                  },
                  "query-input": "required name=search_term_string"
                }
              ],
              "publisher": {
                "@type": "Organization",
                "name": "Celite",
                "url": "https://celite.in",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://celite.in/logo.png"
                }
              }
            })
          }}
        />

        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Celite",
              "url": "https://celite.in",
              "logo": "https://celite.in/logo.png",
              "description": "Premium digital assets marketplace offering After Effects templates for weddings, save the date videos, cinematic intros, 3D models, stock photos, music, SFX, and AI prompts. Download free and premium AE templates.",
              "sameAs": [
                "https://twitter.com/celite",
                "https://facebook.com/celite",
                "https://instagram.com/celite"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "url": "https://celite.in/contact"
              },
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "After Effects Templates",
                "itemListElement": [
                  {
                    "@type": "OfferCatalog",
                    "name": "Wedding & Save the Date Templates",
                    "itemListElement": [
                      { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Save the Date After Effects Templates" } },
                      { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Wedding Invitation Video Templates" } },
                      { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Wedding Slideshow Templates" } }
                    ]
                  },
                  {
                    "@type": "OfferCatalog",
                    "name": "Cinema & Video Templates",
                    "itemListElement": [
                      { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Cinematic Intro Templates" } },
                      { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Logo Reveal Templates" } }
                    ]
                  }
                ]
              }
            })
          }}
        />

        {/* SiteNavigationElement for Sitelinks */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "SiteNavigationElement",
                  "name": "Save the Date Templates",
                  "url": "https://celite.in/save-date"
                },
                {
                  "@type": "SiteNavigationElement",
                  "name": "Video Templates",
                  "url": "https://celite.in/video-templates"
                },
                {
                  "@type": "SiteNavigationElement",
                  "name": "3D Models",
                  "url": "https://celite.in/3d-models"
                },
                {
                  "@type": "SiteNavigationElement",
                  "name": "Stock Photos",
                  "url": "https://celite.in/stock-photos"
                },
                {
                  "@type": "SiteNavigationElement",
                  "name": "Music & SFX",
                  "url": "https://celite.in/music-sfx"
                },
                {
                  "@type": "SiteNavigationElement",
                  "name": "AI Prompts",
                  "url": "https://celite.in/prompts"
                },
                {
                  "@type": "SiteNavigationElement",
                  "name": "Graphics",
                  "url": "https://celite.in/graphics"
                },
                {
                  "@type": "SiteNavigationElement",
                  "name": "Pricing",
                  "url": "https://celite.in/pricing"
                },
                {
                  "@type": "SiteNavigationElement",
                  "name": "Start Selling",
                  "url": "https://celite.in/start-selling"
                }
              ]
            })
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased bg-background text-zinc-900 group/body`} style={{ fontStyle: 'normal', fontSynthesis: 'none' }}>
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
        <AppProvider>
          <LoginModalProvider>
            <GoogleAnalytics />
            <SpeedInsights />
            <Analytics />
            <SnowEffect />
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </LoginModalProvider>
        </AppProvider>
      </body>
    </html>
  );
}
