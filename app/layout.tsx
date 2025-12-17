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

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Celite - Professional After Effects Templates",
  description: "Discover premium After Effects templates for logo reveals, slideshows, and more",
  icons: {
    icon: [
      { url: '/favicon/fav.png', type: 'image/png' },
    ],
    shortcut: '/favicon/fav.png',
    apple: '/favicon/fav.png',
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
      </head>
      <body className={`${inter.variable} antialiased bg-white text-zinc-900 group/body`} style={{ fontStyle: 'normal', fontSynthesis: 'none' }}>
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
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </LoginModalProvider>
        </AppProvider>
      </body>
    </html>
  );
}
