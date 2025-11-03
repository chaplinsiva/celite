import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Shipping Policy | Celite',
  description: 'Shipping Policy for Celite - Professional After Effects Templates',
};

export default function ShippingPolicyPage() {
  return (
    <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Shipping Policy</h1>
        <p className="text-zinc-400 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-invert max-w-none space-y-6 text-zinc-300">
          <p>
            For International buyers, orders are shipped and delivered through registered international courier companies and/or International speed post only. For domestic buyers, orders are shipped through registered domestic courier companies and /or speed post only.
          </p>

          <p>
            Orders are shipped within Not Applicable or as per the delivery date agreed at the time of order confirmation and delivering of the shipment subject to Courier Company / post office norms.
          </p>

          <p>
            <strong className="text-white">Thavamaniraja V</strong> is not liable for any delay in delivery by the courier company / postal authorities and only guarantees to hand over the consignment to the courier company or postal authorities within Not Applicable from the date of the order and payment or as per the delivery date agreed at the time of order confirmation.
          </p>

          <p>
            Delivery of all orders will be to the address provided by the buyer. Delivery of our services will be confirmed on your mail ID as specified during registration.
          </p>

          <p>
            For any issues in utilizing our services you may contact our helpdesk on <a href="tel:6374401608" className="text-blue-400 hover:text-blue-300">6374401608</a> or <a href="mailto:elitechaplin@gmail.com" className="text-blue-400 hover:text-blue-300">elitechaplin@gmail.com</a>.
          </p>

          <div className="mt-8 p-6 bg-zinc-900/50 rounded-lg border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
            <p className="mb-2">Phone: <a href="tel:6374401608" className="text-blue-400 hover:text-blue-300">6374401608</a></p>
            <p>Email: <a href="mailto:elitechaplin@gmail.com" className="text-blue-400 hover:text-blue-300">elitechaplin@gmail.com</a></p>
          </div>
        </div>
      </div>
    </main>
  );
}

