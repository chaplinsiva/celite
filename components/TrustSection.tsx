"use client";

import { ShieldCheck, Zap, Globe, Clock, MessageSquare, Download } from 'lucide-react';

const features = [
    {
        icon: <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-violet-600" />,
        title: "Commercial License",
        description: "Use our templates in personal and commercial projects worldwide."
    },
    {
        icon: <Zap className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-blue-600" />,
        title: "Fast Downloads",
        description: "High-speed server downloads for all your assets, anytime."
    },
    {
        icon: <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-blue-600" />,
        title: "Premium Support",
        description: "Direct support from authors to help you with customization."
    },
    {
        icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-orange-600" />,
        title: "Daily Updates",
        description: "New templates added daily to keep your content fresh."
    }
];

export default function TrustSection() {
    return (
        <section className="relative w-full py-8 sm:py-12 md:py-20 bg-background border-y border-zinc-100">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
                <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 md:mb-16">
                    <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold text-zinc-900 mb-2 sm:mb-4">
                        Why Creators Trust Celite
                    </h2>
                    <p className="text-sm sm:text-base md:text-lg text-zinc-500 px-2">
                        Join thousands of professional video editors, designers, and agencies who rely on our marketplace.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-zinc-100 shadow-sm hover:shadow-lg transition-shadow duration-300"
                        >
                            <div className="mb-3 sm:mb-4 md:mb-6 w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-zinc-50 flex items-center justify-center">
                                {feature.icon}
                            </div>
                            <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-zinc-900 mb-1.5 sm:mb-2 md:mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-xs sm:text-sm md:text-base text-zinc-500 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>


            </div>
        </section>
    );
}
