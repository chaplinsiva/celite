'use client';

import Image from 'next/image';
import { Users } from 'lucide-react';

const founders = [
  {
    name: "T Thavasiva",
    role: "Founder and CEO",
    bio: "Visionary leader focused on transforming motion graphics through accessible, premium templates.",
    image: "/thavasiva.jpg",
  },
  {
    name: "S Sriram",
    role: "Co-Founder and CTO",
    bio: "Drives product direction and ensures every template blends technical precision with aesthetics.",
    image: "/sreram.jpg",
  },
  {
    name: "S Anandhakumaran",
    role: "Co-Founder and Creative Lead",
    bio: "Crafts dynamic brand experiences and maintains our signature cinematic style.",
    image: "/anandh.jpg",
  },
  {
    name: "K Karthikeyan",
    role: "Co-Founder and COO",
    bio: "Leads platform experience, focusing on performance and effortless creator workflows.",
    image: "/Karthi.png",
  },
];

export default function AboutContent() {
  return (
    <main className="bg-background min-h-screen py-12 px-4">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 mb-6">
          <Users className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-6">
          <span className="text-blue-600">Meet</span>{' '}
          <span className="text-zinc-900">Our Team</span>
        </h1>
        <p className="text-zinc-600 text-lg leading-relaxed max-w-3xl mx-auto">
          Celite is a collective of artists, engineers, and storytellers building cinematic After Effects templates
          so creators can move faster and tell powerful stories. We obsess over detail, from every keyframe to the
          smoothest onboarding experience.
        </p>
      </section>

      {/* Founders Grid */}
      <section className="max-w-6xl mx-auto mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {founders.map((person) => (
            <div
              key={person.name}
              className="bg-white rounded-xl border-2 border-zinc-200 overflow-hidden hover:border-blue-300 hover:shadow-xl transition-all group"
            >
              <div className="relative w-full aspect-[3/4] overflow-hidden bg-zinc-100">
                <Image
                  src={person.image}
                  alt={person.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                />
              </div>
              <div className="p-6">
                <h2 className="text-xl font-bold text-zinc-900 mb-1">{person.name}</h2>
                <p className="text-sm text-blue-600 font-semibold mb-3 uppercase tracking-wide">{person.role}</p>
                <p className="text-sm text-zinc-600 leading-relaxed">{person.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Join Section */}
      <section className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 sm:p-12 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Join the Movement
          </h3>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            We are partnering with studios and creators around the globe to push motion design forward.
            Reach out to collaborate, contribute, or explore custom template packages tailored for your brand.
          </p>
          <a
            href="mailto:celitecontactsupport@celite.in"
            className="inline-flex items-center justify-center rounded-lg bg-white text-blue-600 px-8 py-3 font-semibold hover:bg-blue-50 transition-colors shadow-lg"
          >
            celitecontactsupport@celite.in
          </a>
        </div>
      </section>
    </main>
  );
}
