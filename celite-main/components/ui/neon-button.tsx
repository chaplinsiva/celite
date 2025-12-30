import React from 'react'
import { cn } from '@/lib/utils'
import { VariantProps, cva } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

const buttonVariants = cva(
    "relative group border mx-auto text-center rounded-full",
    {
        variants: {
            variant: {
                default: "bg-transparent hover:bg-white/5 border-white/30 hover:border-white/50 text-white transition-all duration-300",
                solid: "bg-blue-500 hover:bg-blue-600 text-white border-transparent hover:border-foreground/50 transition-all duration-200",
                inverse: "bg-white hover:bg-zinc-200 text-black border-transparent transition-all duration-200",
                ghost: "border-transparent bg-transparent hover:border-zinc-600 hover:bg-white/10 text-white",
            },
            size: {
                default: "px-7 py-1.5 ",
                sm: "px-4 py-0.5 ",
                lg: "px-10 py-2.5 ",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> { 
    neon?: boolean;
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, neon = true, size, variant, asChild = false, children, ...props }, ref) => {
        const isInverse = variant === "inverse";
        const neonSpans = (
            <>
                <span className={cn(
                    "absolute h-px opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out inset-x-0 inset-y-0 bg-gradient-to-r w-3/4 mx-auto from-transparent to-transparent hidden",
                    neon && "block",
                    isInverse ? "via-black" : "via-white"
                )} />
                <span className={cn(
                    "absolute group-hover:opacity-50 transition-all duration-500 ease-in-out inset-x-0 h-px -bottom-px bg-gradient-to-r w-3/4 mx-auto from-transparent to-transparent hidden",
                    neon && "block",
                    isInverse ? "via-black" : "via-white"
                )} />
                <span className={cn(
                    "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out blur-sm hidden",
                    neon && "block",
                    isInverse ? "bg-black/10" : "bg-white/10"
                )} />
            </>
        );

        if (asChild) {
            const child = React.Children.only(children) as React.ReactElement;
            return (
                <Slot className={cn(buttonVariants({ variant, size }), className)} {...props}>
                    {React.cloneElement(child, {
                        ...(child.props as Record<string, any>),
                        children: (
                            <>
                                {neonSpans}
                                {(child.props as any).children}
                            </>
                        )
                    } as any)}
                </Slot>
            );
        }

        return (
            <button
                className={cn(buttonVariants({ variant, size }), className)}
                ref={ref}
                {...props}
            >
                {neonSpans}
                {children}
            </button>
        );
    }
)

Button.displayName = 'Button';

export { Button, buttonVariants };
