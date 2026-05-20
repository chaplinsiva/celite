"use client"

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlowingEffect } from '@/components/ui/glowing-effect';

const testimonials = [
  {
    tempId: 0,
    testimonial: "The templates here saved me hours of work. The quality is outstanding and the support team is incredibly helpful.",
    by: "Sarah Johnson, @sarahcreator",
    imgSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 1,
    testimonial: "Best investment I've made for our marketing team. The variety is amazing and every template works perfectly out of the box.",
    by: "Michael Chen, @michaelmarketing",
    imgSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 2,
    testimonial: "As a freelancer, these templates help me deliver professional work quickly. My clients are always impressed with the final results.",
    by: "Emily Rodriguez, @emilydesigns",
    imgSrc: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 3,
    testimonial: "The video templates are absolutely stunning. They've elevated my work to a professional level I never thought possible.",
    by: "Alex Thompson, @alexvideo",
    imgSrc: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 4,
    testimonial: "Outstanding quality and variety. These templates have become essential tools in my creative workflow. Worth every penny!",
    by: "Jessica Martinez, @jessicaproducer",
    imgSrc: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 5,
    testimonial: "Incredible attention to detail. Every template is professionally crafted and ready to use. This has transformed my production process.",
    by: "David Kim, @davidmotion",
    imgSrc: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
  }
];

interface TestimonialCardProps {
  position: number;
  testimonial: typeof testimonials[0];
  handleMove: (steps: number) => void;
  cardSize: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  position,
  testimonial,
  handleMove,
  cardSize
}) => {
  const isCenter = position === 0;
  const absPosition = Math.abs(position);

  let opacity = 1.0;
  if (absPosition === 1 || absPosition === 2) {
    opacity = 0.6;
  } else if (absPosition === 3) {
    opacity = 0.3;
  } else if (absPosition >= 4) {
    opacity = 0.1;
  }

  return (
    <div
      onClick={() => handleMove(position)}
      className={cn(
        "absolute left-1/2 top-1/2 cursor-pointer border p-6 transition-all duration-700 ease-out rounded-2xl shadow-sm",
        isCenter
          ? "z-10 bg-white border-zinc-200 shadow-xl scale-100"
          : "z-0 bg-white/80 border-zinc-100 scale-90 blur-[1px] hover:blur-none"
      )}
      style={{
        width: cardSize,
        height: cardSize,
        opacity: opacity,
        transform: `
          translate(-50%, -50%) 
          translateX(${(cardSize / 1.5) * position}px)
          translateY(${isCenter ? 0 : position % 2 ? 10 : -10}px)
          rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)
        `,
        left: '50%',
        top: '50%',
        transition: 'opacity 700ms ease-out, transform 700ms ease-out',
      }}
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex flex-col gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-100">
            <img src={testimonial.imgSrc} alt="User" className="w-full h-full object-cover" />
          </div>
          <p className="text-zinc-700 font-medium text-lg leading-relaxed">
            "{testimonial.testimonial}"
          </p>
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-50">
          <p className="text-sm font-semibold text-zinc-900">{testimonial.by.split(',')[0]}</p>
          <p className="text-xs text-zinc-500">{testimonial.by.split(',')[1]}</p>
        </div>
      </div>
    </div>
  );
};

interface StaggerTestimonialsProps {
  className?: string;
}

export const StaggerTestimonials: React.FC<StaggerTestimonialsProps> = ({ className }) => {
  const [cardSize, setCardSize] = useState(365);
  const [testimonialsList, setTestimonialsList] = useState(testimonials);

  const handleMove = (steps: number) => {
    const newList = [...testimonialsList];
    if (steps > 0) {
      for (let i = steps; i > 0; i--) {
        const item = newList.shift();
        if (!item) return;
        newList.push({ ...item, tempId: Math.random() });
      }
    } else {
      for (let i = steps; i < 0; i++) {
        const item = newList.pop();
        if (!item) return;
        newList.unshift({ ...item, tempId: Math.random() });
      }
    }
    setTestimonialsList(newList);
  };

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setCardSize(320);
      } else if (width >= 768) {
        setCardSize(280);
      } else {
        setCardSize(240);
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div
      className={cn(
        "relative w-full overflow-visible bg-transparent py-20",
        className
      )}
      style={{ minHeight: '500px' }}
    >
      {/* Light Gradient Vignette */}
      <div className="absolute left-0 top-0 bottom-0 w-32 z-30 pointer-events-none bg-gradient-to-r from-white via-white/80 to-transparent"></div>
      <div className="absolute right-0 top-0 bottom-0 w-32 z-30 pointer-events-none bg-gradient-to-l from-white via-white/80 to-transparent"></div>

      {testimonialsList.map((testimonial, index) => {
        const position = testimonialsList.length % 2
          ? index - (testimonialsList.length + 1) / 2
          : index - testimonialsList.length / 2;
        return (
          <TestimonialCard
            key={testimonial.tempId}
            testimonial={testimonial}
            handleMove={handleMove}
            position={position}
            cardSize={cardSize}
          />
        );
      })}

      <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-4 z-40">
        <button
          onClick={() => handleMove(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-zinc-200 shadow-sm hover:bg-zinc-50 text-zinc-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleMove(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-zinc-200 shadow-sm hover:bg-zinc-50 text-zinc-600 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

