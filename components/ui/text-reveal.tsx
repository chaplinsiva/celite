"use client";

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { cn } from '@/lib/utils';

interface TextRevealProps {
  children: React.ReactNode;
  variant?: 'blur' | 'fade';
  className?: string;
  delay?: number;
  duration?: number;
  style?: React.CSSProperties;
}

export function TextReveal({
  children,
  variant = 'blur',
  className,
  delay = 0,
  duration = 0.5,
  style,
}: TextRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated]);

  const variants = {
    blur: {
      initial: { opacity: 0, filter: 'blur(10px)' },
      animate: { opacity: 1, filter: 'blur(0px)' },
    },
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
    },
  };

  const currentVariant = variants[variant];

  return (
    <div ref={ref} className={cn('inline-block', className)}>
      <motion.span
        initial={currentVariant.initial}
        animate={hasAnimated ? currentVariant.animate : currentVariant.initial}
        transition={{
          duration,
          delay,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        style={{ 
          display: 'inline-block',
          fontStyle: 'normal',
          fontSynthesis: 'none',
          transform: 'none',
          fontVariationSettings: 'normal',
          ...style,
        }}
      >
        {children}
      </motion.span>
    </div>
  );
}

