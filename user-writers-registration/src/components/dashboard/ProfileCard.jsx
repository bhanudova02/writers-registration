import { User } from 'lucide-react';
import { jsPDF } from 'jspdf';
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
  const handlePrint = async () => {
    if (!member) {
      toast.error("Member details not available.");
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Draw border
      doc.setDrawColor(0, 0, 150);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277);
      
      try {
        const logoImg = new Image();
        logoImg.src = '/Logo.png';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
        });
        doc.addImage(logoImg, 'PNG', 15, 11, 20, 30);
      } catch (e) {
        console.warn("Logo could not be loaded for PDF");
      }

      // Header Text
      doc.setTextColor(0, 0, 150);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("TELUGU CINE WRITERS' ASSOCIATION", 105, 20, { align: "center" });

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("(Regd. No. A741, Registered under Trade Union Act, 1926, Affiliated to T.S.F.I.E.F.)", 105, 25, { align: "center" });

      // Horizontal line
      doc.setDrawColor(0, 0, 150);
      doc.line(10, 42, 200, 42);

      // Title
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("MEMBER DETAILS", 105, 52, { align: "center" });
      const titleWidth = doc.getTextWidth("MEMBER DETAILS");
      doc.line(105 - (titleWidth / 2), 53, 105 + (titleWidth / 2), 53);

      let yPos = 65;

      const drawField = (label, value) => {
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 150);
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 20, yPos);

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        
        const isValEmpty = !value || String(value).trim() === "" || String(value).toUpperCase() === "N/A";
        const textVal = isValEmpty ? "" : String(value);
        const splitText = doc.splitTextToSize(textVal, 110);
        doc.text(splitText, 70, yPos);
        
        yPos += (splitText.length * 5) + 5;
      };

      drawField("Membership ID", member.membershipId);
      drawField("Member Type", member.memberType);
      drawField("Dues Status", getDueYearsDisplay(member));
      drawField("Full Name", `${member.name || ''} ${member.surname || ''}`.trim());
      drawField("Date of Birth", member.dateOfBirth);
      drawField("Blood Group", member.bloodGroup);
      drawField("Qualification", member.qualification);
      drawField("Mobile Number", member.mobileNumber);
      if (member.alternateMobileNumber) drawField("Alt Mobile", member.alternateMobileNumber);
      drawField("Email Address", member.email);
      drawField("Aadhar Number", member.aadharNo);
      drawField("PAN Card", member.panCardNo);
      drawField("Permanent Address", member.permanentAddress);
      drawField("Temporary Address", member.temporaryAddress);
      
      drawField("Nominee Name", member.nomineeName);
      drawField("Nominee Relation", member.nomineeRelation);

      drawField("Status", member.status);
      if (expiryDetails && expiryDetails.expiryDateStr) {
        drawField("Valid Till", expiryDetails.expiryDateStr);
      }

      doc.save(`Member_Details_${member.membershipId}.pdf`);
      toast.success("Member details downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF.");
    }
  };

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
