"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function PromoBanner() {
    return (
        <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-2 sm:py-4 px-6 sm:px-8 shadow-md">
            <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
                    <span className="whitespace-nowrap font-bold">🎉 3rd Anniversary Offer</span>
                    <span className="whitespace-nowrap">₹499 for monthly</span>
                    <span className="font-bold whitespace-nowrap">Unlimited Downloads</span>
                </div>

                <Link
                    href="/pricing?plan=monthly"
                    className="bg-white text-indigo-600 px-3 sm:px-4 py-1 rounded-full text-[10px] sm:text-xs font-bold hover:bg-blue-50 transition-all duration-300 hover:scale-105 flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm"
                >
                    Get it now
                    <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-pulse" />
                </Link>
            </div>
        </div>
    );
}
