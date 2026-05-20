'use client';

import Link from 'next/link';
import { Rocket, Users, TrendingUp, DollarSign, Shield, Zap } from 'lucide-react';

export default function StartSellingContent() {
  const features = [
    {
      icon: Users,
      title: "Large Audience",
      description: "Reach thousands of creators looking for quality templates"
    },
    {
      icon: DollarSign,
      title: "Fair Pricing",
      description: "Set your own prices and earn competitive commissions"
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Safe transactions and intellectual property protection"
    },
    {
      icon: Zap,
      title: "Easy Upload",
      description: "Simple process to list and manage your templates"
    },
    {
      icon: TrendingUp,
      title: "Analytics",
      description: "Track your sales and performance with detailed insights"
    }
  ];

  return (
    <main className="bg-white min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6">
            <Rocket className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            <span className="text-blue-600">Start Selling</span>{' '}
            <span className="text-zinc-900">Your Templates</span>
          </h1>
          <p className="text-zinc-600 text-lg sm:text-xl max-w-3xl mx-auto mb-8">
            Join our community of creators and monetize your creative work.
            Share your After Effects templates with thousands of designers worldwide.
          </p>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 border-2 border-blue-200 rounded-full mb-8">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-blue-600 text-sm font-semibold">Coming Soon</span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border-2 border-zinc-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-zinc-600 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to Share Your Creativity?
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            We're building an amazing platform for creators. Get notified when we launch!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-white text-blue-600 px-8 py-3 font-semibold hover:bg-blue-50 transition-colors shadow-lg"
            >
              Get Notified
            </Link>
            <Link
              href="/video-templates"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white text-white px-8 py-3 font-semibold hover:bg-white/10 transition-colors"
            >
              Browse Templates
            </Link>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-zinc-500 text-sm">
            Questions? <Link href="/contact" className="text-blue-600 hover:underline font-semibold">Contact our team</Link> to learn more
          </p>
        </div>
      </div>
    </main>
  );
}
