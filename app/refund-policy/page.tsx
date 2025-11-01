import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Refund and Returns Policy | Celite',
  description: 'Refund and Returns Policy for Celite - Professional After Effects Templates',
};

export default function RefundPolicyPage() {
  return (
    <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Cancellation & Refund Policy</h1>
        <p className="text-zinc-400 mb-8">Last updated on Nov 10th 2023</p>

        <div className="prose prose-invert max-w-none space-y-6 text-zinc-300">
          <p>
            <strong>CELITE</strong> believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. Under this policy:
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Cancellation Policy</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Cancellations will be considered only if the request is made immediately after placing the order. However, the cancellation request may not be entertained if the orders have been communicated to the vendors/merchants and they have initiated the process of shipping them.
            </li>
            <li>
              CELITE does not accept cancellation requests for perishable items like flowers, eatables etc. However, refund/replacement can be made if the customer establishes that the quality of product delivered is not good.
            </li>
            <li>
              In case of receipt of damaged or defective items please report the same to our Customer Service team. The request will, however, be entertained once the merchant has checked and determined the same at his own end. This should be reported within reasonable time of receipt of the products.
            </li>
            <li>
              In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our customer service within reasonable time of receiving the product. The Customer Service Team after looking into your complaint will take an appropriate decision.
            </li>
            <li>
              In case of complaints regarding products that come with a warranty from manufacturers, please refer the issue to them.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Refund Policy</h2>
          <p>
            In case of any Refunds approved by CELITE, it'll take reasonable time for the refund to be processed to the end customer.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Digital Product Refunds</h2>
          <p>
            Since we deal in digital products (After Effects templates), refunds may be considered in exceptional circumstances such as:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Technical issues preventing download or use of the product</li>
            <li>Product not matching the description provided</li>
            <li>Duplicate purchase made in error</li>
          </ul>
          <p className="mt-4">
            Refund requests for digital products must be made within 7 days of purchase and will be evaluated on a case-by-case basis.
          </p>

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

