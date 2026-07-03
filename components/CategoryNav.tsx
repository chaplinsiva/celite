"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';

type Category = {
    id: string;
    name: string;
    slug: string;
};

// Map category slugs to their display names and routes
const categoryDisplayMap: Record<string, { label: string; route: string }> = {
    'video-templates': { label: 'Video Templates', route: '/video-templates' },
    'after-effects': { label: 'Video Templates', route: '/video-templates' },

    'stock-images': { label: 'Photos', route: '/stock-photos' },
    'stock-photos': { label: 'Photos', route: '/stock-photos' },
    'stock-musics': { label: 'Music', route: '/stock-musics' },
    'sound-effects': { label: 'SFX', route: '/sound-effects' },
    'website-templates': { label: 'Web', route: '/web-templates' },
    'web-templates': { label: 'Web', route: '/web-templates' },
    'psd-templates': { label: 'Graphics', route: '/graphics' },
    'graphics': { label: 'Graphics', route: '/graphics' },
    '3d-models': { label: '3D', route: '/3d-models' },
    'prompts': { label: 'Prompts', route: '/prompts' },
};

// Desired display order
const displayOrder = [
    'Video Templates', 'Save Date', 'Photos', 'Music', 'SFX', 'Web', 'Graphics', '3D', 'Prompts'
];

// Static nav items that aren't top-level categories (sub-subcategories with direct access)
const staticNavItems: { label: string; route: string }[] = [
    { label: 'Save Date', route: '/video-templates?sub_subcategory=save-date' },
];

export default function CategoryNav() {
    const pathname = usePathname();
    const [navItems, setNavItems] = useState<{ label: string; route: string }[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            const supabase = getSupabaseBrowserClient();
            try {
                const { data } = await supabase
                    .from('categories')
                    .select('id,name,slug')
                    .order('name');

                if (data) {
                    // Deduplicate by label and sort by display order
                    const seen = new Set<string>();
                    const items: { label: string; route: string }[] = [];

                    for (const cat of data) {
                        const mapping = categoryDisplayMap[cat.slug];
                        if (mapping && !seen.has(mapping.label)) {
                            seen.add(mapping.label);
                            items.push(mapping);
                        }
                    }

                    // Add static nav items (sub-subcategory shortcuts)
                    for (const staticItem of staticNavItems) {
                        if (!seen.has(staticItem.label)) {
                            seen.add(staticItem.label);
                            items.push(staticItem);
                        }
                    }

                    // Sort by display order
                    items.sort((a, b) => {
                        const aIdx = displayOrder.indexOf(a.label);
                        const bIdx = displayOrder.indexOf(b.label);
                        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
                    });

                    setNavItems(items);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, []);

    // Check if a route is active (supports query params)
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const isActive = (route: string) => {
        if (route.includes('?')) {
            const [routePath, routeQuery] = route.split('?');
            if (pathname !== routePath) return false;
            const routeParams = new URLSearchParams(routeQuery);
            if (!searchParams) return false;
            for (const [key, value] of routeParams.entries()) {
                if (searchParams.get(key) !== value) return false;
            }
            return true;
        }
        return pathname === route;
    };

    return (
        <div className="w-full bg-white border-b border-zinc-100 hidden lg:block fixed top-[80px] left-0 z-[90]">
            <div className="max-w-[1440px] mx-auto px-6 sm:px-8 h-11 flex items-center justify-center">
                <nav className="flex items-center gap-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.route}
                            className={`
                                px-4 py-1.5 text-[13px] font-medium rounded-full transition-all duration-200
                                ${isActive(item.route)
                                    ? 'bg-zinc-900 text-white'
                                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                                }
                            `}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    );
}
