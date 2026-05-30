import { useState } from 'react';

export default function ReceiptModal({ receiptModal, isDownloading, closeReceiptModal, handleDownloadReceipt, handleUnlockDownload, handleDownloadStampedScript }) {
  const [hasDownloadedReceipt, setHasDownloadedReceipt] = useState(false);
  const [hasDownloadedScript, setHasDownloadedScript] = useState(false);

  if (!receiptModal.type || !receiptModal.registration) return null;

  const requiresBothDownloads = receiptModal.isPaymentSuccess === true;
  const bothDownloaded = !requiresBothDownloads || (hasDownloadedReceipt && hasDownloadedScript);

  const onDownloadReceipt = async () => {
    await handleDownloadReceipt(receiptModal.registration);
    setHasDownloadedReceipt(true);
  };

  const onDownloadScript = async () => {
    await handleDownloadStampedScript();
    setHasDownloadedScript(true);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 px-4 py-8 overflow-y-auto flex items-start justify-center">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-zinc-50 shadow-2xl my-auto shrink-0">
        <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h3 className="text-base font-extrabold text-zinc-900">
              {receiptModal.type === 'download' ? (receiptModal.isPaymentSuccess ? 'Payment Successful' : 'One-Time Receipt Download') : 'Re-download Payment Required'}
            </h3>
            <p className="mt-1 text-xs font-semibold text-zinc-500">
              Receipt ID: {receiptModal.registration.registrationId}
            </p>
          </div>
          {bothDownloaded && (
            <button
              type="button"
              onClick={closeReceiptModal}
              disabled={isDownloading}
              className="rounded border border-zinc-200 px-2 py-1 text-xs font-bold text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
            >
              Close
            </button>
          )}
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded border border-zinc-200 bg-white p-4 text-xs font-semibold text-zinc-700 space-y-2 shadow-sm">
            <div className="flex justify-between"><span className="text-zinc-500">Name of the Member:</span> <span className="font-bold text-zinc-900">{receiptModal.registration.writerName}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Working Title:</span> <span className="font-bold text-zinc-900">{receiptModal.registration.title}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Total Pages:</span> <span className="font-bold text-zinc-900">{receiptModal.registration.pageCount}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Membership Id No.:</span> <span className="font-bold text-zinc-900">{receiptModal.registration.membershipId}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Receipt No.:</span> <span className="font-bold text-zinc-900">{receiptModal.registration.registrationId}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Time:</span> <span className="font-bold text-zinc-900">{new Date(receiptModal.registration.createdAt).toLocaleString()}</span></div>
            <div className="flex justify-between pt-1 border-t border-zinc-100"><span className="text-zinc-500">Amount:</span> <span className="font-bold text-green-600">₹{receiptModal.registration.amount}</span></div>
          </div>

          {receiptModal.type === 'download' ? (
            <>
              {receiptModal.isPaymentSuccess && (
                <div className="rounded border border-green-200 bg-green-50 p-3 text-sm font-extrabold text-green-900">
                  Script registered and approved successfully.
                </div>
              )}
              <div className="rounded border border-red-300 bg-red-50 p-4 text-sm font-bold leading-relaxed text-red-900 shadow-sm">
                ⚠️ CRITICAL WARNING: You must immediately download both your Receipt and Stamped Script. Do NOT refresh or close this page without downloading, otherwise your stamped script will be permanently lost. This modal cannot be closed until both files are downloaded successfully.
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onDownloadReceipt}
                  disabled={isDownloading || hasDownloadedReceipt}
                  className="w-full rounded bg-zinc-200 border border-zinc-300 px-4 py-3 text-sm font-extrabold text-zinc-800 hover:bg-zinc-300 disabled:opacity-60"
                >
                  {isDownloading ? 'Preparing...' : (hasDownloadedReceipt ? 'Downloaded' : 'Download Receipt')}
                </button>
                {requiresBothDownloads && (
                  <button
                    type="button"
                    onClick={onDownloadScript}
                    disabled={isDownloading || hasDownloadedScript}
                    className="w-full rounded bg-green-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {isDownloading ? 'Stamping...' : (hasDownloadedScript ? 'Downloaded' : 'Download Script')}
                  </button>
                )}
              </div>
              {bothDownloaded && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={closeReceiptModal}
                    className="w-full rounded bg-zinc-800 px-4 py-3 text-sm font-extrabold text-white hover:bg-zinc-900 transition"
                  >
                    Close
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-950">
                Re-download requires a payment of ₹{receiptModal.registration.amount}. After successful payment, the receipt download will unlock again.
              </div>
              <button
                type="button"
                onClick={() => handleUnlockDownload(receiptModal.registration)}
                disabled={isDownloading}
                className="w-full rounded bg-amber-500 px-4 py-3 text-sm font-extrabold text-white hover:bg-amber-600 disabled:opacity-60 cursor-pointer"
              >
                {isDownloading ? 'Opening Secure Payment...' : `Pay ₹${receiptModal.registration.amount} Securely`}
              </button>
              {bothDownloaded && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={closeReceiptModal}
                    className="w-full rounded bg-zinc-800 px-4 py-3 text-sm font-extrabold text-white hover:bg-zinc-900 transition"
                  >
                    Close
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
