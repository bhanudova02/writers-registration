import { ReceiptText, RefreshCw, Lock, Check } from 'lucide-react';

export default function RegistrationsTable({ isLoadingMyRegs, myRegistrations, requestUnlockDownload, requestReceiptDownload, isDownloading }) {
  return (
    <section className="bg-white border border-slate-200 p-5 rounded-lg space-y-4">
      <div className="flex items-center gap-2 border-b border-zinc-200/60 pb-3">
        <ReceiptText className="text-amber-500" />
        <div>
          <h3 className="text-lg font-bold text-zinc-900">My Script Registration Logs</h3>
          <p className="text-xs text-zinc-500 font-semibold">View and track all registered documents and re-download locks.</p>
        </div>
      </div>

      {isLoadingMyRegs ? (
        <div className="py-12 flex flex-col items-center justify-center text-zinc-500 text-xs font-bold">
          <RefreshCw className="animate-spin text-amber-500 mb-2" size={20} />
          <span>Fetching script logs...</span>
        </div>
      ) : myRegistrations.length === 0 ? (
        <div className="py-12 text-center text-xs font-bold text-zinc-500 border border-dashed border-zinc-200 rounded-md">
          No registered scripts found in your member history.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse border border-zinc-200">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200 text-left">
                {["Reg ID", "Script Title", "Category", "Pages", "Amount", "Date", "Download Status"].map((head) => (
                  <th key={head} className="border border-zinc-200 py-2.5 px-3 text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {myRegistrations.map((reg) => (
                <tr key={reg.registrationId} className="hover:bg-white/40 transition-colors border-b border-zinc-900">
                  <td className="border border-zinc-200 py-3 px-3 text-xs font-bold text-amber-500">
                    {reg.registrationId}
                  </td>
                  <td className="border border-zinc-200 py-3 px-3 text-xs font-bold text-zinc-900">
                    {reg.title}
                  </td>
                  <td className="border border-zinc-200 py-3 px-3 text-xs font-bold text-zinc-600">
                    {reg.category}
                  </td>
                  <td className="border border-zinc-200 py-3 px-3 text-xs font-bold text-zinc-600">
                    {reg.pageCount} Pages
                  </td>
                  <td className="border border-zinc-200 py-3 px-3 text-xs font-bold text-green-500">
                    ₹{reg.amount}
                  </td>
                  <td className="border border-zinc-200 py-3 px-3 text-xs font-medium text-zinc-500">
                    {new Date(reg.createdAt).toLocaleDateString([], { dateStyle: 'short' })}
                  </td>
                  <td className="border border-zinc-200 py-3 px-3 w-48">
                    {reg.downloadCount >= 1 ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                          <Lock size={10} /> Locked
                        </span>
                        <button
                          type="button"
                          onClick={() => requestUnlockDownload(reg)}
                          className="text-[10px] text-amber-500 hover:underline font-extrabold cursor-pointer"
                        >
                          Unlock (₹{reg.amount})
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => requestReceiptDownload(reg)}
                        disabled={isDownloading}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 hover:bg-green-500/20 active:scale-[0.98] transition cursor-pointer"
                      >
                        <Check size={10} /> Download Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
