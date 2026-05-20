'use client';

import { FileText, Users, Download, Star } from "lucide-react";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";
import DatabaseWithRestApi from "@/components/ui/database-with-rest-api";

const timelineData = [
  {
    id: 1,
    title: "500+ Premium Templates",
    date: "2024",
    content: "Our extensive collection of professional After Effects templates designed for creators and marketers.",
    category: "Templates",
    icon: FileText,
    relatedIds: [2],
    status: "completed" as const,
    energy: 100,
  },
  {
    id: 2,
    title: "10K+ Happy Customers",
    date: "2024",
    content: "Thousands of satisfied customers using our templates to create stunning visual content.",
    category: "Customers",
    icon: Users,
    relatedIds: [1, 3],
    status: "completed" as const,
    energy: 95,
  },
  {
    id: 3,
    title: "50K+ Downloads",
    date: "2024",
    content: "Over 50,000 template downloads, proving the quality and demand for our creative assets.",
    category: "Downloads",
    icon: Download,
    relatedIds: [2, 4],
    status: "in-progress" as const,
    energy: 90,
  },
  {
    id: 4,
    title: "4.9 Average Rating",
    date: "2024",
    content: "Outstanding customer satisfaction with a 4.9 out of 5 average rating from our community.",
    category: "Rating",
    icon: Star,
    relatedIds: [3],
    status: "completed" as const,
    energy: 98,
  },
];

export default function StatsSection() {
  return (
    <section className="relative w-full py-8 sm:py-12 md:py-16 overflow-hidden bg-gradient-to-b from-black to-zinc-950">
      <div className="relative w-full h-[600px] sm:h-[700px] md:h-[800px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full flex items-center justify-center" style={{ perspective: '1000px' }}>
          {/* Stats Text Display */}
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-center space-y-2 z-10">
            <div className="text-white text-lg sm:text-xl md:text-2xl font-semibold space-x-4 sm:space-x-8">
              <span>500+ Premium Templates</span>
              <span className="text-zinc-400">•</span>
              <span>10K+ Happy Customers</span>
              <span className="text-zinc-400">•</span>
              <span>50K+ Downloads</span>
              <span className="text-zinc-400">•</span>
              <span>4.9 Average Rating</span>
            </div>
          </div>
          
          {/* DatabaseWithRestApi Component with Celite branding */}
          <DatabaseWithRestApi
            badgeTexts={{
              first: "500+",
              second: "10K+",
              third: "50K+",
              fourth: "4.9★"
            }}
            buttonTexts={{
              first: "Celite",
              second: "Templates"
            }}
            circleText="Celite"
            title="Celite - Premium After Effects Templates"
            lightColor="#00A6F5"
          />
        </div>
      </div>
    </section>
  );
}

