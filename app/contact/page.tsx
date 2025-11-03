export const metadata = {
  title: "Contact Us | Celite",
  description: "Contact information for Celite - Professional After Effects Templates",
};

export default function ContactPage() {
  return (
    <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
        <p className="text-zinc-400 mb-8">
          You may contact us using the information below:
        </p>

        <div className="space-y-6 text-zinc-300">
          <div className="p-6 bg-zinc-900/50 rounded-lg border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Merchant Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-zinc-400 mb-1">Legal Entity Name</p>
                <p className="text-white">Thavamaniraja V</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400 mb-1">Registered Address</p>
                <p className="text-white">AK Office Jawagar Puram<br />Madurai<br />TAMIL NADU 625107</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400 mb-1">Operational Address</p>
                <p className="text-white">AK Office Jawagar Puram<br />Madurai<br />TAMIL NADU 625107</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-zinc-900/50 rounded-lg border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Contact Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-zinc-400 mb-1">Telephone</p>
                <p className="text-white">
                  <a href="tel:6374401608" className="text-blue-400 hover:text-blue-300">6374401608</a>
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
    </main>
  );
}

