"use client";

import { useEffect, useState } from 'react';

export default function SnowEffect() {
    const [snowflakes, setSnowflakes] = useState<number[]>([]);

    // Check if it's December
    const isDecember = new Date().getMonth() === 11;

    useEffect(() => {
        if (!isDecember) return;

        // Generate fewer, subtle snowflakes
        const flakes = Array.from({ length: 25 }, (_, i) => i);
        setSnowflakes(flakes);
    }, [isDecember]);

    if (!isDecember) return null;

    return (
        <div className="snow-container" aria-hidden="true">
            {snowflakes.map((i) => (
                <div
                    key={i}
                    className="snowflake"
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDuration: `${Math.random() * 5 + 4}s`,
                        animationDelay: `${Math.random() * 3}s`,
                        opacity: Math.random() * 0.2 + 0.15,
                        fontSize: `${Math.random() * 4 + 6}px`,
                    }}
                >
                    ❄
                </div>
            ))}
        </div>
    );
}
