export default function DashboardHeader({ onLogout }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-zinc-200/80 bg-zinc-50/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-11 w-11 rounded bg-white/95 p-1 shadow-sm ring-1 ring-amber-500/20 flex items-center justify-center">
            <img src="/Logo.png" alt="TCWA logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-black text-zinc-900 tracking-wider uppercase">TCWA Writer Registry</h1>
            <p className="text-[10px] text-zinc-500 font-semibold tracking-wider">Member Self-Service Dashboard</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="rounded border border-zinc-200 bg-white/60 hover:bg-zinc-100 text-zinc-700 px-3 py-1.5 text-xs font-bold tracking-wide transition active:scale-[0.98] cursor-pointer"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
