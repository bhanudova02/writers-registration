import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-zinc-900">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 md:py-20 mt-16">
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">Privacy Policy</h1>
          <p className="text-sm text-slate-500 mb-10">Last Updated: May 25, 2026</p>

          <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">1. 100% Writer Privacy Shield</h2>
              <p>
                At the Telugu Cine Writers Association (TCWA), safeguarding your creative property is our highest priority. We implement an uncompromising <strong>100% Privacy Shield</strong>. 
                When you upload your movie script, screenplay, songs, or dialogues, the document is processed entirely within secure protocols to count the pages. 
                <strong>The TCWA Administrators cannot view, read, or download the contents of your script files.</strong> The system exclusively logs the metadata (your name, script title, category, page count, and payment time) necessary to generate a digital stamped receipt.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">2. Information We Collect</h2>
              <p className="mb-2">We collect only the minimum data required to facilitate member authentication and script registration:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Member Credentials:</strong> Your registered Mobile Number and TCWA Membership ID are used exclusively for verification and secure login (OTP authentication).</li>
                <li><strong>Registration Metadata:</strong> Script titles, page counts, selected categories, and timestamps to record your digital receipt.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">3. Data Security & Encryption</h2>
              <p>
                Our infrastructure employs industry-standard encryption for data at rest and in transit. Your PDF scripts are strictly inaccessible by unauthorized personnel. 
                Payments are processed through a secure, encrypted Razorpay gateway. We do not store your credit card or sensitive banking information on our servers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">4. Automatic Approval Logic</h2>
              <p>
                To maintain confidentiality and eliminate manual intervention, our system employs automatic approval. 
                Once your payment is verified via the gateway, the script is automatically approved, and a digitally stamped and signed receipt is generated.
                The privacy of your work remains intact throughout the entirety of this automated process.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">5. Third-Party Sharing</h2>
              <p>
                We do not sell, rent, or trade your personal information or script data to any third party. Your scripts remain your absolute intellectual property. 
                Data may only be disclosed if required to comply with binding legal obligations.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
