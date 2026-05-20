import { Zap, Shield, Download, Star, Clock, Users } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Download instantly after purchase. No waiting, no delays.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Shield,
    title: "Commercial License",
    description: "Use templates commercially without restrictions. Full rights included.",
    gradient: "from-purple-500 to-violet-500",
  },
  {
    icon: Download,
    title: "Unlimited Downloads",
    description: "Download as many times as you need. Access anytime, anywhere.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: Star,
    title: "Premium Quality",
    description: "Hand-crafted by professional designers. Industry-standard templates.",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    icon: Clock,
    title: "Regular Updates",
    description: "New templates added weekly. Stay ahead with fresh content.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Users,
    title: "24/7 Support",
    description: "Get help when you need it. Our team is always ready to assist.",
    gradient: "from-indigo-500 to-blue-500",
  },
];

export default function FeaturesSection() {
  return (
    <section className="relative w-full py-20 sm:py-24 md:py-28 overflow-hidden bg-black">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Why Choose Us
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Everything you need to create stunning videos, websites, and designs
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative p-6 rounded-xl border border-white/10 bg-black/40 hover:border-white/20 transition-all duration-300 hover:bg-black/60"
              >
                {/* Gradient Background on Hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-300`}
                ></div>

                <div className="relative">
                  {/* Icon */}
                  <div
                    className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.gradient} mb-4`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

