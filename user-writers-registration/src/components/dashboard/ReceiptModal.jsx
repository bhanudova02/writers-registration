import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ReceiptModal({ receiptModal, isDownloading, closeReceiptModal, handleDownloadReceipt, handleUnlockDownload, handleDownloadStampedScript, isFullScreen }) {
  const [scriptDownloaded, setScriptDownloaded] = useState(false);
  const [receiptDownloaded, setReceiptDownloaded] = useState(false);
  const [isScriptProcessing, setIsScriptProcessing] = useState(false);
  const [isReceiptProcessing, setIsReceiptProcessing] = useState(false);

  if (!receiptModal.type || !receiptModal.registration) return null;

  const requiresBothDownloads = receiptModal.isPaymentSuccess === true;
  const canClose = !requiresBothDownloads || (scriptDownloaded && receiptDownloaded);

  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    if (!requiresBothDownloads) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [requiresBothDownloads]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const containerClasses = isFullScreen
    ? "min-h-screen bg-slate-50 px-4 py-8 overflow-y-auto w-full font-sans block"
    : "fixed inset-0 z-[60] bg-black/80 px-4 py-8 overflow-y-auto flex items-start justify-center font-sans";

  return (
    <div className={containerClasses}>
      <div className={`w-full max-w-md rounded-lg border border-zinc-200 bg-white shadow-2xl shrink-0 ${isFullScreen ? 'shadow-xl border-zinc-300 mx-auto mt-4 md:mt-16 mb-10' : 'mt-4 md:mt-10 mb-10 mx-auto'}`}>
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
              className={`rounded border px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${isFullScreen ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'border-zinc-200 text-zinc-600 hover:text-zinc-900'}`}
            >
              {isFullScreen ? 'Go to Home Page' : 'Close'}
            </button>
          )}
        </div>

        <div className="space-y-4 px-5 py-5 flex flex-col">
          {receiptModal.type === 'download' ? (
            <>
              {requiresBothDownloads ? (
                <div className="flex gap-3 w-full order-1">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsScriptProcessing(true);
                      await handleDownloadStampedScript();
                      setScriptDownloaded(true);
                      setIsScriptProcessing(false);
                    }}
                    disabled={isDownloading}
                    className="flex-1 rounded bg-blue-600 px-2 py-3 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isScriptProcessing ? (
                      <><Loader2 className="animate-spin" size={16} /> Stamping...</>
                    ) : scriptDownloaded ? 'Download Script Again' : 'Download Script'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsReceiptProcessing(true);
                      await handleDownloadReceipt(receiptModal.registration);
                      setReceiptDownloaded(true);
                      setIsReceiptProcessing(false);
                    }}
                    disabled={isDownloading}
                    className="flex-1 rounded bg-green-600 px-2 py-3 text-sm font-extrabold text-white hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isReceiptProcessing ? (
                      <><Loader2 className="animate-spin" size={16} /> Generating...</>
                    ) : receiptDownloaded ? 'Download Receipt Again' : 'Download Receipt'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    setIsReceiptProcessing(true);
                    await handleDownloadReceipt(receiptModal.registration);
                    setReceiptDownloaded(true);
                    setIsReceiptProcessing(false);
                  }}
                  disabled={isDownloading}
                  className="w-full rounded bg-green-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-green-700 disabled:opacity-60 order-1 flex items-center justify-center gap-2"
                >
                  {isReceiptProcessing ? (
                    <><Loader2 className="animate-spin" size={18} /> Generating Receipt...</>
                  ) : receiptDownloaded ? 'Download Receipt Again' : 'Download Receipt'}
                </button>
              )}
              {requiresBothDownloads ? (
                <div className="rounded border border-red-300 bg-red-50 p-4 text-sm font-bold leading-relaxed text-red-900 shadow-sm order-2 flex flex-col">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-red-200/60">
                    <span className="flex items-center gap-2 uppercase tracking-wide text-xs">
                       ⏳ Time remaining:
                    </span>
                    <span className={`text-2xl font-black font-mono tracking-widest ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-red-500'}`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                  <div>
                    ⚠️ CRITICAL WARNING: You must download your Receipt and Stamped Script now. Do NOT refresh or close this window without downloading both, as your stamped script will be permanently lost and cannot be downloaded later.
                  </div>
                </div>
              ) : (
                <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-950 order-2">
                  Please download your stamped receipt now. This receipt can be downloaded only one time. Once you download it, the receipt will be locked automatically.
                </div>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleUnlockDownload(receiptModal.registration)}
                disabled={isDownloading}
                className="w-full rounded bg-amber-500 px-4 py-3 text-sm font-extrabold text-white hover:bg-amber-600 disabled:opacity-60 cursor-pointer order-1"
              >
                {isDownloading ? 'Opening Secure Payment...' : `Pay ₹${receiptModal.registration.amount} Securely`}
              </button>
              <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-950 order-2">
                Re-download requires a payment of ₹{receiptModal.registration.amount}. After successful payment, the receipt download will unlock again.
              </div>
            </>
          )}

          <div className="rounded border border-zinc-200 bg-white p-4 text-xs font-semibold text-zinc-700 space-y-2 shadow-sm order-3">
            <div className="flex justify-between"><span className="text-zinc-500">Name of the Member:</span> <span className="font-bold text-zinc-900">{receiptModal.registration.writerName}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Working Title:</span> <span className="font-bold text-zinc-900">{receiptModal.registration.title}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Total Pages:</span> <span className="font-bold text-zinc-900">{receiptModal.registration.pageCount}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Membership Id No.:</span> <span className="font-bold text-zinc-900">{receiptModal.registration.membershipId}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Receipt No.:</span> <span className="font-bold text-zinc-900">{receiptModal.registration.registrationId}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Time:</span> <span className="font-bold text-zinc-900">{new Date(receiptModal.registration.createdAt).toLocaleString()}</span></div>
            <div className="flex justify-between pt-1 border-t border-zinc-100"><span className="text-zinc-500">Amount:</span> <span className="font-bold text-green-600">₹{receiptModal.registration.amount}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
