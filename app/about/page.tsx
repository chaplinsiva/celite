export const metadata = {
  title: "About Celite • Creative Team",
  description: "Meet the Celite founding team building next-gen templates for creators.",
};

const founders = [
  {
    name: "T Thavasiva",
    role: "CEO & Co-Founder",
    bio: "Visionary leader focused on transforming motion graphics through accessible, premium templates.",
  },
  {
    name: "S Sriram",
    role: "Co-Founder",
    bio: "Drives product direction and ensures every template blends technical precision with aesthetics.",
  },
  {
    name: "S Anandhakumaran",
    role: "Co-Founder",
    bio: "Crafts dynamic brand experiences and maintains our signature cinematic style.",
  },
  {
    name: "K Karthikeyan",
    role: "Co-Founder",
    bio: "Leads platform experience, focusing on performance and effortless creator workflows.",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-black min-h-screen pt-24 pb-20 px-4 sm:px-8 text-white">
      <section className="max-w-5xl mx-auto text-center mb-16">
        <span className="uppercase tracking-[0.4em] text-xs text-zinc-400">Our Story</span>
        <h1 className="mt-4 text-4xl md:text-5xl font-bold">Designing Motion for the Next Generation</h1>
        <p className="mt-6 text-lg text-zinc-300 leading-relaxed">
          Celite is a collective of artists, engineers, and storytellers building cinematic After Effects templates
          so creators can move faster and tell powerful stories. We obsess over detail, from every keyframe to the
          smoothest onboarding experience.
        </p>
      </section>

      <section className="max-w-5xl mx-auto">
        <div className="grid gap-8 sm:gap-10 md:grid-cols-2">
          {founders.map((person) => (
            <article
              key={person.name}
              className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 p-8 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,120,255,0.14),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex flex-col items-start gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-white/5 text-xl font-semibold uppercase tracking-tight text-white">
                  {person.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">{person.name}</h2>
                  <p className="mt-1 text-sm tracking-wider text-blue-200/80 uppercase">{person.role}</p>
                </div>
                <p className="text-sm leading-7 text-zinc-300">{person.bio}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto mt-20">
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900/90 via-zinc-900/70 to-zinc-900/90 p-10 text-center shadow-xl">
          <h3 className="text-2xl font-semibold">Join the Movement</h3>
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
      </section>
    </main>
  );
}

