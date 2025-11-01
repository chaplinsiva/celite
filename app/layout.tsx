import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import GoogleAnalytics from "../components/GoogleAnalytics";
import { AppProvider } from "../context/AppContext";
import { LoginModalProvider } from "../context/LoginModalContext";

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
      <body className="antialiased">
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
            <div className="isolate flex flex-col min-h-screen">
            <Header />
            <GoogleAnalytics />
              <main className="flex-1">
            {children}
              </main>
              <Footer />
            </div>
          </LoginModalProvider>
        </AppProvider>
      </body>
    </html>
  );
}
