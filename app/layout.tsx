import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "../components/LayoutWrapper";
import GoogleAnalytics from "../components/GoogleAnalytics";
import { AppProvider } from "../context/AppContext";
import { LoginModalProvider } from "../context/LoginModalContext";

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
      { url: '/celite.png', type: 'image/png' },
    ],
    shortcut: '/celite.png',
    apple: '/celite.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-WQE6FX8VET';
  
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-black`} style={{ fontStyle: 'normal', fontSynthesis: 'none' }}>
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
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </LoginModalProvider>
        </AppProvider>
      </body>
    </html>
  );
}
