import { ShieldAlert } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/Logo.png" alt="TCWA Logo" className="h-10 w-10 object-contain" />
          <div className="leading-tight">
            <div className="text-sm font-bold text-zinc-900">Telugu Cine Writers</div>
            <div className="text-[11px] font-semibold text-zinc-500">Association</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-full">
          <ShieldAlert size={14} className="text-amber-500" />
          <span className="text-[11px] font-bold text-zinc-600">100% Secure & Encrypted</span>
        </div>
      </div>
    </header>
  );
}
