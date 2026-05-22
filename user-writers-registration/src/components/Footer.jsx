import { Lock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-medium">
          <Lock size={12} />
          <span>© {new Date().getFullYear()} Telugu Cine Writers Association. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4 text-zinc-500 text-[11px] font-medium">
          <a href="#" className="hover:text-zinc-900 transition-colors">Privacy Policy</a>
          <span className="text-zinc-300">|</span>
          <a href="#" className="hover:text-zinc-900 transition-colors">Terms of Use</a>
          <span className="text-zinc-300">|</span>
          <a href="#" className="hover:text-zinc-900 transition-colors">Contact Us</a>
        </div>
      </div>
    </footer>
  );
}
