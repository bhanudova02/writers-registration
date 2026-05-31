import { useState } from 'react';
import { ReceiptText, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function RegistrationsTable({ isLoadingMyRegs, myRegistrations }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(myRegistrations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = myRegistrations.slice(startIndex, startIndex + itemsPerPage);

  return (
    <section className="bg-white border border-slate-200 p-5 rounded-lg space-y-4">
      <div className="flex items-start gap-1.5 border-b border-zinc-200/60 pb-3">
        <ReceiptText className="text-amber-500 mt-0.5 md:mt-1" />
        <div>
          <h3 className="text-base md:text-lg font-bold text-zinc-900">My Script Registration Logs</h3>
          <p className="text-xs text-zinc-500 font-semibold">View and track all your previous script registration logs.</p>
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
        <div className="flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse border border-zinc-200">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-left">
                  {["Reg ID", "Script Title", "Category", "Pages", "Amount", "Date"].map((head) => (
                    <th key={head} className={`border border-zinc-200 py-2.5 px-3 text-[11px] font-bold text-zinc-600 uppercase tracking-wider text-left`}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((reg) => (
                  <tr key={reg.registrationId} className="hover:bg-white/40 transition-colors border-b border-zinc-900">
                    <td className="border border-zinc-200 py-3 px-3">
                      <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded text-[11px] font-extrabold tracking-wider">
                        {reg.registrationId}
                      </span>
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
                    <td className="border border-zinc-200 py-3 px-3 text-xs font-bold text-green-600">
                      ₹{reg.amount}
                    </td>
                    <td className="border border-zinc-200 py-3 px-3 text-xs font-medium text-zinc-500 whitespace-nowrap">
                      {new Date(reg.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-200 mt-4 pt-4">
              <span className="text-xs text-zinc-500 font-medium">
                <span className="hidden sm:inline">Showing </span>
                <span className="font-bold text-zinc-900">{startIndex + 1}</span>
                <span className="hidden sm:inline"> to </span>
                <span className="inline sm:hidden">-</span>
                <span className="font-bold text-zinc-900">{Math.min(startIndex + itemsPerPage, myRegistrations.length)}</span>
                <span className="hidden sm:inline"> of </span>
                <span className="inline sm:hidden"> / </span>
                <span className="font-bold text-zinc-900">{myRegistrations.length}</span>
                <span className="hidden sm:inline"> results</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1 px-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors ${
                        currentPage === i + 1
                          ? 'bg-amber-500 text-white border border-amber-600'
                          : 'text-zinc-600 hover:bg-zinc-50 border border-transparent hover:border-zinc-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
