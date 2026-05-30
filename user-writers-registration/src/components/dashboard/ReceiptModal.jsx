import { useState } from 'react';

export default function ReceiptModal({ receiptModal, isDownloading, closeReceiptModal, handleDownloadReceipt, handleUnlockDownload, handleDownloadStampedScript }) {
  const [hasDownloaded, setHasDownloaded] = useState(false);

  if (!receiptModal.type || !receiptModal.registration) return null;

  const requiresBothDownloads = receiptModal.isPaymentSuccess === true;
  const canClose = !requiresBothDownloads || hasDownloaded;

  const onDownloadBoth = async () => {
    // Trigger both downloads concurrently
    handleDownloadReceipt(receiptModal.registration);
    if (requiresBothDownloads) {
      handleDownloadStampedScript();
    }
    setHasDownloaded(true);
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
          {canClose && (
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
              {requiresBothDownloads ? (
                <div className="rounded border border-red-300 bg-red-50 p-4 text-sm font-bold leading-relaxed text-red-900 shadow-sm">
                  ⚠️ CRITICAL WARNING: You must download your Receipt and Stamped Script now. Do NOT refresh or close this window without downloading, as your stamped script will be permanently lost and cannot be downloaded later. The Close button will appear after you download.
                </div>
              ) : (
                <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-950">
                  Please download your stamped receipt now. This receipt can be downloaded only one time. Once you download it, the receipt will be locked automatically.
                </div>
              )}
              <button
                type="button"
                onClick={requiresBothDownloads ? onDownloadBoth : () => handleDownloadReceipt(receiptModal.registration)}
                disabled={isDownloading}
                className="w-full rounded bg-green-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {isDownloading ? 'Preparing Download...' : (requiresBothDownloads ? 'Download Script and Receipt' : 'Download Receipt')}
              </button>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
