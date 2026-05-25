import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function TermsOfUse() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-zinc-900">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 mt-6">
        <div className="bg-white p-6 md:p-10 rounded-sm shadow-sm border border-slate-200">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">Terms of Use</h1>
          <p className="text-sm text-slate-500 mb-10">Last Updated: May 25, 2026</p>

          <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">1. Portal Access & Authorization</h2>
              <p>
                The TCWA Script Registration Portal is strictly reserved for verified members of the Telugu Cine Writers Association. 
                Access is granted only upon successful validation of your Membership ID and registered mobile number via OTP. 
                Members are solely responsible for maintaining the confidentiality of their login sessions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">2. Membership Rules & Validity</h2>
              <p className="mb-2">Your access to the portal is governed by your specific membership type:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Life Time Members:</strong> Your account is permanently valid and does not require annual renewals.</li>
                <li><strong>Associate Members (Strict 5-Years Rule):</strong> You must manually renew your membership offline each year. If an Associate Member fails to renew consecutively for 5 years, the account will be marked as "Inactive", and portal access will be permanently locked until manually rectified by the Administrator.</li>
                <li><strong>Expiry Lock:</strong> Upon expiration of your annual validity, your dashboard access will be restricted via an unclosable warning modal. You must contact the Admin offline to register your payment and restore your active status.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">3. Script Registration & Fees</h2>
              <p>
                Registration fees are calculated automatically based on the page count of your uploaded PDF. 
                By proceeding with the Razorpay checkout, you agree to pay the calculated amount. 
                Upon successful payment, a digitally stamped and signed receipt is generated automatically. 
                You are strictly responsible for ensuring the correct file and correct category are selected prior to payment.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">4. One-Time Download Restriction</h2>
              <p>
                To maintain the integrity and security of the registration process, we enforce a strict <strong>One-Time Download Policy</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Upon successful registration, you are permitted to download your digitally stamped receipt <strong>exactly once</strong>.</li>
                <li>After the first download, the document will be permanently <strong>Locked</strong>.</li>
                <li>If you fail to save your file or require another copy of the receipt, <strong>you must pay the full registration fee again</strong> via the portal to unlock a new download. There are no exceptions to this rule.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">5. Disclaimer</h2>
              <p>
                The TCWA Admin and system administrators are not responsible for lost downloads, incorrect file uploads, or failed network connections leading to missed downloads. 
                It is the member's responsibility to securely save the generated PDF receipt immediately after the initial download.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
