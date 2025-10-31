import ContactForm from "../../components/ContactForm";

export const metadata = {
  title: "Contact Celite • Collaborate with Our Team",
  description: "Get in touch with the Celite founders for partnerships, support, or custom template requests.",
};

const contactDetails = [
  {
    label: "Support",
    email: "support@celite.studio",
    description: "Questions about templates, licensing, or your account.",
  },
  {
    label: "Partnerships",
    email: "partners@celite.studio",
    description: "Collaborate with us on production-ready motion experiences.",
  },
  {
    label: "Press",
    email: "press@celite.studio",
    description: "Media inquiries, interviews, and press materials.",
  },
];

export default function ContactPage() {
  return (
    <main className="bg-black min-h-screen pt-24 pb-24 px-4 sm:px-8 text-white">
      <section className="max-w-5xl mx-auto text-center mb-16">
        <span className="uppercase tracking-[0.4em] text-xs text-zinc-500">Contact</span>
        <h1 className="mt-4 text-4xl md:text-5xl font-bold">Let’s Build Your Next Story</h1>
        <p className="mt-6 text-lg text-zinc-300 leading-relaxed">
          Whether you’re looking for custom template packages, creative partnerships, or product support,
          the Celite founders are ready to help you deliver cinematic motion design.
        </p>
      </section>

      <section className="max-w-5xl mx-auto grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-zinc-900 bg-gradient-to-br from-zinc-950/80 to-zinc-900/40 p-10 shadow-xl">
          <h2 className="text-2xl font-semibold">Send us a message</h2>
          <p className="mt-3 text-sm text-zinc-400">
            We respond within one business day. Provide as much detail as you can so we can route your note to the right founder.
          </p>
          <ContactForm />
        </div>

        <div className="space-y-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg">
            <h3 className="text-xl font-semibold">Direct access</h3>
            <p className="mt-3 text-sm text-zinc-400">
              Reach out to any founder directly for strategic partnerships, enterprise solutions, or bespoke templates.
            </p>
            <ul className="mt-6 space-y-4 text-sm text-zinc-300">
              <li>
                <span className="font-medium text-white">T Thavasiva</span> — CEO & Co-Founder<br />
                <a href="mailto:thavasiva@celite.studio" className="text-blue-300 hover:underline">thavasiva@celite.studio</a>
              </li>
              <li>
                <span className="font-medium text-white">S Sriram</span> — Co-Founder<br />
                <a href="mailto:sriram@celite.studio" className="text-blue-300 hover:underline">sriram@celite.studio</a>
              </li>
              <li>
                <span className="font-medium text-white">S Anandhakumaran</span> — Co-Founder<br />
                <a href="mailto:anandhakumaran@celite.studio" className="text-blue-300 hover:underline">anandhakumaran@celite.studio</a>
              </li>
              <li>
                <span className="font-medium text-white">K Karthikeyan</span> — Co-Founder<br />
                <a href="mailto:karthikeyan@celite.studio" className="text-blue-300 hover:underline">karthikeyan@celite.studio</a>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg">
            <h3 className="text-xl font-semibold">Team inboxes</h3>
            <div className="mt-6 space-y-5">
              {contactDetails.map((item) => (
                <div key={item.label} className="rounded-2xl bg-black/40 p-5">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <a href={`mailto:${item.email}`} className="text-blue-300 text-sm hover:underline">
                    {item.email}
                  </a>
                  <p className="mt-2 text-xs text-zinc-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

