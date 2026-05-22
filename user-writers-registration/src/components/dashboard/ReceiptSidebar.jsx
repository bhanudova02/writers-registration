import { ReceiptText, CheckCircle2, Lock } from 'lucide-react';

export default function ReceiptSidebar({ 
  selectedCategory, 
  pageCount, 
  successRegistration, 
  requestUnlockDownload, 
  requestReceiptDownload, 
  isDownloading 
}) {
  return (
    <aside className="bg-white/40 border border-zinc-200/80 p-5 rounded-lg h-fit space-y-4">
      <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-200/60 pb-2">Active Checkout Summary</h3>
      <div className="space-y-2 text-xs font-semibold text-zinc-600">
        <div className="flex justify-between">
          <span>Selected Category</span>
          <span className="text-zinc-900">{selectedCategory}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Pages</span>
          <span className="text-zinc-900">{pageCount} Pages</span>
        </div>
        <div className="flex justify-between border-t border-zinc-200/60 pt-2 text-sm font-bold">
          <span>Total Amount Due</span>
          <span className="text-amber-600">₹{pageCount * 10}</span>
        </div>
      </div>

      {successRegistration ? (
        <div className="bg-zinc-50/80 p-4 border border-zinc-200 rounded text-center space-y-3.5 relative overflow-hidden">
          <div className="absolute top-1 right-1">
            <span className="bg-green-500/10 text-green-400 border border-green-500/20 rounded px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wide">
              Success
            </span>
          </div>
          <ReceiptText className="text-green-500 mx-auto" size={32} />
          <div>
            <h4 className="text-sm font-bold text-zinc-900">Payment Successful</h4>
            <p className="text-[10px] text-zinc-500 mt-1">Receipt ID: {successRegistration.registrationId}</p>
          </div>

          {successRegistration.downloadCount >= 1 ? (
            <div className="space-y-2">
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-1.5 rounded border border-red-500/10 bg-red-500/10 text-red-400 px-3 py-2 text-xs font-bold opacity-80 cursor-not-allowed"
              >
                <Lock size={12} />
                <span>One-Time Download Locked</span>
              </button>
              <button
                type="button"
                onClick={() => requestUnlockDownload(successRegistration)}
                className="w-full text-center hover:underline text-[10px] text-amber-500 font-bold block cursor-pointer"
              >
                Unlock for Re-download (Pay ₹{successRegistration.amount})
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => requestReceiptDownload(successRegistration)}
              disabled={isDownloading}
              className="w-full flex items-center justify-center gap-1.5 rounded bg-green-600 hover:bg-green-700 text-zinc-900 px-3 py-2 text-xs font-bold active:scale-[0.98] transition cursor-pointer"
            >
              <CheckCircle2 size={12} />
              <span>{isDownloading ? 'Downloading...' : 'Download Stamped Receipt'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-zinc-50/40 p-5 border border-dashed border-zinc-200 rounded text-center py-8">
          <Lock className="text-zinc-600 mx-auto mb-2" size={24} />
          <p className="text-xs font-bold text-zinc-500">Receipt Auto Approval Lock</p>
          <p className="text-[10px] text-zinc-600 mt-1">Receipt unlocks automatically after completing secure Razorpay Checkout.</p>
        </div>
      )}
    </aside>
  );
}
