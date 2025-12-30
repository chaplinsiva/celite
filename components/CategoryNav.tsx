"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

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

// Helper function to get the correct route for a category (copied from Header.tsx)
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
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);

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

    const navItems = [
        { name: 'Video Templates', route: '/video-templates', slug: 'video-templates' },
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
            <div className="max-w-[1440px] mx-auto px-6 sm:px-8 h-12 flex items-center justify-center">
                <NavigationMenu className="w-full max-w-full flex-1">
                    <NavigationMenuList className="w-full justify-center gap-10">
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

                            return (
                                <NavigationMenuItem key={category.id}>
                                    {categorySubcategories.length > 0 ? (
                                        <>
                                            <NavigationMenuTrigger
                                                hideChevron
                                                className="text-[13px] font-bold text-zinc-600 hover:text-black transition-colors bg-transparent border-none p-0 h-auto focus:bg-transparent data-[state=open]:bg-transparent"
                                            >
                                                {navItem.name}
                                            </NavigationMenuTrigger>
                                            <NavigationMenuContent>
                                                <div className="grid gap-3 p-6 md:w-[600px] lg:w-[800px] lg:grid-cols-[1fr_1.5fr]">
                                                    <div className="space-y-4 pr-6 border-r border-zinc-100">
                                                        <NavigationMenuLink asChild>
                                                            <a href={categoryRoute} className="group block space-y-3">
                                                                <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg border border-zinc-100">
                                                                    <img
                                                                        src={
                                                                            {
                                                                                'Video Templates': 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600',
                                                                                'Photos': 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=600',
                                                                                'Music': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600',
                                                                                'SFX': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600',
                                                                                'Web': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600',
                                                                                'Graphics': 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=600',
                                                                                '3D': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600',
                                                                                'Prompts': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=600'
                                                                            }[navItem.name] || 'https://images.unsplash.com/photo-1520004481444-a957b6563721?q=80&w=600'
                                                                        }
                                                                        alt={navItem.name}
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-lg font-black text-black tracking-tight">{navItem.name}</h4>
                                                                    <p className="text-xs text-zinc-500 font-medium">Explore premium curated assets</p>
                                                                </div>
                                                            </a>
                                                        </NavigationMenuLink>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                                        {categorySubcategories.slice(0, 6).map((subcategory) => {
                                                            const subSubcats = subSubcategories.filter(ss => ss.subcategory_id === subcategory.id);
                                                            return (
                                                                <div key={subcategory.id} className="space-y-3">
                                                                    <NavigationMenuLink
                                                                        href={`${categoryRoute}?subcategory=${subcategory.slug}`}
                                                                        className="text-[14px] font-black text-black hover:text-blue-600 transition-colors block tracking-tight"
                                                                    >
                                                                        {subcategory.name}
                                                                    </NavigationMenuLink>
                                                                    {subSubcats.length > 0 && (
                                                                        <ul className="space-y-2">
                                                                            {subSubcats.slice(0, 3).map((subSubcat) => (
                                                                                <li key={subSubcat.id}>
                                                                                    <NavigationMenuLink
                                                                                        href={`${categoryRoute}?subcategory=${subcategory.slug}&subsubcategory=${subSubcat.slug}`}
                                                                                        className="text-[12px] text-zinc-500 hover:text-black transition-colors font-medium"
                                                                                    >
                                                                                        {subSubcat.name}
                                                                                    </NavigationMenuLink>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </NavigationMenuContent>
                                        </>
                                    ) : (
                                        <NavigationMenuLink
                                            href={categoryRoute}
                                            className="text-[13px] font-bold text-zinc-600 hover:text-black transition-colors"
                                        >
                                            {navItem.name}
                                        </NavigationMenuLink>
                                    )}
                                </NavigationMenuItem>
                            );
                        })}
                    </NavigationMenuList>
                </NavigationMenu>
            </div>
        </div>
    );
}
