import { TestimonialsWithMarquee } from "@/components/ui/testimonials-with-marquee";

const testimonials = [
  {
    author: {
      name: "Sarah Johnson",
      handle: "@sarahcreator",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
    },
    text: "The templates here saved me hours of work. The quality is outstanding and the support team is incredibly helpful. Highly recommend!",
  },
  {
    author: {
      name: "Michael Chen",
      handle: "@michaelmarketing",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    text: "Best investment I've made for our marketing team. The variety is amazing and every template works perfectly out of the box.",
  },
  {
    author: {
      name: "Emily Rodriguez",
      handle: "@emilydesigns",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
    },
    text: "As a freelancer, these templates help me deliver professional work quickly. My clients are always impressed with the final results.",
  },
  {
    author: {
      name: "Alex Thompson",
      handle: "@alexvideo",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    text: "The video templates are absolutely stunning. They've elevated my work to a professional level I never thought possible.",
  },
  {
    author: {
      name: "Jessica Martinez",
      handle: "@jessicaproducer",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    },
    text: "Outstanding quality and variety. These templates have become essential tools in my creative workflow. Worth every penny!",
  },
  {
    author: {
      name: "David Kim",
      handle: "@davidmotion",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
    },
    text: "Incredible attention to detail. Every template is professionally crafted and ready to use. This has transformed my production process.",
  },
];

export default function TestimonialsSection() {
  return (
    <TestimonialsWithMarquee
      title="What Our Customers Say"
      description="Don't just take our word for it. Here's what creators are saying about us"
      testimonials={testimonials}
    />
  );
}

