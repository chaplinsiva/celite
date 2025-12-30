'use client';

import { useRouter } from 'next/navigation';
import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LoadingLinkProps {
    href: string;
    children: ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}

export default function LoadingLink({
    href,
    children,
    className,
    onClick,
}: LoadingLinkProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Don't handle external links or anchor links
        if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
            onClick?.(e);
            return;
        }

        e.preventDefault();
        onClick?.(e);

        setIsLoading(true);
        router.push(href);

        // Reset loading after navigation completes
        setTimeout(() => setIsLoading(false), 500);
    };

    return (
        <Link
            href={href}
            onClick={handleClick}
            className={cn(
                "relative inline-flex items-center gap-2 transition-all duration-200",
                isLoading && "opacity-70 pointer-events-none",
                className
            )}
        >
            {isLoading && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {children}
        </Link>
    );
}
