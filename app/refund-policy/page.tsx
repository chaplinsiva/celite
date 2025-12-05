import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Refund and Returns Policy | Celite',
  description: 'Refund and Returns Policy for Celite - Professional After Effects Templates',
};

export default function RefundPolicyPage() {
  return (
    <main className="bg-white min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-blue-600">Refund Policy</h1>
        <p className="text-zinc-500 mb-8">Last updated on Nov 28 2025</p>

        <div className="prose max-w-none space-y-6 text-zinc-700">
          <p>
            <strong>Celite</strong> believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. Under this policy:
          </p>

          <h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">Cancellation Policy</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Cancellations will be considered only if the request is made within <span className="font-semibold">Not Applicable</span> of placing the order.
              However, the cancellation request may not be entertained if the orders have been communicated to the vendors/merchants and they have initiated
              the process of shipping them.
            </li>
            <li>
              Celite does not accept cancellation requests for perishable items like flowers, eatables etc. However, refund/replacement can be made if the
              customer establishes that the quality of product delivered is not good.
            </li>
            <li>
              In case of receipt of damaged or defective items please report the same to our Customer Service team. The request will, however, be entertained
              once the merchant has checked and determined the same at his own end. This should be reported within{' '}
              <span className="font-semibold">Not Applicable</span> of receipt of the products.
            </li>
            <li>
              In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our
              customer service within <span className="font-semibold">Not Applicable</span> of receiving the product. The Customer Service Team after looking
              into your complaint will take an appropriate decision.
            </li>
            <li>
              In case of complaints regarding products that come with a warranty from manufacturers, please refer the issue to them.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">Refund Policy</h2>
          <p>
            In case of any Refunds approved by Celite, it&apos;ll take <span className="font-semibold">Not Applicable</span> for the refund to be processed
            to the end customer.
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

