import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Shipping Policy | Celite',
  description: 'Shipping Policy for Celite - Professional After Effects Templates',
};

export default function ShippingPolicyPage() {
  return (
    <main className="bg-white min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-blue-600">Licensing Terms</h1>
        <p className="text-zinc-500 mb-8">Last updated on Nov 28 2025</p>

        <div className="prose max-w-none space-y-6 text-zinc-700">
          <p>
            For International buyers, orders are shipped and delivered through registered international courier companies and/or International speed post only.
            For domestic buyers, orders are shipped through registered domestic courier companies and /or speed post only.
          </p>

          <p>
            Orders are shipped within Not Applicable or as per the delivery date agreed at the time of order confirmation and delivering of the shipment
            subject to Courier Company / post office norms.
          </p>

          <p>
            <strong className="text-zinc-900">Celite</strong> is not liable for any delay in delivery by the courier company / postal authorities and only
            guarantees to hand over the consignment to the courier company or postal authorities within Not Applicable from the date of the order and
            payment or as per the delivery date agreed at the time of order confirmation.
          </p>

          <p>
            Delivery of all orders will be to the address provided by the buyer. Delivery of our services will be confirmed on your mail ID as specified during registration.
          </p>

          <p>
            For any issues in utilizing our services you may contact our helpdesk on{' '}
            <a href="tel:8939079627" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
              8939079627
            </a>{' '}
            or{' '}
            <a href="mailto:elitechaplin@gmail.com" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
              elitechaplin@gmail.com
            </a>
            .
          </p>

          <div className="mt-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-100">
            <h3 className="text-lg font-semibold text-zinc-900 mb-3">Contact Information</h3>
            <p className="mb-2 text-zinc-700">
              Phone:{' '}
              <a href="tel:8939079627" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                8939079627
              </a>
            </p>
            <p className="text-zinc-700">
              Email:{' '}
              <a href="mailto:elitechaplin@gmail.com" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                elitechaplin@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

