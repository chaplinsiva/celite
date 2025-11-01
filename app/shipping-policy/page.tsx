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
        <p className="text-zinc-400 mb-8">Last updated on Nov 10th 2023</p>

        <div className="prose prose-invert max-w-none space-y-6 text-zinc-300">
          <p>
            Shipping is not applicable for our business as we provide digital products (After Effects templates) that are delivered instantly via digital download upon successful payment.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Digital Product Delivery</h2>
          <p>
            All our templates are digital products that are delivered immediately after purchase. Once your payment is confirmed, you will receive instant access to download your purchased templates through your account dashboard.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Download Access</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Upon successful payment, you will receive immediate access to your purchased templates</li>
            <li>Downloads are available through your account dashboard</li>
            <li>You can download your purchases at any time after purchase</li>
            <li>No physical shipping is required as all products are digital</li>
          </ul>

          <div className="mt-8 p-6 bg-zinc-900/50 rounded-lg border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
            <p className="mb-2">Phone: <a href="tel:+916374401608" className="text-blue-400 hover:text-blue-300">+91 6374401608</a></p>
            <p>Email: <a href="mailto:elitechaplin@gmail.com" className="text-blue-400 hover:text-blue-300">elitechaplin@gmail.com</a></p>
          </div>
        </div>
      </div>
    </main>
  );
}

