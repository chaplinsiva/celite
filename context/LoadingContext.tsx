'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface LoadingContextType {
    isLoading: boolean;
    startLoading: () => void;
    stopLoading: () => void;
    isNavigating: boolean;
}

const LoadingContext = createContext<LoadingContextType>({
    isLoading: false,
    startLoading: () => { },
    stopLoading: () => { },
    isNavigating: false,
});

export const useLoading = () => useContext(LoadingContext);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const startLoading = useCallback(() => setIsLoading(true), []);
    const stopLoading = useCallback(() => setIsLoading(false), []);

    // Track navigation
    useEffect(() => {
        setIsNavigating(false);
    }, [pathname, searchParams]);

    // Listen for link clicks to show navigation loading
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');

            if (link && link.href && !link.href.startsWith('#') && !link.target) {
                const url = new URL(link.href);
                if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
                    setIsNavigating(true);
                }
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return (
        <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading, isNavigating }}>
            {/* Top Progress Bar */}
            {(isLoading || isNavigating) && (
                <div className="fixed top-0 left-0 right-0 z-[9999]">
                    <div className="h-1 bg-zinc-200">
                        <div className="h-full bg-zinc-900 animate-[progress_1.5s_ease-in-out_infinite]" />
                    </div>
                </div>
            )}


            {children}

            <style jsx global>{`
        @keyframes progress {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 60%;
            margin-left: 20%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
        </LoadingContext.Provider>
    );
}
