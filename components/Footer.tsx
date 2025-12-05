"use client";

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-zinc-50 border-t border-zinc-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <span className="text-2xl font-bold text-black">
                Celite
              </span>
            </Link>
            <p className="text-sm text-zinc-500 max-w-md leading-relaxed">
              Professional marketplace for premium digital assets. Elevate your creative projects with our curated collection of After Effects templates, website themes, and more.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold text-zinc-900 mb-4 uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="text-zinc-500 hover:text-violet-600 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/templates" className="text-zinc-500 hover:text-violet-600 transition-colors">
                  All Templates
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-zinc-500 hover:text-violet-600 transition-colors">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-zinc-500 hover:text-violet-600 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-zinc-500 hover:text-violet-600 transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-sm font-bold text-zinc-900 mb-4 uppercase tracking-wider">Legal</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/privacy-policy" className="text-zinc-500 hover:text-violet-600 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="text-zinc-500 hover:text-violet-600 transition-colors">
                  Licensing Terms
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="text-zinc-500 hover:text-violet-600 transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-zinc-500 hover:text-violet-600 transition-colors">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Info & Copyright */}
        <div className="mt-12 pt-8 border-t border-zinc-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900">Email:</span>
                <a href="mailto:elitechaplin@gmail.com" className="hover:text-violet-600 transition-colors">
                  elitechaplin@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900">Phone:</span>
                <a href="tel:8939079627" className="hover:text-violet-600 transition-colors">
                  +91 89390 79627
                </a>
              </div>
            </div>
            <p>© {new Date().getFullYear()} Celite. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

