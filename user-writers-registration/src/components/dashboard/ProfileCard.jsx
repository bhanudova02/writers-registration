import { User } from 'lucide-react';
import { toast } from 'react-toastify';

const calculateExpiryDate = (member) => {
  if (!member) return null;
  if (member.memberType === "Life Time Member" || member.memberType === "Life Member" || member.memberType === "Life Time") {
    return null;
  }
  if (member.validityExpiresAt) {
    let expDate = typeof member.validityExpiresAt.toDate === 'function' 
      ? member.validityExpiresAt.toDate() 
      : new Date(member.validityExpiresAt);
    if (!isNaN(expDate.getTime())) {
      return expDate;
    }
  }
  let joiningDateStr = member.dateOfJoining || member.createdAt;
  if (!joiningDateStr) return null;
  
  let joiningDate = typeof joiningDateStr.toDate === 'function' ? joiningDateStr.toDate() : new Date(joiningDateStr);
  if (isNaN(joiningDate.getTime())) return null;
  
  let refDateStr = member.lastRenewalDate || member.dateOfJoining || member.createdAt;
  let refDate = typeof refDateStr.toDate === 'function' ? refDateStr.toDate() : new Date(refDateStr);
  if (isNaN(refDate.getTime())) return null;
  
  let expiryDate = new Date(joiningDate);
  expiryDate.setFullYear(refDate.getFullYear());
  
  if (expiryDate <= refDate) {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  }
  return expiryDate;
};

const getDueYearsDisplay = (member) => {
  if (member.memberType === "Life Time Member" || member.memberType === "Life Member" || member.memberType === "Life Time") {
    return "Life Member";
  }
  const expDate = calculateExpiryDate(member);
  if (!expDate) return "-";
  
  const now = new Date();
  const diffTime = expDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (daysRemaining > 0) {
    return "No Due";
  } else {
    const daysOverdue = Math.abs(daysRemaining);
    if (daysOverdue < 365) {
      return `${daysOverdue} Days Overdue`;
    } else {
      const yearsOverdue = Math.ceil(daysOverdue / 365);
      return `${yearsOverdue} Year${yearsOverdue > 1 ? 's' : ''} Due (${daysOverdue} Days)`;
    }
  }
};

export default function ProfileCard({ member, expiryDetails }) {
  return (
    <section className="bg-white border border-slate-200 p-5 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-600 shrink-0">
          <User size={22} />
        </div>
        <div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Log in Writer</p>
          <h2 className="text-base font-extrabold text-zinc-900 capitalize">{member?.name}</h2>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-6">
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
          <p className={`text-sm font-bold mt-1 ${expiryDetails?.isExpired ? 'text-red-500' : 'text-green-500'}`}>
            {expiryDetails?.expiryDateStr}
          </p>
        </div>
      </div>
    </section>
  );
}
