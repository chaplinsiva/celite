import { StaggerTestimonials } from "@/components/ui/stagger-testimonials";

export default function TestimonialsSection() {
  return (
    <section className="relative w-full py-20 sm:py-24 md:py-28 overflow-hidden bg-black">
      {/* Colorful Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            What Our Customers Say
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Don't just take our word for it. Here's what creators are saying about us
          </p>
        </div>
      </div>

      {/* Stagger Testimonials Component - Full Width */}
      <div className="relative w-full -mx-4 sm:-mx-6 md:-mx-8">
        <StaggerTestimonials />
      </div>
    </section>
  );
}

