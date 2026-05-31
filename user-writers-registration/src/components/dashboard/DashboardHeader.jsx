import { LogOut } from 'lucide-react';

import { Link } from 'react-router-dom';

export default function DashboardHeader({ onLogout }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b-2 border-slate-200 bg-slate-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <Link to="/" className="flex items-center gap-3 cursor-pointer">
          <img src="/Logo.png" alt="TCWA Logo" className="h-10 w-10 object-contain" />
          <div className="leading-tight">
            <div className="text-[14px] md:text-sm font-bold text-zinc-900">Telugu Cine Writers</div>
            <div className="text-[11px] font-semibold text-zinc-500">Association</div>
          </div>
        </Link>
        <button
          onClick={onLogout}
          className="rounded border border-zinc-200 bg-white/60 hover:bg-zinc-100 text-zinc-700 px-4 py-2 text-xs font-bold tracking-wide transition active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
        >
          <LogOut size={14} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
