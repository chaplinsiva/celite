"use client";

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-black border-t border-white/10 mt-auto">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <span className="text-2xl font-bold text-white">
                Celite
              </span>
            </Link>
            <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
              Professional marketplace for premium digital assets. Elevate your creative projects with our curated collection of After Effects templates, website themes, and more.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/video-templates" className="text-zinc-400 hover:text-white transition-colors">
                  All Templates
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-zinc-400 hover:text-white transition-colors">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-zinc-400 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-zinc-400 hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Legal</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/privacy-policy" className="text-zinc-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="text-zinc-400 hover:text-white transition-colors">
                  Licensing Terms
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="text-zinc-400 hover:text-white transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Info & Copyright */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-400">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Email:</span>
                <a href="mailto:elitechaplin@gmail.com" className="hover:text-white transition-colors">
                  elitechaplin@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Phone:</span>
                <a href="tel:8939079627" className="hover:text-white transition-colors">
                  +91 89390 79627
                </a>
              </div>
            </div>
            <p className="text-zinc-500">© {new Date().getFullYear()} Celite. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

