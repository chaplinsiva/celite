"use client";

import { cn } from '@/lib/utils';

interface MixedTextProps {
  boldText: string;
  regularText: string;
  className?: string;
  boldClassName?: string;
  regularClassName?: string;
}

export function MixedText({
  boldText,
  regularText,
  className,
  boldClassName,
  regularClassName,
}: MixedTextProps) {
  return (
    <span className={cn('inline-block not-italic', className)} style={{ fontStyle: 'normal', transform: 'none' }}>
      <span className={cn('font-bold text-foreground not-italic', boldClassName)} style={{ fontStyle: 'normal' }}>
        {boldText}
      </span>
      <span className={cn('font-normal text-muted-foreground not-italic', regularClassName)} style={{ fontStyle: 'normal' }}>
        {regularText}
      </span>
    </span>
  );
}

