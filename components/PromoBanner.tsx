"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function PromoBanner() {
    return (
        <div className="w-full bg-gradient-to-r from-blue-500 via-rose-400 to-blue-600 text-white py-2 sm:py-4 px-6 sm:px-8">
            <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
                    <span className="whitespace-nowrap font-bold">🎉 Pongal Offer</span>
                    <span className="whitespace-nowrap">3 Downloads/Week</span>
                    <span className="font-bold whitespace-nowrap">₹499</span>
                    <span className="hidden xs:inline whitespace-nowrap">for 3 weeks</span>
                    <span className="xs:hidden whitespace-nowrap">3 weeks</span>
                </div>

                <Link
                    href="/pricing?plan=pongal"
                    className="bg-white text-blue-600 px-3 sm:px-4 py-1 rounded-full text-[10px] sm:text-xs font-bold hover:bg-blue-50 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                    Get it now
                    <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </Link>
            </div>
        </div>
    );
}
