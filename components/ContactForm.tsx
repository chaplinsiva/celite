"use client";

import { FormEvent, useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name");
    setStatus(
      typeof name === "string"
        ? `Thanks, ${name}. We'll be in touch shortly!`
        : "Thanks! We'll be in touch shortly!"
    );
    event.currentTarget.reset();
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2 text-left">
        <label htmlFor="name" className="text-sm font-medium text-zinc-300">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Your name"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>
      <div className="space-y-2 text-left">
        <label htmlFor="email" className="text-sm font-medium text-zinc-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@company.com"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>
      <div className="space-y-2 text-left">
        <label htmlFor="company" className="text-sm font-medium text-zinc-300">
          Company / Studio
        </label>
        <input
          id="company"
          name="company"
          type="text"
          placeholder="Optional"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>
      <div className="space-y-2 text-left">
        <label htmlFor="message" className="text-sm font-medium text-zinc-300">
          Project Details
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Tell us about the motion design challenge you’re solving..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
      >
        Send message
      </button>
      <p className="text-xs text-zinc-500 text-left">
        By submitting, you agree to Celite’s privacy policy. We’ll email you to follow up within 24 hours.
      </p>
      {status && (
        <p className="text-sm font-medium text-green-300/90">{status}</p>
      )}
    </form>
  );
}

