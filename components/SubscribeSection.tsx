"use client";

import React from 'react';
import { Mail, Sparkles } from 'lucide-react';

const quotes = [
    {
        text: "Creativity is intelligence having fun.",
        author: "Albert Einstein"
    },
    {
        text: "Design is not just what it looks like and feels like. Design is how it works.",
        author: "Steve Jobs"
    }
];

export default function SubscribeSection() {
    return (
        <section className="w-full py-12 md:py-20 bg-background px-4 sm:px-6 relative overflow-hidden">
            {/* Decorative background elements - subtler for light bg */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 blur-[120px] rounded-full -mr-64 -mt-64" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -ml-64 -mb-64" />

            <div className="max-w-[1400px] mx-auto relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 md:gap-20 items-center">

                    {/* Left Column: Quotes */}
                    <div className="space-y-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/5 border border-zinc-900/10 text-zinc-900/80 text-sm font-medium">
                            <Sparkles className="w-4 h-4 text-violet-600" />
                            Creative Inspiration
                        </div>

                        <div className="space-y-8">
                            {quotes.map((quote, index) => (
                                <div key={index} className="max-w-xl">
                                    <p className="text-2xl md:text-3xl font-light text-black italic tracking-tight leading-snug">
                                        "{quote.text}"
                                    </p>
                                    <p className="mt-4 text-zinc-400 font-bold uppercase tracking-widest text-xs">
                                        — {quote.author}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Subscribe Form */}
                    <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-zinc-100">
                        <h2 className="text-3xl md:text-4xl font-black text-black tracking-tight mb-4">
                            Subscribe Celite
                        </h2>
                        <p className="text-zinc-600 text-lg mb-8 font-medium">
                            Get the latest templates, creative tips, and exclusive offers straight to your inbox.
                        </p>

                        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                <input
                                    type="email"
                                    placeholder="Enter your email address"
                                    className="w-full pl-12 pr-4 py-5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-black font-medium"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-5 bg-black text-white rounded-2xl font-black text-lg hover:bg-zinc-800 transition-all shadow-xl hover:shadow-2xl active:scale-[0.98]"
                            >
                                Join the Community
                            </button>
                        </form>

                        <p className="mt-6 text-center text-zinc-400 text-sm">
                            No spam. Just high-quality creative assets.
                        </p>
                    </div>

                </div>
            </div>
        </section>
    );
}
