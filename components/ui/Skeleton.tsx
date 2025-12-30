'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    animation?: 'pulse' | 'wave' | 'none';
}

export default function Skeleton({
    className,
    variant = 'rectangular',
    animation = 'pulse'
}: SkeletonProps) {
    const baseStyles = "bg-zinc-200";

    const variantStyles = {
        text: "h-4 rounded",
        circular: "rounded-full",
        rectangular: "rounded-lg",
    };

    const animationStyles = {
        pulse: "animate-pulse",
        wave: "animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 bg-[length:200%_100%]",
        none: "",
    };

    return (
        <div
            className={cn(
                baseStyles,
                variantStyles[variant],
                animationStyles[animation],
                className
            )}
        />
    );
}

// Preset skeleton components
export function SkeletonCard() {
    return (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <Skeleton className="aspect-video w-full" />
            <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        </div>
    );
}

export function SkeletonTrack() {
    return (
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full" variant="circular" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="w-20 h-10 rounded-lg" />
        </div>
    );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonTrack key={i} />
            ))}
        </div>
    );
}
