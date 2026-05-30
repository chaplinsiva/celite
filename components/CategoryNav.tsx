"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

type Category = {
    id: string;
    name: string;
    slug: string;
};

type Subcategory = {
    id: string;
    category_id: string;
    name: string;
    slug: string;
};

type SubSubcategory = {
    id: string;
    subcategory_id: string;
    name: string;
    slug: string;
};

// Helper function to get the correct route for a category
const getCategoryRoute = (categorySlug: string): string => {
    const normalizedSlug = categorySlug.toLowerCase().trim();
    const routeMap: Record<string, string> = {
        'after-effects': '/video-templates',
        'website-templates': '/web-templates',
        'psd-templates': '/graphics',
        'stock-musics': '/stock-musics',
        'stock-images': '/stock-photos',
        'web-templates': '/web-templates',
        'graphics': '/graphics',
        'music': '/stock-musics',
        'audio': '/stock-musics',
        'sound-effects': '/sound-effects',
        'stock-photos': '/stock-photos',
        'video-templates': '/video-templates',
        'ui-templates': '/web-templates',
        '3d-models': '/3d-models',
        'prompts': '/prompts',
        'save-date': '/save-date',
    };

    if (routeMap[normalizedSlug]) return routeMap[normalizedSlug];
    if (normalizedSlug.includes('music') || normalizedSlug.includes('audio')) return '/stock-musics';
    if (normalizedSlug.includes('sfx') || normalizedSlug.includes('sound')) return '/sound-effects';
    if (normalizedSlug.includes('stock') && (normalizedSlug.includes('photo') || normalizedSlug.includes('image'))) return '/stock-photos';
    if (normalizedSlug.includes('web') || normalizedSlug.includes('website') || normalizedSlug.includes('ui')) return '/web-templates';
    if (normalizedSlug.includes('graphic') || normalizedSlug.includes('psd')) return '/graphics';
    if (normalizedSlug.includes('after-effects') || normalizedSlug.includes('video')) return '/video-templates';
    if (normalizedSlug.includes('3d') || normalizedSlug.includes('model')) return '/3d-models';

    return `/video-templates?category=${categorySlug}`;
};

export default function CategoryNav() {
    const pathname = usePathname();
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            const supabase = getSupabaseBrowserClient();
            try {
                const [catsRes, subcatsRes, subSubcatsRes] = await Promise.all([
                    supabase.from('categories').select('id,name,slug').order('name'),
                    supabase.from('subcategories').select('id,category_id,name,slug').order('name'),
                    supabase.from('sub_subcategories').select('id,subcategory_id,name,slug').order('name'),
                ]);

                if (catsRes.data) setCategories(catsRes.data);
                if (subcatsRes.data) setSubcategories(subcatsRes.data);
                if (subSubcatsRes.data) setSubSubcategories(subSubcatsRes.data);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdown(null);
        if (openDropdown) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [openDropdown]);

    // Close dropdown on route change
    useEffect(() => {
        setOpenDropdown(null);
    }, [pathname]);

    const navItems = [
        { name: 'Video Templates', route: '/video-templates', slug: 'video-templates' },
        { name: 'Save Date', route: '/save-date', slug: 'save-date' },
        { name: 'Photos', route: '/stock-photos', slug: 'stock-images' },
        { name: 'Music', route: '/stock-musics', slug: 'stock-musics' },
        { name: 'SFX', route: '/sound-effects', slug: 'sound-effects' },
        { name: 'Web', route: '/web-templates', slug: 'website-templates' },
        { name: 'Graphics', route: '/graphics', slug: 'psd-templates' },
        { name: '3D', route: '/3d-models', slug: '3d-models' },
        { name: 'Prompts', route: '/prompts', slug: 'prompts' },
    ];

    return (
        <div className="w-full bg-white border-b border-zinc-100 hidden lg:block fixed top-[80px] left-0 z-[90] shadow-sm">
            <div className="max-w-[1440px] mx-auto px-6 sm:px-8 h-11 flex items-center justify-center">
                <nav className="flex items-center gap-1">
                    {navItems.map((navItem) => {
                        const category = categories.find(cat =>
                            cat.slug === navItem.slug ||
                            cat.name.toLowerCase() === navItem.name.toLowerCase()
                        );

                        if (!category) return null;

                        const categorySubcategories = subcategories.filter(
                            sub => sub.category_id === category.id
                        );
                        const categoryRoute = getCategoryRoute(category.slug);
                        const isActive = pathname === navItem.route || pathname?.startsWith(navItem.route + '/');
                        const hasDropdown = categorySubcategories.length > 0;
                        const isOpen = openDropdown === category.id;

                        return (
                            <div
                                key={category.id}
                                className="relative"
                                onMouseEnter={() => hasDropdown && setOpenDropdown(category.id)}
                                onMouseLeave={() => setOpenDropdown(null)}
                            >
                                {/* Nav Button */}
                                <Link
                                    href={categoryRoute}
                                    className={cn(
                                        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200",
                                        isActive
                                            ? "text-blue-600 bg-blue-50"
                                            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                                    )}
                                >
                                    {navItem.name}
                                    {hasDropdown && (
                                        <ChevronDown className={cn(
                                            "w-3 h-3 transition-transform duration-200",
                                            isOpen && "rotate-180"
                                        )} />
                                    )}
                                </Link>

                                {/* Dropdown */}
                                {hasDropdown && isOpen && (
                                    <div className="absolute top-full left-0 pt-1 z-[100]">
                                        <div className="bg-white rounded-xl shadow-xl border border-zinc-200/80 py-2 min-w-[200px] max-w-[280px] animate-in fade-in slide-in-from-top-1 duration-150">
                                            {/* View All link */}
                                            <Link
                                                href={categoryRoute}
                                                className="block px-4 py-2 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                                            >
                                                All {navItem.name}
                                            </Link>
                                            <div className="h-px bg-zinc-100 mx-3 my-1" />

                                            {/* Subcategories */}
                                            <div className="max-h-[400px] overflow-y-auto">
                                                {categorySubcategories.map((subcategory) => {
                                                    const subSubcats = subSubcategories.filter(
                                                        ss => ss.subcategory_id === subcategory.id
                                                    );

                                                    return (
                                                        <div key={subcategory.id}>
                                                            <Link
                                                                href={`${categoryRoute}?subcategory=${subcategory.slug}`}
                                                                className="block px-4 py-1.5 text-[13px] font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                                                            >
                                                                {subcategory.name}
                                                            </Link>

                                                            {/* Sub-subcategories */}
                                                            {subSubcats.length > 0 && (
                                                                <div className="pl-4">
                                                                    {subSubcats.map((subSubcat) => (
                                                                        <Link
                                                                            key={subSubcat.id}
                                                                            href={`${categoryRoute}?subcategory=${subcategory.slug}&subsubcategory=${subSubcat.slug}`}
                                                                            className="block px-4 py-1 text-[11px] text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-colors"
                                                                        >
                                                                            {subSubcat.name}
                                                                        </Link>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
