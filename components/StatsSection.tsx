'use client';

import { FileText, Users, Download, Star } from "lucide-react";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

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
        <RadialOrbitalTimeline timelineData={timelineData} />
      </div>
    </section>
  );
}

