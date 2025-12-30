'use client';

import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';

export default function ContactContent() {
  return (
    <main className="bg-background min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-blue-600 mb-4">
            Contact Us
          </h1>
          <p className="text-zinc-600 text-lg">
            Have questions? We're here to help. Reach out to us using the information below.
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Email Card */}
          <div className="bg-white rounded-xl border-2 border-zinc-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Email</h3>
            <p className="text-zinc-600 text-sm mb-3">Send us an email anytime</p>
            <a
              href="mailto:elitechaplin@gmail.com"
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm hover:underline"
            >
              elitechaplin@gmail.com
            </a>
          </div>

          {/* Phone Card */}
          <div className="bg-white rounded-xl border-2 border-zinc-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Phone</h3>
            <p className="text-zinc-600 text-sm mb-3">Call us during business hours</p>
            <a
              href="tel:8939079627"
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm hover:underline"
            >
              +91 8939079627
            </a>
          </div>
        </div>

        {/* Merchant Information */}
        <div className="bg-white rounded-xl border-2 border-zinc-200 p-8 mb-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Merchant Information</h2>
              <p className="text-zinc-600">Official business details</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-zinc-500 mb-1">Legal Entity Name</p>
              <p className="text-zinc-900">Celite</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-500 mb-1">Registered Address</p>
              <p className="text-zinc-900">
                PKP, Othakadai 625023<br />
                Madras High Court Madurai Bench SO<br />
                TAMIL NADU 625023
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-500 mb-1">Operational Address</p>
              <p className="text-zinc-900">
                PKP, Othakadai 625023<br />
                Madras High Court Madurai Bench SO<br />
                TAMIL NADU 625023
              </p>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">
            Need Immediate Assistance?
          </h3>
          <p className="text-blue-100 mb-6">
            Our support team typically responds within 24 hours
          </p>
          <a
            href="mailto:elitechaplin@gmail.com"
            className="inline-flex items-center justify-center rounded-lg bg-white text-blue-600 px-8 py-3 font-semibold hover:bg-blue-50 transition-colors shadow-lg"
          >
            Send Us a Message
          </a>
        </div>
      </div>
    </main>
  );
}
