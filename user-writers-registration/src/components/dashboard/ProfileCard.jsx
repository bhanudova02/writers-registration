import { User } from 'lucide-react';

export default function ProfileCard({ member, expiryDetails }) {
  return (
    <section className="bg-white border border-slate-200 p-5 rounded-lg grid gap-4 md:grid-cols-4 items-center">
      <div className="md:col-span-1 border-r border-slate-200 md:pr-4 flex items-center gap-3.5">
        <div className="h-12 w-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-600">
          <User size={22} />
        </div>
        <div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Log in Writer</p>
          <h2 className="text-base font-extrabold text-zinc-900 capitalize">{member?.name}</h2>
        </div>
      </div>
      <div className="grid grid-cols-3 md:col-span-3 gap-4 pl-0 md:pl-4">
        <div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Membership ID</p>
          <p className="text-sm font-black text-amber-600 mt-1">{member?.membershipId}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Member Type</p>
          <p className="text-sm font-bold mt-1">{member?.memberType}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Valid Till</p>
          <p className={`text-sm font-bold mt-1 ${expiryDetails.isExpired ? 'text-red-500' : 'text-green-500'}`}>
            {expiryDetails.expiryDateStr}
          </p>
        </div>
      </div>
    </section>
  );
}
