"use client";

import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
    {
        question: "What is Celite?",
        answer: "Celite is a premium marketplace for professional video editors and creators. We provide high-quality After Effects templates, stock footages, 3D models, and artistic assets to help you create stunning visual content in minutes."
    },
    {
        question: "Do I need professional software to use the templates?",
        answer: "Most of our video templates are designed for Adobe After Effects. However, we also offer mobile-friendly templates and standalone assets like stock photos and music that can be used in any editing software."
    },
    {
        question: "Is there a commercial license included?",
        answer: "Yes! Every template purchased or downloaded from Celite comes with a standard commercial license, allowing you to use it in both personal and client projects worldwide."
    },
    {
        question: "Can I cancel my subscription anytime?",
        answer: "Absolutely. Our subscription plans are flexible. You can manage your account settings and cancel your subscription at any time with no hidden fees or long-term commitments."
    },
    {
        question: "How often are new templates added?",
        answer: "Our library is updated daily. Our team of world-class creators is constantly uploading fresh content to ensure you always have access to the latest design trends and tools."
    }
];

export default function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="w-full py-8 md:py-12 bg-background px-4 sm:px-6 border-t border-zinc-100">
            <div className="max-w-[800px] mx-auto">
                <div className="mb-8 text-center md:text-left">
                    <h2 className="text-2xl md:text-4xl font-black text-black tracking-tighter mb-2">
                        Common Questions
                    </h2>
                    <p className="text-zinc-500 text-sm md:text-base font-medium">
                        Everything you need to know about the Celite ecosystem.
                    </p>
                </div>

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
            </div>
        </section>
    );
}
