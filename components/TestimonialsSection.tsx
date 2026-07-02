"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

const testimonials = [
  {
    name: "Anandh S",
    role: "Video Editor",
    avatar: "https://ui-avatars.com/api/?name=Anandh+S&background=3b82f6&color=fff&size=120&bold=true",
    text: "Celite saved me hours of work! The templates are clean, modern, and easy to customize. Now I deliver client projects faster than ever.",
    rating: 5,
    bgColor: "from-blue-500 to-blue-700"
  },
  {
    name: "Priya Sharma",
    role: "Content Creator",
    avatar: "https://ui-avatars.com/api/?name=Priya+Sharma&background=3b82f6&color=fff&size=120&bold=true",
    text: "The quality of templates is outstanding. I've been using Celite for my video editing projects and it's a game changer!",
    rating: 5,
    bgColor: "from-blue-500 to-blue-700"
  },
  {
    name: "Rajesh Kumar",
    role: "Motion Designer",
    avatar: "https://ui-avatars.com/api/?name=Rajesh+Kumar&background=3b82f6&color=fff&size=120&bold=true",
    text: "Amazing collection of After Effects templates. Saved me so much time on my client projects. Highly recommended!",
    rating: 5,
    bgColor: "from-blue-500 to-blue-700"
  },
  {
    name: "Sarah Johnson",
    role: "Freelance Designer",
    avatar: "https://ui-avatars.com/api/?name=Sarah+Johnson&background=3b82f6&color=fff&size=120&bold=true",
    text: "Professional quality templates at affordable prices. The customer support is also excellent. Will definitely recommend!",
    rating: 5,
    bgColor: "from-blue-500 to-blue-700"
  },
  {
    name: "Michael Chen",
    role: "Creative Director",
    avatar: "https://ui-avatars.com/api/?name=Michael+Chen&background=3b82f6&color=fff&size=120&bold=true",
    text: "Best template marketplace I've found. Clean designs, easy to customize, and great value for money!",
    rating: 5,
    bgColor: "from-blue-500 to-blue-700"
  },
];

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState<number | null>(null);

  // Responsive items per view
  const getItemsPerView = () => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  };

  const [itemsPerView, setItemsPerView] = useState(3);

  const maxIndex = Math.max(0, testimonials.length - itemsPerView);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  return (
    <section className="relative w-full py-8 sm:py-12 md:py-20 bg-gradient-to-br from-purple-50/50 via-white to-blue-50/50 overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-5 left-5 sm:top-10 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 bg-blue-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-5 right-5 sm:bottom-10 sm:right-10 w-64 h-64 sm:w-96 sm:h-96 bg-purple-200/20 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 sm:mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-500">
              What Our Customer Say
            </span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-zinc-600 max-w-2xl mx-auto px-2">
            Don't just take our word for it. Here's what creators are saying about us
          </p>
        </div>

        {/* Testimonials Carousel */}
        <div className="relative">
          <div className="overflow-hidden rounded-xl sm:rounded-2xl">
            <div
              className="flex gap-3 sm:gap-4 md:gap-6 transition-transform duration-700 ease-out px-1 sm:px-2"
              style={{
                transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
              }}
            >
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-full sm:w-1/2 lg:w-1/3 px-1 sm:px-2"
                  onMouseEnter={() => setIsHovering(index)}
                  onMouseLeave={() => setIsHovering(null)}
                >
                  <div className={`bg-gradient-to-br ${testimonial.bgColor} rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 min-h-[280px] sm:min-h-[320px] md:min-h-[380px] flex flex-col transform ${isHovering === index ? 'scale-105' : 'scale-100'}`}>
                    {/* Avatar & Info */}
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-sm overflow-hidden shadow-lg ring-2 ring-white/30">
                        <img
                          src={testimonial.avatar}
                          alt={testimonial.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm sm:text-base md:text-lg">
                          {testimonial.name}
                        </h3>
                        <p className="text-white/80 text-xs sm:text-sm">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>

                    {/* Rating Stars */}
                    <div className="flex gap-0.5 sm:gap-1 mb-2 sm:mb-3 md:mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 fill-yellow-300 text-yellow-300" />
                      ))}
                    </div>

                    {/* Testimonial Text */}
                    <div className="flex-1">
                      <p className="text-white/95 leading-relaxed text-xs sm:text-sm md:text-base">
                        "{testimonial.text}"
                      </p>
                    </div>

                    {/* Decorative Quote Mark */}
                    <div className="mt-2 sm:mt-3 md:mt-4 text-white/10 text-3xl sm:text-4xl md:text-6xl font-serif leading-none">
                      "
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mt-6 sm:mt-8 md:mt-10">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="group p-2 sm:p-3 md:p-4 rounded-full bg-white border-2 border-zinc-200 hover:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-zinc-200 transition-all shadow-md hover:shadow-xl"
            aria-label="Previous testimonials"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 text-zinc-700 group-hover:text-blue-600 transition-colors" />
          </button>

          {/* Dots Indicator */}
          <div className="flex gap-1.5 sm:gap-2">
            {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 sm:h-2 rounded-full transition-all ${idx === currentIndex
                  ? 'w-6 sm:w-8 bg-blue-600'
                  : 'w-1.5 sm:w-2 bg-zinc-300 hover:bg-zinc-400'
                  }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex >= maxIndex}
            className="group p-2 sm:p-3 md:p-4 rounded-full bg-blue-600 border-2 border-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 transition-all shadow-md hover:shadow-xl"
            aria-label="Next testimonials"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 text-white transition-colors" />
          </button>
        </div>
      </div>
    </section>
  );
}
