'use client';

import { GlowingEffect } from '@/components/ui/glowing-effect';
import { cn } from '@/lib/utils';

export default function ContactContent() {
  return (
    <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white relative">
      {/* Colorful Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="relative max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-white">Contact Us</h1>
        <p className="text-zinc-400 mb-8">
          You may contact us using the information below:
        </p>

        <div className="space-y-4 text-zinc-300">
          <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              <h2 className="text-xl font-semibold text-white mb-4">Merchant Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Legal Entity Name</p>
                  <p className="text-white">Celite</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Registered Address</p>
                  <p className="text-white">
                    PKP, Othakadai 625023<br />
                    Madras High Court Madurai Bench SO<br />
                    TAMIL NADU 625023
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Operational Address</p>
                  <p className="text-white">
                    PKP, Othakadai 625023<br />
                    Madras High Court Madurai Bench SO<br />
                    TAMIL NADU 625023
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              <h2 className="text-xl font-semibold text-white mb-4">Contact Details</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Telephone</p>
                  <p className="text-white">
                    <a href="tel:8939079627" className="text-blue-400 hover:text-blue-300">8939079627</a>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Email</p>
                  <p className="text-white">
                    <a href="mailto:elitechaplin@gmail.com" className="text-blue-400 hover:text-blue-300">elitechaplin@gmail.com</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

