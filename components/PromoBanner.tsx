"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function PromoBanner() {
    return (
        <div className="w-full bg-blue-600 text-white py-2 sm:py-4 px-6 sm:px-8">
            <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
                    <span className="whitespace-nowrap">Limited offer</span>
                    <span className="line-through opacity-70 whitespace-nowrap">₹899</span>
                    <span className="font-bold whitespace-nowrap">₹799</span>
                    <span className="hidden xs:inline whitespace-nowrap">for monthly</span>
                    <span className="xs:hidden whitespace-nowrap">monthly</span>
                </div>

                <Link
                    href="/pricing"
                    className="bg-black text-white px-3 sm:px-4 py-1 rounded-full text-[10px] sm:text-xs font-bold hover:bg-zinc-900 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                    Get it now
                    <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </Link>
            </div>
        </div>
    );
}
