import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Privacy Policy | Celite',
  description: 'Privacy Policy for Celite - Professional After Effects Templates',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-white min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-blue-600">Privacy Policy</h1>
        <p className="text-zinc-500 mb-8">Last updated on Nov 28 2025</p>

        <div className="prose max-w-none space-y-6 text-zinc-700">
          <p>
            This privacy policy sets out how <strong className="text-zinc-900">Celite</strong> uses and protects any information that you give Celite when you visit their website
            and/or agree to purchase from them.
          </p>

          <p>
            Celite is committed to ensuring that your privacy is protected. Should we ask you to provide certain information by which you can be identified
            when using this website, then you can be assured that it will only be used in accordance with this privacy statement.
          </p>

          <p>
            Celite may change this policy from time to time by updating this page. You should check this page from time to time to ensure that you adhere
            to these changes.
          </p>

          <h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">We may collect the following information:</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Name</li>
            <li>Contact information including email address</li>
            <li>Demographic information such as postcode, preferences and interests, if required</li>
            <li>Other information relevant to customer surveys and/or offers</li>
          </ul>

          <h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">What we do with the information we gather</h2>
          <p>
            We require this information to understand your needs and provide you with a better service, and in particular for the following reasons:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Internal record keeping.</li>
            <li>We may use the information to improve our products and services.</li>
            <li>We may periodically send promotional emails about new products, special offers or other information which we think you may find interesting using the email address which you have provided.</li>
            <li>From time to time, we may also use your information to contact you for market research purposes. We may contact you by email, phone, fax or mail. We may use the information to customise the website according to your interests.</li>
          </ul>
          <p>
            We are committed to ensuring that your information is secure. In order to prevent unauthorised access or disclosure we have put in suitable measures.
          </p>

          <h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">How we use cookies</h2>
          <p>
            A cookie is a small file which asks permission to be placed on your computer&apos;s hard drive. Once you agree, the file is added and the cookie helps analyze web traffic or lets you know when you visit a particular site.
            Cookies allow web applications to respond to you as an individual. The web application can tailor its operations to your needs, likes and dislikes
            by gathering and remembering information about your preferences.
          </p>
          <p>
            We use traffic log cookies to identify which pages are being used. This helps us analyze data about webpage traffic and improve our website in order
            to tailor it to customer needs. We only use this information for statistical analysis purposes and then the data is removed from the system.
          </p>
          <p>
            Overall, cookies help us provide you with a better website, by enabling us to monitor which pages you find useful and which you do not. A cookie in no way gives us access to your computer or any information about you, other than the data you choose to share with us.
          </p>
          <p>
            You can choose to accept or decline cookies. Most web browsers automatically accept cookies, but you can usually modify your browser setting to decline cookies if you prefer. This may prevent you from taking full advantage of the website.
          </p>

          <h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">Controlling your personal information</h2>
          <p>
            You may choose to restrict the collection or use of your personal information in the following ways:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>whenever you are asked to fill in a form on the website, look for the box that you can click to indicate that you do not want the information to be used by anybody for direct marketing purposes</li>
            <li>if you have previously agreed to us using your personal information for direct marketing purposes, you may change your mind at any time by writing to or emailing us</li>
          </ul>
          <p>
            We will not sell, distribute or lease your personal information to third parties unless we have your permission or are required by law to do so. We may use your personal information to send you promotional information about third parties which we think you may find interesting if you tell us that you wish this to happen.
          </p>
          <p>
            If you believe that any information we are holding on you is incorrect or incomplete, please write to{' '}
            <span className="font-semibold text-zinc-900">PKP, Othakadai 625023 Madras High Court Madurai Bench SO TAMIL NADU 625023</span> or contact us at{' '}
            <a href="tel:8939079627" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
              8939079627
            </a>{' '}
            or{' '}
            <a href="mailto:elitechaplin@gmail.com" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
              elitechaplin@gmail.com
            </a>{' '}
            as soon as possible. We will promptly correct any information found to be incorrect.
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

