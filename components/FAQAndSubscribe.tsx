"use client";

import React, { useState } from 'react';
import { Plus, Minus, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const faqs = [
    {
        question: "What is Celite?",
        answer: "Celite is an all-in-one creative marketplace providing premium video templates, 3D models, artistic photography, and high-quality digital assets for creators of all levels."
    },
    {
        question: "What kind of assets can I find here?",
        answer: "Our ecosystem includes everything from motion graphics and cinematography templates to professional 3D models and unique artistic stock photos designed to elevate your projects."
    },
    {
        question: "How do I use these assets?",
        answer: "Whether you're a video editor, web designer, or 3D artist, our assets are designed for compatibility with industry-standard software and modern creative workflows."
    },
    {
        question: "What does the license cover?",
        answer: "Every purchase includes a standard commercial license. This allows you to use your downloaded assets in both personal projects and professional client work worldwide."
    }
];

export default function FAQAndSubscribe() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="w-full py-12 md:py-20 bg-background px-4 sm:px-6 border-t border-zinc-100">
            <div className="max-w-[1400px] mx-auto">
                {/* Header Section - Now at the Top */}
                <div className="mb-12 text-center lg:text-left">
                    <h2 className="text-2xl md:text-4xl font-black text-black tracking-tighter mb-2">
                        Common Questions
                    </h2>
                    <p className="text-zinc-500 text-sm md:text-base font-medium">
                        Quick answers to everything you need to know about Celite.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-start">
                    {/* Left Column: FAQ Bars */}
                    <div className="space-y-2">
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="group border border-zinc-200 bg-white hover:border-black/20 transition-all duration-300"
                            >
                                <button
                                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                    className="w-full flex items-center justify-between p-4 md:p-5 text-left"
                                >
                                    <span className="text-base md:text-lg font-bold text-black tracking-tight">
                                        {faq.question}
                                    </span>
                                    <div className="flex-shrink-0 ml-4">
                                        {openIndex === index ? (
                                            <Minus className="w-4 h-4 text-black" />
                                        ) : (
                                            <Plus className="w-4 h-4 text-zinc-400 group-hover:text-black transition-colors" />
                                        )}
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {openIndex === index && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 md:p-5 pt-0 text-zinc-600 text-xs md:text-sm leading-relaxed max-w-2xl">
                                                {faq.answer}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>

                    {/* Right Column: Subscribe Box */}
                    <div className="w-full">
                        <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl border border-zinc-100 relative overflow-hidden group h-full">
                            {/* Subtle background glow */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-600/5 blur-[60px] rounded-full group-hover:bg-violet-600/10 transition-colors duration-700" />

                            <h2 className="text-2xl md:text-3xl font-black text-black tracking-tight mb-4">
                                Subscribe Celite
                            </h2>
                            <p className="text-zinc-600 text-sm md:text-base mb-8 font-medium leading-relaxed">
                                Get unlimited access to premium After Effects templates, stock video, music, and more. Join our creative community and elevate your projects.
                            </p>

                            <Link
                                href="/pricing"
                                className="inline-flex items-center justify-center w-full py-4 px-6 bg-black text-white rounded-xl font-black text-base hover:bg-zinc-800 transition-all shadow-lg active:scale-[0.98] group/btn"
                            >
                                Subscribe Now
                                <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>

                            <p className="mt-4 text-center text-zinc-400 text-xs font-medium">
                                Start your creative journey today.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
