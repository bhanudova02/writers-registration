import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { FaFilePdf, FaSearch, FaEye, FaPrint, FaDownload } from "react-icons/fa";
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { jsPDF } from "jspdf";
import { TableSkeleton } from "../../components/Skeletons";
import { CustomSelect } from "../../components/custom/CustomSelect";

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

const getComputedStatus = (member) => {
    let status = member.status || "Active";
    let daysRemaining = Infinity;
    const expDate = calculateExpiryDate(member);

    if (member.memberType === "Associate Member" && expDate) {
        const now = new Date();
        const diffTime = expDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (status === "Deceased") {
        return "Deceased";
    } else if (status === "Disabled" || (daysRemaining !== Infinity && daysRemaining <= -1095)) {
        return "Disabled";
    } else if (status === "Inactive" || (daysRemaining !== Infinity && daysRemaining <= 0)) {
        return "Inactive";
    } else if (member.memberType === "Life Time Member" || member.memberType === "Life Member" || member.memberType === "Life Time") {
        return "Life Member";
    } else {
        return "Active";
    }
};

const getDueYearsDisplay = (member) => {
    if (member.status === "Deceased") {
        return "Deceased";
    }
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

const getExpiryDetails = (member) => {
    if (member.status === "Deceased") {
        return { text: "Deceased", isExpired: true, isLifeTime: false, daysRemaining: null };
    }
    if (member.memberType === "Life Time Member" || member.memberType === "Life Member" || member.memberType === "Life Time") {
        return { text: "Life Member", isExpired: false, isLifeTime: true, daysRemaining: Infinity };
    }
    const expDate = calculateExpiryDate(member);
    if (!expDate) return { text: "-", isExpired: false, isLifeTime: false, daysRemaining: null };
    
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining <= 0;
    return { text: expDate.toLocaleDateString("en-GB"), isExpired, isLifeTime: false, daysRemaining };
};

const renderMembershipHistory = (member) => {
    const history = [];
    if (member.upgradeToLifeHistory && Array.isArray(member.upgradeToLifeHistory)) {
        member.upgradeToLifeHistory.forEach(d => {
            history.push({ label: "Asso to LM", date: d });
        });
    }
    if (member.downgradeToAssociateHistory && Array.isArray(member.downgradeToAssociateHistory)) {
        member.downgradeToAssociateHistory.forEach(d => {
            history.push({ label: "LM to Asso", date: d });
        });
    }
    if (member.renewalHistory && Array.isArray(member.renewalHistory)) {
        member.renewalHistory.forEach(d => {
            history.push({ label: "Renewed", date: d });
        });
    }
    
    if (history.length === 0) return "-";
    
    // Sort by date chronologically
    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return (
        <ul className="list-disc list-inside text-left gap-1 flex flex-col min-w-[130px] py-1">
            {history.map((item, idx) => {
                const dateObj = new Date(item.date);
                const displayDate = isNaN(dateObj.getTime()) ? String(item.date) : dateObj.toLocaleDateString("en-GB");
                return (
                    <li key={idx} className="text-[12px] font-bold text-zinc-700 whitespace-nowrap">
                        {item.label}: <span className="font-semibold text-zinc-500">{displayDate}</span>
                    </li>
                );
            })}
        </ul>
    );
};

const savedMemberPageSizeOptions = [5, 10, 25, 50, 100];

const filterOptions = [
    { value: "All", label: "All Members" },
    { value: "Associate Member", label: "Associate" },
    { value: "Life Time Member", label: "Life Time" },
    { value: "Asso to LM", label: "Asso to LM" },
    { value: "No Due", label: "No Due" },
    { value: "Dues Pending", label: "Dues Pending" }
];

export default function ReportsPage() {
    const [savedMembers, setSavedMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFilter, setSelectedFilter] = useState("All");
    const [isLoadingSavedMembers, setIsLoadingSavedMembers] = useState(false);
    const [savedMembersPage, setSavedMembersPage] = useState(1);
    const [savedMembersPageSize, setSavedMembersPageSize] = useState(10);

    useEffect(() => {
        setIsLoadingSavedMembers(true);
        const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => {
                const docData = doc.data();
                return { 
                    _id: doc.id, 
                    ...docData, 
                    status: getComputedStatus(docData) 
                };
            });
            console.log("MEMBERS FETCHED FROM FIRESTORE:", data.map(m => ({ id: m.membershipId, memberType: m.memberType, dateOfJoining: m.dateOfJoining, lastRenewalDate: m.lastRenewalDate, createdAt: m.createdAt })));
            setSavedMembers(data);
            setIsLoadingSavedMembers(false);
        }, (error) => {
            console.error("Error fetching members:", error);
            setIsLoadingSavedMembers(false);
            toast.error("Failed to load members.");
        });
        return () => unsub();
    }, []);

    const filteredSavedMembers = useMemo(() => {
        let list = savedMembers;
        
        if (selectedFilter !== "All") {
            list = list.filter(member => {
                if (selectedFilter === "Associate Member") {
                    return member.memberType === "Associate Member" || member.memberType === "Associate";
                }
                if (selectedFilter === "Life Time Member") {
                    return member.memberType === "Life Time Member" || member.memberType === "Life Member" || member.memberType === "Life Time";
                }
                if (selectedFilter === "Asso to LM") {
                    const isLife = member.memberType === "Life Time Member" || member.memberType === "Life Member" || member.memberType === "Life Time";
                    const hasUpgradeHistory = member.upgradeToLifeHistory && Array.isArray(member.upgradeToLifeHistory) && member.upgradeToLifeHistory.length > 0;
                    return isLife && hasUpgradeHistory;
                }
                
                // Dues status filtering
                const isLife = member.memberType === "Life Time Member" || member.memberType === "Life Member" || member.memberType === "Life Time";
                if (isLife) {
                    return selectedFilter === "No Due";
                }
                const expDate = calculateExpiryDate(member);
                if (!expDate) return selectedFilter === "No Due"; // Assume no due if no expiry
                
                const now = new Date();
                const diffTime = expDate.getTime() - now.getTime();
                const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (selectedFilter === "No Due") {
                    return daysRemaining > 0;
                } else if (selectedFilter === "Dues Pending") {
                    return daysRemaining <= 0;
                }
                return true;
            });
        }
        
        if (!searchQuery) return list;
        const lowerQuery = searchQuery.toLowerCase();
        return list.filter((member) =>
            (member.name && member.name.toLowerCase().includes(lowerQuery)) ||
            (member.mobileNumber && member.mobileNumber.toLowerCase().includes(lowerQuery)) ||
            (member.membershipId && member.membershipId.toLowerCase().includes(lowerQuery)) ||
            (member.memberType && member.memberType.toLowerCase().includes(lowerQuery))
        );
    }, [savedMembers, searchQuery, selectedFilter]);

    const savedMembersTotalPages = Math.max(1, Math.ceil(filteredSavedMembers.length / savedMembersPageSize));
    const savedMembersStartIndex = (savedMembersPage - 1) * savedMembersPageSize;
    const paginatedSavedMembers = filteredSavedMembers.slice(savedMembersStartIndex, savedMembersStartIndex + savedMembersPageSize);
    const savedMembersFrom = filteredSavedMembers.length === 0 ? 0 : savedMembersStartIndex + 1;
    const savedMembersTo = Math.min(savedMembersStartIndex + savedMembersPageSize, filteredSavedMembers.length);

    const generateMemberPDF = async (member) => {
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
        
        let joiningDateDisplay = member.dateOfJoining;
        if (joiningDateDisplay && joiningDateDisplay.includes('-')) {
            const parts = joiningDateDisplay.split('-');
            if (parts.length === 3 && parts[0].length === 4) {
                joiningDateDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }
        drawField("Date of Joining", joiningDateDisplay);
        
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
        
        const expiry = getExpiryDetails(member);
        if (expiry.text !== "-") {
            let expiryVal = expiry.text;
            if (!expiry.isLifeTime && expiry.daysRemaining !== null) {
                const suffix = expiry.daysRemaining > 0 
                    ? ` (${expiry.daysRemaining} days left)` 
                    : ` (${Math.abs(expiry.daysRemaining)} days overdue)`;
                expiryVal += suffix;
            }
            drawField("Expiry Date", expiryVal);
        }

        return doc;
    };

    const handleDownload = async (member) => {
        try {
            const doc = await generateMemberPDF(member);
            doc.save(`Member_Details_${member.membershipId}.pdf`);
            toast.success("Member PDF downloaded successfully!");
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Failed to download PDF.");
        }
    };

    const handleView = async (member) => {
        try {
            const doc = await generateMemberPDF(member);
            const blobUrl = doc.output('bloburl');
            window.open(blobUrl, '_blank');
        } catch (error) {
            console.error("Error viewing PDF:", error);
            toast.error("Failed to view PDF.");
        }
    };

    const handlePrint = async (member) => {
        try {
            const doc = await generateMemberPDF(member);
            const blobUrl = doc.output('bloburl');
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = blobUrl;
            document.body.appendChild(iframe);
            iframe.onload = () => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            };
        } catch (error) {
            console.error("Error printing PDF:", error);
            toast.error("Failed to print PDF.");
        }
    };

    return (
        <div className="p-3 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <FaFilePdf className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                <h1 className="text-base sm:text-xl font-bold text-gray-800">Members Reports</h1>
            </div>

            <div className="w-full mt-3">
                <div className="border border-zinc-200 bg-white px-3 md:px-6 pt-5 pb-6 rounded-md shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold">Generate Member Reports</h3>
                            <p className="text-sm text-zinc-500 mt-1">Download, View or Print member details.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 w-full sm:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaSearch className="text-zinc-400 text-sm" />
                                </div>
                                <input
                                    type="text"
                                    className="w-full h-[38px] pl-10 pr-3 py-2 border border-zinc-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 bg-zinc-50 text-zinc-800 placeholder-zinc-400"
                                    placeholder="Search by ID, Name or Mobile..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="w-full sm:w-48">
                                <CustomSelect
                                    label={null}
                                    dropdownData={filterOptions}
                                    value={selectedFilter}
                                    onChange={(val) => {
                                        setSelectedFilter(val);
                                        setSavedMembersPage(1);
                                    }}
                                    buttonClassName="h-[38px]"
                                />
                            </div>
                        </div>
                    </div>

                    {isLoadingSavedMembers ? (
                        <TableSkeleton rowCount={5} colCount={8} />
                    ) : savedMembers.length === 0 ? (
                        <div className="py-16 text-center text-sm font-bold text-zinc-500 border border-dashed border-gray-200 rounded">
                            No members found in the database.
                        </div>
                    ) : (
                        <div>
                            <div className="overflow-x-auto only-scroll-width">
                                <table className="w-full min-w-[700px] border-collapse border border-zinc-200">
                                    <thead>
                                        <tr className="bg-zinc-100 border-b border-zinc-200">
                                            {["S No", "Membership ID", "Name", "Member Type", "Date of Joining", "Change History", "Dues", "Expiry Date", "Mobile", "Actions"].map((head) => (
                                                <th key={head} className="border border-zinc-200 py-3 px-3 text-left text-xs font-bold text-zinc-600 uppercase whitespace-nowrap">
                                                    {head}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedSavedMembers.map((member, index) => (
                                            <tr key={member._id} className="hover:bg-zinc-50 transition-colors align-top">
                                                <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-bold text-zinc-600 text-center bg-zinc-50/30 w-12">
                                                    {savedMembersStartIndex + index + 1}
                                                </td>
                                                <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-bold text-blue-700 whitespace-nowrap w-32">
                                                    {member.membershipId}
                                                </td>
                                                <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-bold text-zinc-800 capitalize min-w-[150px]">
                                                    {member.name}
                                                </td>
                                                <td className="border border-zinc-200 py-2.5 px-3 text-[12px] font-semibold text-zinc-700 w-36">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${(member.memberType === 'Life Time Member' || member.memberType === 'Life Member' || member.memberType === 'Life Time') ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {(member.memberType === 'Life Time Member' || member.memberType === 'Life Member' || member.memberType === 'Life Time') ? 'Life Time' : 'Associate'}
                                                    </span>
                                                </td>
                                                <td className="border border-zinc-200 py-2.5 px-3 text-[11px] font-semibold text-zinc-500 whitespace-nowrap">
                                                    {member.dateOfJoining 
                                                        ? new Date(member.dateOfJoining).toLocaleDateString("en-GB") 
                                                        : (member.createdAt ? new Date(member.createdAt).toLocaleString("en-GB", { dateStyle: "short" }) : "-")}
                                                </td>
                                                <td className="border border-zinc-200 py-2.5 px-3 text-left whitespace-nowrap">
                                                    {renderMembershipHistory(member)}
                                                </td>
                                                <td className="border border-zinc-200 py-2.5 px-3 text-[12px] font-semibold text-zinc-700 w-36 whitespace-nowrap">
                                                    {(() => {
                                                        const due = getDueYearsDisplay(member);
                                                        const badgeClass = due === 'Deceased'
                                                            ? 'bg-zinc-800 text-zinc-100 animate-pulse'
                                                            : due === 'Life Member'
                                                                ? 'bg-purple-100 text-purple-700'
                                                                : due === 'No Due'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-red-100 text-red-700';
                                                        return (
                                                            <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider whitespace-nowrap ${badgeClass}`}>
                                                                {due}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="border border-zinc-200 py-2.5 px-3 text-[12px] font-bold text-zinc-700 whitespace-nowrap w-36">
                                                    {(() => {
                                                        const expiry = getExpiryDetails(member);
                                                        if (expiry.text === "-") return "-";
                                                        const badgeClass = expiry.text === 'Deceased'
                                                            ? 'bg-zinc-800 text-zinc-100 animate-pulse'
                                                            : expiry.isLifeTime 
                                                                ? 'bg-purple-100 text-purple-700'
                                                                : expiry.isExpired 
                                                                    ? 'bg-red-100 text-red-700' 
                                                                    : 'bg-green-100 text-green-700';
                                                        return (
                                                            <div className="flex flex-col gap-0.5 items-start">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider whitespace-nowrap ${badgeClass}`}>
                                                                    {expiry.text}
                                                                </span>
                                                                {!expiry.isLifeTime && expiry.daysRemaining !== null && (
                                                                    <span className="text-[10px] font-semibold text-zinc-500 lowercase">
                                                                        {expiry.daysRemaining > 0 
                                                                            ? `${expiry.daysRemaining} days left` 
                                                                            : `${Math.abs(expiry.daysRemaining)} days overdue`}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-semibold text-zinc-700 whitespace-nowrap w-28">
                                                    {member.mobileNumber}
                                                </td>
                                                <td className="border border-zinc-200 py-2.5 px-3 w-48 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDownload(member)}
                                                            className="inline-flex items-center gap-1 rounded bg-[#ebfbf3] hover:bg-[#d4f7e5] text-emerald-700 px-2 py-1.5 text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
                                                            title="Download PDF"
                                                        >
                                                            <FaDownload className="text-[10px]" />
                                                            <span>Download</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleView(member)}
                                                            className="inline-flex items-center gap-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1.5 text-xs font-semibold border border-blue-200 transition-colors cursor-pointer"
                                                            title="View PDF"
                                                        >
                                                            <FaEye className="text-[10px]" />
                                                            <span>View</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePrint(member)}
                                                            className="inline-flex items-center gap-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-600 px-2 py-1.5 text-xs font-semibold border border-amber-200 transition-colors cursor-pointer"
                                                            title="Print PDF"
                                                        >
                                                            <FaPrint className="text-[10px]" />
                                                            <span>Print</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm md:flex md:items-center md:justify-between md:gap-3">
                                <div className="flex items-center justify-between gap-2 md:flex-1">
                                    <p className="font-semibold text-zinc-600">
                                        <span className="hidden xl:inline">Showing </span>{savedMembersFrom}-{savedMembersTo} Of {filteredSavedMembers.length}
                                    </p>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <label className="text-xs font-bold uppercase text-zinc-500" htmlFor="saved-members-page-size">
                                                Rows
                                            </label>
                                            <CustomSelect
                                                dropdownData={savedMemberPageSizeOptions.map(size => ({ value: size, label: size }))}
                                                value={savedMembersPageSize}
                                                onChange={(value) => {
                                                    setSavedMembersPageSize(Number(value));
                                                    setSavedMembersPage(1);
                                                }}
                                                buttonClassName="h-8 py-0 min-w-16 bg-white !text-xs"
                                                label={null}
                                            />
                                        </div>
                                        <span className="rounded-sm bg-white px-2 py-1.5 text-xs font-bold text-zinc-700 border border-zinc-200 sm:text-sm">
                                            Page {savedMembersPage} of {savedMembersTotalPages}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-col gap-3 md:mt-0 md:flex-row md:items-center md:justify-end">
                                    <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
                                        <button
                                            type="button"
                                            onClick={() => setSavedMembersPage((page) => Math.max(1, page - 1))}
                                            disabled={savedMembersPage === 1}
                                            className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSavedMembersPage((page) => Math.min(savedMembersTotalPages, page + 1))}
                                            disabled={savedMembersPage === savedMembersTotalPages}
                                            className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
