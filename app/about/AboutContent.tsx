'use client';

import Image from 'next/image';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { cn } from '@/lib/utils';

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
    role: "Co-Founder and Creative Lead and Marketing",
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
    <main className="bg-black min-h-screen pt-24 pb-20 px-4 sm:px-8 text-white">
      {/* Colorful Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <section className="relative max-w-5xl mx-auto text-center mb-16">
        <span className="uppercase tracking-[0.4em] text-xs text-zinc-400">Our Story</span>
        <h1 className="mt-4 text-4xl md:text-5xl font-bold text-white">Designing Motion for the Next Generation</h1>
        <p className="mt-6 text-lg text-zinc-300 leading-relaxed">
          Celite is a collective of artists, engineers, and storytellers building cinematic After Effects templates
          so creators can move faster and tell powerful stories. We obsess over detail, from every keyframe to the
          smoothest onboarding experience.
        </p>
      </section>

      <section className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          {founders.map((person) => (
            <article
              key={person.name}
              className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3"
            >
              <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={3}
              />
              <div className="relative flex h-full flex-col overflow-hidden rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
                <div className="relative w-full aspect-[3/4] overflow-hidden bg-zinc-900/50">
                  <Image
                    src={person.image}
                    alt={person.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <div className="flex flex-col gap-4 p-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-white">{person.name}</h2>
                    <p className="text-sm tracking-wider text-blue-200/80 uppercase">{person.role}</p>
                    <p className="text-sm leading-7 text-zinc-300">{person.bio}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="relative max-w-5xl mx-auto mt-20">
        <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-10 text-center shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
            <h3 className="text-2xl font-semibold text-white">Join the Movement</h3>
            <p className="mt-4 text-zinc-300">
              We are partnering with studios and creators around the globe to push motion design forward.
              Reach out to collaborate, contribute, or explore custom template packages tailored for your brand.
            </p>
            <a
              href="mailto:hello@celite.studio"
              className="mt-6 inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white hover:text-black"
            >
              hello@celite.studio
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

