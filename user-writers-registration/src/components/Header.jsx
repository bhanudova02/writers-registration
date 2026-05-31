import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="border-b-2 border-gray-100 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 cursor-pointer">
          <img src="/Logo.png" alt="TCWA Logo" className="h-10 w-10 object-contain" />
          <div className="leading-tight">
            <div className="text-[14px] md:text-sm font-bold text-zinc-900">Telugu Cine Writers</div>
            <div className="text-[11px] font-semibold text-zinc-500">Association</div>
          </div>
        </Link>
        <div className="flex items-center gap-1 border border-zinc-100 px-2 py-1.5 rounded-lg">
          <ShieldAlert className="text-amber-600 text-sm" /> <span className='text-sm'>100% Secure</span>
        </div>
      </div>
    </header>
  );
}
