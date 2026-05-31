import { useState, useEffect } from "react";
import { FaSyncAlt, FaSearch, FaUserGraduate } from "react-icons/fa";
import { FiAlertTriangle, FiCheck, FiClock, FiLayers } from "react-icons/fi";
import { collection, onSnapshot, doc, updateDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import CustomButton from "../../components/custom/CustomButton";
import { CustomSelect } from "../../components/custom/CustomSelect";
import { logAdminActivity } from '../../lib/logger';
import ViewMemberModal from "../../components/members/ViewMemberModal";
import Modal from "../../components/common/Modal";
import { toast } from "react-toastify";
import { TableSkeleton } from "../../components/Skeletons";

export default function RenewalsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [members, setMembers] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [upgradeModalData, setUpgradeModalData] = useState({ isOpen: false, memberId: '', name: '', targetType: '' });
    const [renewModalData, setRenewModalData] = useState({ isOpen: false, memberId: '', name: '', years: 1 });
    const [viewModalData, setViewModalData] = useState({ isOpen: false, member: null });
    const [warningModalData, setWarningModalData] = useState({ isOpen: false, message: '' });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const pageSizeOptions = [5, 10, 25, 50, 100];

    const statusFilterOptions = [
        { value: "All", label: "All Statuses" },
        { value: "Active", label: "Active" },
        { value: "Overdue", label: "Overdue" },
        { value: "Inactive", label: "Inactive" },
        { value: "Associate Member", label: "Associate" },
        { value: "Life Time Member", label: "Life Time" },
    ];

    // Fetch members real-time
    useEffect(() => {
        const membersRef = collection(db, "members");
        const unsubscribe = onSnapshot(membersRef, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const memberId = docSnap.id;
                
                let expiryDate = "Permanent";
                let daysRemaining = Infinity;
                let status = data.status || "Active";
                let amountDue = "-";

                if (status === "Inactive") {
                    status = "Inactive";
                    // Still calculate expiry date for display
                    if (data.memberType === "Associate Member") {
                        const createdDate = data.createdAt ? new Date(data.createdAt) : new Date();
                        const expDate = new Date(createdDate);
                        expDate.setFullYear(expDate.getFullYear() + 1);
                        expiryDate = expDate.toLocaleDateString();
                        const now = new Date();
                        daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    } else if (data.memberType === "Life Time Member") {
                        expiryDate = "No Expiry";
                    }
                } else if (data.memberType === "Associate Member") {
                    // Expiry is 1 year from createdAt
                    const createdDate = data.createdAt ? new Date(data.createdAt) : new Date();
                    const expDate = new Date(createdDate);
                    expDate.setFullYear(expDate.getFullYear() + 1);
                    expiryDate = expDate.toLocaleDateString();

                    const now = new Date();
                    const diffTime = expDate.getTime() - now.getTime();
                    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (daysRemaining <= 0) {
                        // 5 Years rule (approx 1825 days)
                        if (daysRemaining < -1825) {
                            status = "Inactive";
                            amountDue = "Expired";
                        } else if (daysRemaining < -30) {
                            status = "Overdue";
                            amountDue = "₹1,200";
                        } else {
                            status = "Grace Period";
                            amountDue = "₹1,200";
                        }
                    } else {
                        status = "Active";
                    }
                } else if (data.memberType === "Life Time Member") {
                    status = "Life Member";
                    expiryDate = "No Expiry";
                }

                list.push({
                    id: memberId,
                    ...data,
                    expiryDate,
                    daysRemaining,
                    amountDue,
                    status,
                    memberType: data.memberType
                });
            });
            setMembers(list);
            setIsLoading(false);
        }, (error) => {
            console.error(error);
            toast.error("Failed to load members from database.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Listen to real-time transactions/renewals log
    useEffect(() => {
        const transRef = collection(db, "renewal_transactions");
        const unsubscribe = onSnapshot(transRef, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            // Sort by payment date desc
            list.sort((a, b) => new Date(b.date) - new Date(a.date));
            setRecentTransactions(list);
        });
        return () => unsubscribe();
    }, []);

    const filteredRenewals = members.filter(renew => {
        const matchesSearch = renew.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              renew.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === "All" || renew.status === selectedStatus || renew.memberType === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.max(1, Math.ceil(filteredRenewals.length / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedRenewals = filteredRenewals.slice(startIndex, startIndex + pageSize);
    const showingFrom = filteredRenewals.length === 0 ? 0 : startIndex + 1;
    const showingTo = Math.min(startIndex + pageSize, filteredRenewals.length);

    // Reset page on search or filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedStatus]);

    // Dynamic metrics
    const totalAssociates = members.filter(m => m.memberType === "Associate Member").length;
    const overdueCount = members.filter(m => m.status === "Overdue").length;
    const activeCount = members.filter(m => m.status === "Active" && m.memberType === "Associate Member").length;

    // Record Offline Renewal
    const triggerRenewModal = (memberId, name) => {
        setRenewModalData({ isOpen: true, memberId, name, years: 1 });
    };

    const confirmRecordAndRenew = async () => {
        const { memberId, name, years } = renewModalData;
        setRenewModalData({ isOpen: false, memberId: '', name: '', years: 1 });

        try {
            const memberToRenew = members.find(m => m.id === memberId);
            const now = new Date();
            let newCreatedAtDate = now;

            if (memberToRenew && memberToRenew.createdAt) {
                const currentCreatedDate = new Date(memberToRenew.createdAt);
                const currentExpiryDate = new Date(currentCreatedDate);
                currentExpiryDate.setFullYear(currentExpiryDate.getFullYear() + 1);

                // If not expired yet, start the new term from the current expiry date
                if (currentExpiryDate > now) {
                    newCreatedAtDate = new Date(currentExpiryDate);
                    newCreatedAtDate.setFullYear(newCreatedAtDate.getFullYear() + (years - 1));
                } else {
                    newCreatedAtDate.setFullYear(newCreatedAtDate.getFullYear() + (years - 1));
                }
            } else {
                newCreatedAtDate.setFullYear(newCreatedAtDate.getFullYear() + (years - 1));
            }

            const nowStr = now.toISOString();
            const newCreatedAtStr = newCreatedAtDate.toISOString();
            
            const memberRef = doc(db, "members", memberId);
            
            await updateDoc(memberRef, {
                createdAt: newCreatedAtStr,
                status: "Active"
            });

            // Write transaction log
            const transRef = doc(collection(db, "renewal_transactions"));
            await setDoc(transRef, {
                memberId,
                name,
                amount: 1200,
                type: "Annual Renewal",
                date: nowStr
            });

            toast.success(`Membership for ${name} renewed successfully!`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to process renewal.");
        }
    };

    // Toggle Status
    const handleToggleStatus = async (memberId, currentStatus, memberName) => {
        try {
            const newStatus = currentStatus === "Inactive" ? "Active" : "Inactive";
            
            // Check expiry date if we are trying to make them Active
            if (newStatus === "Active") {
                const memberToToggle = members.find(m => m.id === memberId);
                if (memberToToggle && memberToToggle.memberType === "Associate Member" && memberToToggle.daysRemaining <= 0) {
                    setWarningModalData({
                        isOpen: true,
                        message: `Cannot activate ${memberName}. Their membership has expired. Please process a renewal first.`
                    });
                    return;
                }
            }

            const memberRef = doc(db, 'members', memberId);
            await updateDoc(memberRef, { status: newStatus });
            
            await logAdminActivity(
                auth.currentUser?.email || 'admin@tcwa.in',
                "Changed Member Status",
                `Changed status of ${memberName} (ID: ${memberId}) to ${newStatus}`
            );
            toast.success(`Member status updated to ${newStatus}!`);
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status.");
        }
    };

    // Upgrade to Life Time Member or switch to Associate
    const triggerUpgradeModal = (memberId, name, targetType) => {
        setUpgradeModalData({ isOpen: true, memberId, name, targetType });
    };

    const confirmTypeChange = async () => {
        const { memberId, name, targetType } = upgradeModalData;
        setUpgradeModalData({ isOpen: false, memberId: '', name: '', targetType: '' });

        try {
            const memberRef = doc(db, "members", memberId);
            await updateDoc(memberRef, {
                memberType: targetType,
                status: "Active",
                createdAt: new Date().toISOString() // Reset timer for Associate
            });

            // Log the upgrade transaction
            const transRef = doc(collection(db, "renewal_transactions"));
            await setDoc(transRef, {
                memberId,
                name,
                amount: 0,
                type: `Changed to ${targetType}`,
                date: new Date().toISOString()
            });

            toast.success(`${name} changed to ${targetType} successfully!`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update membership type.");
        }
    };

    return (
        <div className="p-3 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <FaSyncAlt className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                <h1 className="text-base sm:text-xl font-bold text-gray-800">Membership Renewals</h1>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Associate Members</h3>
                        <p className="text-xl sm:text-2xl font-bold text-zinc-800 mt-1">{totalAssociates}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-zinc-50 rounded border border-zinc-100">
                        <FaSyncAlt className="text-zinc-500 text-base sm:text-lg" />
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Overdue Renewals</h3>
                        <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{overdueCount}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-red-50 rounded border border-red-100">
                        <FiAlertTriangle className="text-red-500 text-base sm:text-lg" />
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Active Associates</h3>
                        <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-50 rounded border border-green-100">
                        <FiCheck className="text-green-500 text-base sm:text-lg" />
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <div className="border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm">
                    <div className="mb-5 space-y-4">
                        <div>
                            <h3 className="text-lg font-bold text-zinc-800">Renewals Directory</h3>
                            <p className="text-sm text-zinc-500 mt-1">Record offline payments, extend Associate accounts, or upgrade members.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                            <div className="relative flex-1 w-full">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaSearch className="text-zinc-400 text-sm" />
                                </div>
                                <input
                                    type="text"
                                    className="w-full h-[38px] pl-10 pr-3 py-2 border border-zinc-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 bg-zinc-50 text-zinc-800 placeholder-zinc-400"
                                    placeholder="Search ID, Name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="w-full sm:w-48">
                                <CustomSelect
                                    label={null}
                                    dropdownData={statusFilterOptions}
                                    value={selectedStatus}
                                    onChange={(val) => setSelectedStatus(val)}
                                    buttonClassName="h-[38px]"
                                />
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <TableSkeleton rowCount={5} colCount={9} />
                    ) : filteredRenewals.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-zinc-200 rounded flex flex-col items-center justify-center">
                            <FiLayers className="text-zinc-300 text-4xl mb-3" />
                            <p className="text-sm font-bold text-zinc-500">No members matching criteria.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[700px] border-collapse border border-zinc-200">
                                    <thead>
                                        <tr className="bg-zinc-100 border-b border-zinc-200">
                                            {["Member ID", "Name", "Type", "Expires On", "Amount Due", "Status", "View", "Renew", "Actions"].map((head) => (
                                                <th key={head} className="border border-zinc-200 py-3 px-3 text-left text-xs font-bold text-zinc-600 uppercase whitespace-nowrap">
                                                    {head}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedRenewals.map((renew) => (
                                            <tr key={renew.id} className="hover:bg-zinc-50 transition-colors">
                                                <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-blue-700 whitespace-nowrap">
                                                    {renew.id}
                                                </td>
                                                <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-800 whitespace-nowrap">
                                                    {renew.name}
                                                </td>
                                                <td className="border border-zinc-200 py-3 px-3 text-[11px] font-bold whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded ${renew.memberType === 'Life Time Member' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {renew.memberType === 'Life Time Member' ? 'Life Time' : 'Associate'}
                                                    </span>
                                                </td>
                                                <td className="border border-zinc-200 py-3 px-3 text-[12px] font-medium text-zinc-500 whitespace-nowrap">
                                                    {renew.expiryDate}
                                                </td>
                                                <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-800 whitespace-nowrap">
                                                    {renew.amountDue}
                                                </td>
                                                <td className="border border-zinc-200 py-3 px-3 w-28 text-center whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${renew.status === 'Active' || renew.status === 'Life Member' ? 'bg-green-100 text-green-700' : renew.status === 'Grace Period' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                        {renew.status}
                                                    </span>
                                                </td>
                                                <td className="border border-zinc-200 py-3 px-3 w-28 whitespace-nowrap text-center">
                                                    <CustomButton
                                                        label="View"
                                                        bgColor="bg-zinc-800 hover:bg-zinc-900"
                                                        textColor="text-white"
                                                        className="py-1 px-3 text-[11px] font-bold tracking-wide whitespace-nowrap inline-flex rounded-sm"
                                                        onClick={() => setViewModalData({ isOpen: true, member: renew })}
                                                    />
                                                </td>
                                                <td className="border border-zinc-200 py-3 px-3 w-28 whitespace-nowrap text-center">
                                                    {renew.memberType === "Associate Member" ? (
                                                        <CustomButton
                                                            label="Renew"
                                                            bgColor="bg-zinc-800 hover:bg-zinc-900"
                                                            textColor="text-white"
                                                            className="py-1 px-3 text-[11px] font-bold tracking-wide whitespace-nowrap inline-flex rounded-sm"
                                                            onClick={() => triggerRenewModal(renew.id, renew.name)}
                                                        />
                                                    ) : (
                                                        <span className="text-zinc-400 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="border border-zinc-200 py-3 px-3 w-40 whitespace-nowrap text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <CustomButton
                                                            label={renew.status === "Inactive" ? "Make Active" : "Make Inactive"}
                                                            bgColor={renew.status === "Inactive" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                                                            textColor="text-white"
                                                            className="py-1 px-3 text-[11px] font-bold tracking-wide whitespace-nowrap rounded-sm"
                                                            onClick={() => handleToggleStatus(renew.id, renew.status, renew.name)}
                                                        />
                                                        {renew.memberType === "Associate Member" ? (
                                                            <CustomButton
                                                                label="Upgrade to Life"
                                                                bgColor="bg-zinc-900 hover:bg-black"
                                                                textColor="text-white"
                                                                className="py-1 px-3 text-[11px] font-bold tracking-wide whitespace-nowrap rounded-sm"
                                                                icon={FaUserGraduate}
                                                                onClick={() => triggerUpgradeModal(renew.id, renew.name, "Life Time Member")}
                                                            />
                                                        ) : (
                                                            <CustomButton
                                                                label="Make Associate"
                                                                bgColor="bg-zinc-700 hover:bg-zinc-800"
                                                                textColor="text-white"
                                                                className="py-1 px-3 text-[11px] font-bold tracking-wide whitespace-nowrap border border-zinc-600 rounded-sm"
                                                                onClick={() => triggerUpgradeModal(renew.id, renew.name, "Associate Member")}
                                                            />
                                                        )}
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
                                        Showing {showingFrom}-{showingTo} Of {filteredRenewals.length}
                                    </p>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <label className="text-xs font-bold uppercase text-zinc-500" htmlFor="page-size">
                                                Rows
                                            </label>
                                            <CustomSelect
                                                dropdownData={pageSizeOptions.map(size => ({ value: size, label: size }))}
                                                value={pageSize}
                                                onChange={(val) => {
                                                    setPageSize(Number(val));
                                                    setCurrentPage(1);
                                                }}
                                                buttonClassName="h-8 py-0 min-w-16 bg-white !text-xs"
                                                label={null}
                                            />
                                        </div>
                                        <span className="rounded-sm bg-white px-2 py-1.5 text-xs font-bold text-zinc-700 border border-zinc-200 sm:text-sm">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-col gap-3 md:mt-0 md:flex-row md:items-center md:justify-end">
                                    <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                            disabled={currentPage === 1}
                                            className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                            disabled={currentPage === totalPages}
                                            className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Renew Modal */}
            {(() => {
                const modalMember = members.find(m => m.id === renewModalData.memberId);
                let willExtendFrom = "today";
                if (modalMember && modalMember.createdAt) {
                    const currentCreatedDate = new Date(modalMember.createdAt);
                    const currentExpiryDate = new Date(currentCreatedDate);
                    currentExpiryDate.setFullYear(currentExpiryDate.getFullYear() + 1);
                    if (currentExpiryDate > new Date()) {
                        willExtendFrom = "their current expiry date";
                    }
                }
                
                return (
                    <Modal
                        isOpen={renewModalData.isOpen}
                        onClose={() => setRenewModalData({ isOpen: false, memberId: '', name: '' })}
                        title="Confirm Offline Renewal"
                        widthClass="max-w-md"
                    >
                        <div className="text-zinc-700 text-sm">
                            <p className="mb-4">
                                Please confirm that you have received an offline renewal payment for <strong>{renewModalData.name}</strong> (ID: {renewModalData.memberId}).
                            </p>
                            
                            <div className="mb-5 border border-zinc-200 rounded p-4 bg-zinc-50 flex flex-col gap-2">
                                <label className="text-xs font-bold text-zinc-600 uppercase">Select Renewal Period</label>
                                <select 
                                    className="p-2 border border-zinc-300 rounded text-sm bg-white font-medium text-zinc-800 outline-none focus:border-zinc-500"
                                    value={renewModalData.years}
                                    onChange={(e) => setRenewModalData(prev => ({ ...prev, years: parseInt(e.target.value) }))}
                                >
                                    {[1, 2, 3, 4, 5].map(y => (
                                        <option key={y} value={y}>{y} {y === 1 ? 'Year' : 'Years'}</option>
                                    ))}
                                </select>
                            </div>

                            <p className="mb-6 text-xs text-zinc-500 italic">
                                This action will extend the membership by exactly {renewModalData.years} {renewModalData.years === 1 ? 'year' : 'years'} from {willExtendFrom} and record a transaction in the database.
                            </p>
                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                                <CustomButton
                                    label="Cancel"
                                    onClick={() => setRenewModalData({ isOpen: false, memberId: '', name: '', years: 1 })}
                                    bgColor="bg-zinc-100 hover:bg-zinc-200"
                                    textColor="text-zinc-700"
                                    className="border border-zinc-300"
                                />
                                <CustomButton
                                    label="Update"
                                    onClick={confirmRecordAndRenew}
                                    bgColor="bg-green-600 hover:bg-green-700"
                                    textColor="text-white"
                                />
                            </div>
                        </div>
                    </Modal>
                );
            })()}

            {/* Upgrade to Life Time Modal */}
            <Modal
                isOpen={upgradeModalData.isOpen}
                onClose={() => setUpgradeModalData({ isOpen: false, memberId: '', name: '', targetType: '' })}
                title={`Confirm ${upgradeModalData.targetType === 'Life Time Member' ? 'Life Time Upgrade' : 'Switch to Associate'}`}
                widthClass="max-w-md"
            >
                <div className="text-zinc-700 text-sm">
                    <p className="mb-4">
                        Are you sure you want to change <strong>{upgradeModalData.name}</strong> (ID: {upgradeModalData.memberId}) to a <strong>{upgradeModalData.targetType === 'Life Time Member' ? 'Life Time Member' : 'Associate Member'}</strong>?
                    </p>
                    {upgradeModalData.targetType === 'Life Time Member' ? (
                        <p className="mb-6 text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 p-3 rounded">
                            <FiAlertTriangle className="inline text-amber-500 mr-1 -mt-0.5" />
                            Warning: This action will permanently remove all expiration tracking and grace periods for this member.
                        </p>
                    ) : (
                        <p className="mb-6 text-xs text-blue-600 font-semibold bg-blue-50 border border-blue-200 p-3 rounded">
                            <FiClock className="inline text-blue-500 mr-1 -mt-0.5" />
                            Note: This will reset the membership timer to 1 year from today.
                        </p>
                    )}
                    <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                        <CustomButton
                            label="Cancel"
                            onClick={() => setUpgradeModalData({ isOpen: false, memberId: '', name: '', targetType: '' })}
                            bgColor="bg-zinc-100 hover:bg-zinc-200"
                            textColor="text-zinc-700"
                            className="border border-zinc-300"
                        />
                        <CustomButton
                            label="Confirm Change"
                            onClick={confirmTypeChange}
                            bgColor="bg-zinc-800 hover:bg-zinc-900"
                            textColor="text-white"
                        />
                    </div>
                </div>
            </Modal>

            {/* View Member Modal */}
            <ViewMemberModal
                isOpen={viewModalData.isOpen}
                onClose={() => setViewModalData({ isOpen: false, member: null })}
                member={viewModalData.member}
            />

            {/* Warning Modal */}
            <Modal
                isOpen={warningModalData.isOpen}
                onClose={() => setWarningModalData({ isOpen: false, message: '' })}
                title="Action Denied"
                widthClass="max-w-md"
            >
                <div className="text-zinc-700 text-sm">
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded flex items-start gap-3">
                        <FiAlertTriangle className="text-red-500 text-xl shrink-0 mt-0.5" />
                        <p className="font-semibold text-red-700">{warningModalData.message}</p>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-zinc-100">
                        <CustomButton
                            label="Okay"
                            onClick={() => setWarningModalData({ isOpen: false, message: '' })}
                            bgColor="bg-zinc-800 hover:bg-zinc-900"
                            textColor="text-white"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
