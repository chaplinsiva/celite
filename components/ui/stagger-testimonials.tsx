"use client"

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlowingEffect } from '@/components/ui/glowing-effect';

const SQRT_5000 = Math.sqrt(5000);

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
  },
  {
    tempId: 6,
    testimonial: "I've been searching for a solution like Celite for YEARS. So glad I finally found one! The templates are game-changing.",
    by: "Pete Johnson, @petedesigns",
    imgSrc: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 7,
    testimonial: "It's so simple and intuitive, we got the team up to speed in 10 minutes. The quality is unmatched.",
    by: "Marina Silva, @marinacreative",
    imgSrc: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 8,
    testimonial: "Celite's customer support is unparalleled. They're always there when we need them. Highly recommend!",
    by: "Olivia Brown, @oliviaeditor",
    imgSrc: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 9,
    testimonial: "The efficiency gains we've seen since implementing Celite templates are off the charts! Best purchase ever.",
    by: "Raj Patel, @rajvideo",
    imgSrc: "https://images.unsplash.com/photo-1508341591423-4347099e1f19?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 10,
    testimonial: "Celite has revolutionized how we handle our video production. It's a game-changer for our workflow!",
    by: "Lila Chen, @lilacreative",
    imgSrc: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 11,
    testimonial: "The scalability of Celite's template library is impressive. It grows with our business seamlessly.",
    by: "Trevor Wilson, @trevormotion",
    imgSrc: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 12,
    testimonial: "I appreciate how Celite continually innovates. They're always one step ahead with cutting-edge designs.",
    by: "Naomi Lee, @naomidesigns",
    imgSrc: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 13,
    testimonial: "The ROI we've seen with Celite is incredible. It's paid for itself many times over with saved time.",
    by: "Victor Torres, @victorvideo",
    imgSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 14,
    testimonial: "Celite's platform is so robust, yet easy to use. It's the perfect balance of power and simplicity.",
    by: "Yuki Tanaka, @yukicreative",
    imgSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 15,
    testimonial: "We've tried many solutions, but Celite stands out in terms of reliability and performance. Can't recommend enough!",
    by: "Zoe Martinez, @zoeeditor",
    imgSrc: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 16,
    testimonial: "My favorite solution in the market. We work 5x faster with Celite templates. Absolutely love it!",
    by: "Alex Morgan, @alexmotion",
    imgSrc: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 17,
    testimonial: "I'm confident my projects are safe with Celite. I can't say that about other template providers. Quality is unmatched.",
    by: "Dan Williams, @danvideo",
    imgSrc: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 18,
    testimonial: "I know it's cliche, but we were lost before we found Celite. Can't thank you guys enough for these amazing templates!",
    by: "Stephanie Adams, @stephcreative",
    imgSrc: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 19,
    testimonial: "Celite's templates make planning for the future seamless. Can't recommend them enough! Best investment ever.",
    by: "Marie Johnson, @marieeditor",
    imgSrc: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face"
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
  
  // Calculate opacity based on position
  // Center (0): 1.0 (fully visible)
  // First two (1, 2): 0.6 (little faded)
  // Third (3): 0.3 (too faded)
  // Fourth and beyond (4+): 0.1 (fully faded)
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
        "absolute left-1/2 top-1/2 cursor-pointer border-[0.75px] p-2 transition-all duration-700 ease-out rounded-[1.25rem] md:rounded-[1.5rem]",
        isCenter 
          ? "z-10 border-white/20" 
          : "z-0 border-white/10 hover:border-white/20"
      )}
      style={{
        width: cardSize,
        height: cardSize,
        opacity: opacity,
        transform: `
          translate(-50%, -50%) 
          translateX(${(cardSize / 2) * position}px)
          translateY(${isCenter ? 0 : position % 2 ? 10 : -10}px)
          rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)
        `,
        transition: 'opacity 700ms ease-out, transform 700ms ease-out',
      }}
    >
      <GlowingEffect
        spread={40}
        glow={isCenter}
        disabled={!isCenter}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={3}
      />
      <div className={cn(
        "relative h-full rounded-xl border-[0.75px] border-white/10 p-4 sm:p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)] flex flex-col justify-between transition-all duration-700 ease-out",
        isCenter 
          ? "bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30 backdrop-blur-sm" 
          : "bg-black/40"
      )}>
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="w-fit rounded-lg border-[0.75px] border-white/10 bg-zinc-900/50 p-2">
            <img
              src={testimonial.imgSrc}
              alt={`${testimonial.by.split(',')[0]}`}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted object-cover"
            />
          </div>
          <h3 className="text-sm sm:text-base md:text-lg font-medium text-white leading-tight">
            "{testimonial.testimonial}"
          </h3>
        </div>
        <p className={cn(
          "mt-3 sm:mt-4 text-xs sm:text-sm italic",
          isCenter ? "text-white/80" : "text-zinc-400"
        )}>
          - {testimonial.by}
        </p>
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
        // Desktop: larger cards
        setCardSize(320);
      } else if (width >= 768) {
        // Tablet: medium cards
        setCardSize(280);
      } else {
        // Mobile: smaller cards
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
        "relative w-full overflow-visible bg-black",
        className
      )}
      style={{ minHeight: '400px', height: 'auto' }}
    >
      {/* Dark Vignette on Left Edge */}
      <div className="absolute left-0 top-0 bottom-0 w-32 md:w-64 z-30 pointer-events-none bg-gradient-to-r from-black via-black/80 to-transparent"></div>
      
      {/* Dark Vignette on Right Edge */}
      <div className="absolute right-0 top-0 bottom-0 w-32 md:w-64 z-30 pointer-events-none bg-gradient-to-l from-black via-black/80 to-transparent"></div>

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
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 z-20">
        <button
          onClick={() => handleMove(-1)}
          className={cn(
            "flex h-12 w-12 items-center justify-center transition-colors rounded-full",
            "bg-black/80 backdrop-blur-sm border-[0.75px] border-white/20 hover:bg-white/10 hover:border-white/30 text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2"
          )}
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleMove(1)}
          className={cn(
            "flex h-12 w-12 items-center justify-center transition-colors rounded-full",
            "bg-black/80 backdrop-blur-sm border-[0.75px] border-white/20 hover:bg-white/10 hover:border-white/30 text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2"
          )}
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

