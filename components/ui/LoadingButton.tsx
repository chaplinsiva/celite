'use client';

import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps {
    children: ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void;
    className?: string;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export default function LoadingButton({
    children,
    onClick,
    className,
    disabled = false,
    type = 'button',
    variant = 'primary',
}: LoadingButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!onClick || isLoading || disabled) return;

        setIsLoading(true);
        try {
            await onClick(e);
        } finally {
            setIsLoading(false);
        }
    };

    const baseStyles = "relative inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantStyles = {
        primary: "bg-zinc-900 text-white hover:bg-zinc-800",
        secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
        outline: "border-2 border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white",
        ghost: "text-zinc-700 hover:bg-zinc-100",
    };

    return (
        <button
            type={type}
            onClick={handleClick}
            disabled={disabled || isLoading}
            className={cn(baseStyles, variantStyles[variant], className)}
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-lg">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                </div>
            )}
            <span className={isLoading ? 'opacity-0' : 'opacity-100'}>{children}</span>
        </button>
    );
}
