"use client";

import { FC, ReactNode, useRef } from "react";
import { motion, MotionValue, useScroll, useTransform, useInView } from "framer-motion";

import { cn } from "@/lib/utils";

interface TextRevealByWordProps {
  text: string;
  className?: string;
}

const TextRevealByWord: FC<TextRevealByWordProps> = ({
  text,
  className,
}) => {
  const targetRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start 0.95", "end 0.05"],
  });
  const words = text.split(" ");

  return (
    <div ref={targetRef} className={cn("relative z-0 h-[60vh]", className)}>
      <div
        className={
          "sticky top-0 mx-auto flex h-full max-w-4xl items-center justify-center bg-transparent px-4 py-8"
        }
      >
        <p
          className={
            "flex flex-wrap items-center justify-center gap-x-1 gap-y-0 text-2xl font-bold text-white/20 md:text-3xl lg:text-4xl xl:text-5xl"
          }
        >
          {words.map((word, i) => {
            // Make words reveal faster - complete at 60% of scroll progress
            const revealEnd = 0.6;
            const start = (i / words.length) * revealEnd;
            const end = ((i + 1) / words.length) * revealEnd;
            return (
              <Word key={`${word}-${i}`} progress={scrollYProgress} range={[start, end]}>
                {word}
              </Word>
            );
          })}
        </p>
      </div>
    </div>
  );
};

interface WordProps {
  children: ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
}

const Word: FC<WordProps> = ({ children, progress, range }) => {
  const opacity = useTransform(progress, range, [0, 1]);
  return (
    <span className="relative inline-block mx-0.5 whitespace-nowrap">
      <span className={"absolute inset-0 opacity-30"}>{children}</span>
      <motion.span
        style={{ opacity: opacity }}
        className={"relative text-white"}
      >
        {children}
      </motion.span>
    </span>
  );
};

// Simple TextReveal component for Hero section
interface TextRevealProps {
  children: ReactNode;
  variant?: "blur" | "fade" | "slide";
  className?: string;
  style?: React.CSSProperties;
}

const TextReveal: FC<TextRevealProps> = ({ 
  children, 
  variant = "fade", 
  className,
  style 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const variants = {
    blur: {
      initial: { filter: "blur(10px)", opacity: 0 },
      animate: { filter: "blur(0px)", opacity: 1 }
    },
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 }
    },
    slide: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 }
    }
  };

  const currentVariant = variants[variant];

  return (
    <motion.div
      ref={ref}
      initial={currentVariant.initial}
      animate={isInView ? currentVariant.animate : currentVariant.initial}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
};

export { TextRevealByWord, TextReveal };
