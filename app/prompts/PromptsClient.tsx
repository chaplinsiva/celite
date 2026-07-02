'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, Sparkles, Filter, Grid, List, Copy, Check } from 'lucide-react';
import VideoThumbnailPlayer from '../../components/VideoThumbnailPlayer';
import { convertR2UrlToCdn } from '../../lib/utils';
import { useAppContext } from '../../context/AppContext';
import { useLoginModal } from '../../context/LoginModalContext';

type Subcategory = {
    id: string;
    name: string;
    slug: string;
    category_id: string;
};

type Template = {
    slug: string;
    name: string;
    subtitle?: string;
    description?: string;
    img?: string;
    video?: string;
    video_path?: string;
    thumbnail_path?: string;
    features?: string[];
    software?: string[];
    tags?: string[];
    created_at?: string;
    subcategory_id?: string;
    feature?: boolean;
};

interface PromptsClientProps {
    initialTemplates: Template[];
    subcategories: Subcategory[];
}

export default function PromptsClient({ initialTemplates, subcategories }: PromptsClientProps) {
    const { user } = useAppContext();
    const { openLoginModal } = useLoginModal();
    const searchParams = useSearchParams();
    const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
        searchParams.get('subcategory')
    );
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

    // Copy prompt handler - no login required
    const handleCopyPrompt = async (e: React.MouseEvent, template: Template) => {
        e.preventDefault();
        e.stopPropagation();

        const promptText = template.description || template.subtitle || template.name;
        try {
            await navigator.clipboard.writeText(promptText);
            setCopiedSlug(template.slug);
            setTimeout(() => setCopiedSlug(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Filter templates by selected subcategory
    const filteredTemplates = useMemo(() => {
        if (!selectedSubcategory) return initialTemplates;

        const subcategory = subcategories.find(s => s.slug === selectedSubcategory);
        if (!subcategory) return initialTemplates;

        return initialTemplates.filter(t => t.subcategory_id === subcategory.id);
    }, [initialTemplates, selectedSubcategory, subcategories]);

    // Group templates by subcategory for display
    const templatesBySubcategory = useMemo(() => {
        const grouped: Record<string, Template[]> = {};

        subcategories.forEach(sub => {
            grouped[sub.id] = initialTemplates.filter(t => t.subcategory_id === sub.id);
        });

        // Add uncategorized templates
        grouped['uncategorized'] = initialTemplates.filter(
            t => !t.subcategory_id || !subcategories.find(s => s.id === t.subcategory_id)
        );

        return grouped;
    }, [initialTemplates, subcategories]);

    return (
        <div className="min-h-screen bg-background">
            {/* Header Section - Compact */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white">
                <div className="max-w-[1440px] mx-auto px-6 py-8">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-1.5 text-xs text-white/70 mb-4">
                        <Link href="/" className="hover:text-white transition-colors">Home</Link>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-white font-medium">Prompts</span>
                    </nav>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">AI Prompts</h1>
                            <p className="text-sm text-white/80">
                                Professional prompts for ChatGPT, Midjourney, DALL-E & more
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subcategories Section */}
            {subcategories.length > 0 && (
                <div className="max-w-[1440px] mx-auto px-6 py-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Filter className="w-5 h-5 text-zinc-500" />
                        <h2 className="text-lg font-semibold text-zinc-800">Browse by Category</h2>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setSelectedSubcategory(null)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!selectedSubcategory
                                ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                }`}
                        >
                            All Prompts
                        </button>
                        {subcategories.map((sub) => {
                            const count = templatesBySubcategory[sub.id]?.length || 0;
                            return (
                                <button
                                    key={sub.id}
                                    onClick={() => setSelectedSubcategory(sub.slug)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${selectedSubcategory === sub.slug
                                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                        }`}
                                >
                                    {sub.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Templates Grid */}
            <div className="max-w-[1440px] mx-auto px-6 pb-16">


                {filteredTemplates.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-zinc-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-zinc-800 mb-2">No prompts found</h3>
                        <p className="text-zinc-500 mb-6">
                            {selectedSubcategory
                                ? 'No prompts in this category yet. Check back soon!'
                                : 'No prompts available yet. Check back soon!'}
                        </p>
                        {selectedSubcategory && (
                            <button
                                onClick={() => setSelectedSubcategory(null)}
                                className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                            >
                                View All Prompts
                            </button>
                        )}
                    </div>
                ) : (
                    /* Collage/Masonry Grid Layout - Larger Images */
                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                        {filteredTemplates.map((template) => (
                            <div
                                key={template.slug}
                                className="group relative break-inside-avoid rounded-xl overflow-hidden cursor-pointer"
                            >
                                {/* Thumbnail Only - Clean Display */}
                                <Link href={`/product/${template.slug}`}>
                                    {(template.thumbnail_path || template.img) ? (
                                        <img
                                            src={convertR2UrlToCdn(template.thumbnail_path || template.img) || template.thumbnail_path || template.img}
                                            alt={template.name}
                                            className="w-full h-auto object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full aspect-square flex items-center justify-center bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl">
                                            <Sparkles className="w-12 h-12 text-violet-300" />
                                        </div>
                                    )}
                                </Link>

                                {/* Hover Overlay - Shows title and copy button */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl pointer-events-none">
                                    {/* Title at Bottom */}
                                    <Link href={`/product/${template.slug}`} className="absolute bottom-0 left-0 right-0 p-3 pointer-events-auto">
                                        <h3 className="text-white font-medium text-sm line-clamp-2 drop-shadow-lg">
                                            {template.name}
                                        </h3>
                                        {template.subcategory_id && (
                                            <span className="inline-block text-[10px] text-white/80 mt-1">
                                                {subcategories.find(s => s.id === template.subcategory_id)?.name || 'Prompt'}
                                            </span>
                                        )}
                                    </Link>
                                </div>

                                {/* Copy Button - Top Right Corner */}
                                <button
                                    onClick={(e) => handleCopyPrompt(e, template)}
                                    className={`absolute top-2 right-2 p-2 rounded-full opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300 shadow-lg ${copiedSlug === template.slug
                                        ? 'bg-green-500 text-white'
                                        : 'bg-white/90 text-violet-600 hover:bg-white'
                                        }`}
                                    title={copiedSlug === template.slug ? 'Copied!' : 'Copy Prompt'}
                                >
                                    {copiedSlug === template.slug ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>

                                {/* Featured Badge */}
                                {template.feature && (
                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold rounded-full">
                                        Featured
                                    </div>
                                )}

                                {/* Copied Toast */}
                                {copiedSlug === template.slug && (
                                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full shadow-lg">
                                        Copied!
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
