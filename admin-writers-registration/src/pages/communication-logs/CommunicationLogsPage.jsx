import { useState, useEffect, useCallback } from "react";
import { FaSms, FaEnvelope, FaHistory, FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaPaperPlane, FaWallet, FaSearch, FaSyncAlt } from "react-icons/fa";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../firebase";
import { TableSkeleton } from "../../components/Skeletons";
import SendMemberMessageModal from "../../components/members/SendMemberMessageModal";
import { CustomSelect } from "../../components/custom/CustomSelect";
import { toast } from "react-toastify";

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

    if (status === "Disabled" || (daysRemaining !== Infinity && daysRemaining <= -1095)) {
        return "Disabled";
    } else if (status === "Inactive" || (daysRemaining !== Infinity && daysRemaining <= 0)) {
        return "Inactive";
    } else if (member.memberType === "Life Time Member" || member.memberType === "Life Member" || member.memberType === "Life Time") {
        return "Life Member";
    } else {
        return "Active";
    }
};

export default function CommunicationLogsPage() {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [balances, setBalances] = useState({ sms: null, email: null });
    const [isBalanceLoading, setIsBalanceLoading] = useState(true);
    
    // Members Table State
    const [members, setMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [pageSizeOptions, setPageSizeOptions] = useState([5, 10, 25, 50]); // Fixed state declaration mismatch if any

    // Logs Table Pagination State
    const [logsPage, setLogsPage] = useState(1);
    const [logsPageSize, setLogsPageSize] = useState(5);
    const [logsSearchQuery, setLogsSearchQuery] = useState("");

    // Modal State
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [messageMember, setMessageMember] = useState(null);

    const fetchBalances = useCallback(() => {
        setIsBalanceLoading(true);
        try {
            const functions = getFunctions();
            const getBalances = httpsCallable(functions, "getCommunicationBalances");
            getBalances().then(result => {
                if (result.data) {
                    setBalances({
                        sms: `₹ ${result.data.smsWalletBalance}`,
                        email: result.data.emailBalance
                    });
                }
                setIsBalanceLoading(false);
            }).catch(err => {
                console.error("Failed to load balances:", err);
                setBalances({ sms: "Error", email: "Error" });
                setIsBalanceLoading(false);
            });
        } catch(e) {
            console.error("Functions init error:", e);
            setIsBalanceLoading(false);
        }
    }, []);

    useEffect(() => {
        const q = query(collection(db, "communication_logs"), orderBy("date", "desc"));
        const unsubscribeLogs = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            setLogs(list);
            setIsLoading(false);
            setErrorMsg(null);
        }, (error) => {
            console.error("Error fetching communication logs:", error);
            setErrorMsg(error.message);
            setIsLoading(false);
        });

        // Fetch balances
        fetchBalances();

        const qMembers = query(collection(db, "members"), orderBy("createdAt", "desc"));
        const unsubscribeMembers = onSnapshot(qMembers, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const memberId = docSnap.id;
                
                let daysRemaining = Infinity;
                const expDate = calculateExpiryDate(data);

                if (data.memberType === "Associate Member" && expDate) {
                    const now = new Date();
                    const diffTime = expDate.getTime() - now.getTime();
                    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }

                const status = getComputedStatus(data);

                list.push({ 
                    id: memberId, 
                    ...data, 
                    daysRemaining, 
                    status 
                });
            });
            setMembers(list);
        });

        return () => {
            unsubscribeLogs();
            unsubscribeMembers();
        };
    }, []);

    const smsCount = logs.filter(log => log.type === "SMS" || log.type === "Both").length;
    const emailCount = logs.filter(log => log.type === "Email" || log.type === "Both").length;
    const successCount = logs.filter(log => log.status === "Success").length;

    const filteredMembers = members.filter(m => 
        (m.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (m.membershipId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.mobileNumber || "").includes(searchQuery)
    );
    const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
    const startIndex = (page - 1) * pageSize;

    // Logs pagination
    const filteredLogs = logs.filter(log =>
        (log.memberId || "").toLowerCase().includes(logsSearchQuery.toLowerCase()) ||
        (log.type || "").toLowerCase().includes(logsSearchQuery.toLowerCase()) ||
        (log.status || "").toLowerCase().includes(logsSearchQuery.toLowerCase()) ||
        (log.recipient || "").toLowerCase().includes(logsSearchQuery.toLowerCase()) ||
        (log.messageSent || "").toLowerCase().includes(logsSearchQuery.toLowerCase())
    );
    const logsTotalPages = Math.max(1, Math.ceil(filteredLogs.length / logsPageSize));
    const logsStartIndex = (logsPage - 1) * logsPageSize;
    const paginatedLogs = filteredLogs.slice(logsStartIndex, logsStartIndex + logsPageSize);
    const logsShowingFrom = filteredLogs.length === 0 ? 0 : logsStartIndex + 1;
    const logsShowingTo = Math.min(logsStartIndex + logsPageSize, filteredLogs.length);
    const paginatedMembers = filteredMembers.slice(startIndex, startIndex + pageSize);
    const showingFrom = filteredMembers.length === 0 ? 0 : startIndex + 1;
    const showingTo = Math.min(startIndex + pageSize, filteredMembers.length);

    return (
        <div className="p-3 sm:p-6 relative">
            <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <FaHistory className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                    <h1 className="text-base sm:text-xl font-bold text-gray-800">Communication Center</h1>
                </div>
            </div>

            {/* Metrics cards */}
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                {/* Balance Cards */}
                <div className="flex flex-row flex-1 gap-3 sm:gap-4">
                    {/* Fast2SMS Wallet */}
                    <div className="flex-1 bg-blue-50 p-2 sm:p-4 rounded-md shadow-sm border border-blue-200 flex flex-row items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-blue-600 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider">Fast2SMS Wallet</h3>
                                <button
                                    type="button"
                                    onClick={fetchBalances}
                                    disabled={isBalanceLoading}
                                    title="Refresh balance"
                                    className="text-blue-400 hover:text-blue-600 disabled:opacity-40 transition-colors cursor-pointer"
                                >
                                    <FaSyncAlt className={`text-[10px] ${isBalanceLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            {isBalanceLoading ? (
                                <div className="mt-2 h-5 w-24 bg-blue-200 rounded animate-pulse" />
                            ) : (
                                <p className="text-sm sm:text-xl font-bold text-blue-800 mt-1">{balances.sms}</p>
                            )}
                        </div>
                        <FaWallet className="text-blue-300 text-base sm:text-2xl mt-0.5" />
                    </div>
                    {/* Resend Limit */}
                    <div className="flex-1 bg-orange-50 p-2 sm:p-4 rounded-md shadow-sm border border-orange-200 flex flex-row items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-orange-600 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider">Resend Limit</h3>
                            {isBalanceLoading ? (
                                <div className="mt-2 h-5 w-20 bg-orange-200 rounded animate-pulse" />
                            ) : (
                                <p className="text-sm sm:text-xl font-bold text-orange-800 mt-1">{balances.email}</p>
                            )}
                        </div>
                        <FaEnvelope className="text-orange-300 text-base sm:text-2xl mt-0.5" />
                    </div>
                </div>
                
                {/* Stats Cards */}
                <div className="flex flex-row gap-2 sm:gap-4 w-full lg:w-auto">
                    <div className="flex-1 lg:flex-none lg:w-32 bg-white p-2 sm:p-4 rounded-md shadow-sm border border-zinc-200 flex flex-col justify-center text-center">
                        <h3 className="text-zinc-500 text-[9px] sm:text-xs font-bold uppercase tracking-wider">SMS Sent</h3>
                        <p className="text-base sm:text-2xl font-bold text-blue-600 mt-1">{smsCount}</p>
                    </div>
                    <div className="flex-1 lg:flex-none lg:w-32 bg-white p-2 sm:p-4 rounded-md shadow-sm border border-zinc-200 flex flex-col justify-center text-center">
                        <h3 className="text-zinc-500 text-[9px] sm:text-xs font-bold uppercase tracking-wider">Emails Sent</h3>
                        <p className="text-base sm:text-2xl font-bold text-orange-600 mt-1">{emailCount}</p>
                    </div>
                    <div className="flex-1 lg:flex-none lg:w-32 bg-white p-2 sm:p-4 rounded-md shadow-sm border border-zinc-200 flex flex-col justify-center text-center">
                        <h3 className="text-zinc-500 text-[9px] sm:text-xs font-bold uppercase tracking-wider">Success Rate</h3>
                        <p className="text-base sm:text-2xl font-bold text-green-600 mt-1">{logs.length > 0 ? Math.round((successCount/logs.length)*100) : 0}%</p>
                    </div>
                </div>
            </div>

            {/* Quick Messaging Members Table */}
            <div className="border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                    <div>
                        <h3 className="text-base font-bold text-zinc-800 flex items-center gap-2">
                            <FaPaperPlane className="text-blue-500 text-sm -mt-0.5" />
                            <span>Quick Messaging</span>
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Select a member to instantly send SMS or Email.</p>
                    </div>
                    <div className="relative flex-1 md:w-64 max-w-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="text-zinc-400 text-sm" />
                        </div>
                        <input
                            type="text"
                            className="w-full pl-10 pr-3 py-2 border border-zinc-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 bg-zinc-50 text-zinc-800 placeholder-zinc-400"
                            placeholder="Search by ID, Name or Mobile..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse border border-zinc-200">
                        <thead>
                            <tr className="bg-zinc-100 border-b border-zinc-200">
                                {["Member ID", "Name", "Mobile", "Email", "Status / Days", "Action"].map((head) => (
                                    <th key={head} className="border border-zinc-200 py-2.5 px-3 text-left text-xs font-bold text-zinc-600 uppercase whitespace-nowrap">
                                        {head}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedMembers.map((member) => (
                                <tr key={member.id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-bold text-blue-700 whitespace-nowrap w-32">
                                        {member.membershipId}
                                    </td>
                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-bold text-zinc-800 capitalize whitespace-nowrap">
                                        {member.name}
                                    </td>
                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-semibold text-zinc-700 whitespace-nowrap w-32">
                                        {member.mobileNumber || "-"}
                                    </td>
                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-medium text-zinc-600 whitespace-nowrap">
                                        {member.email || "-"}
                                    </td>
                                    <td className="border border-zinc-200 py-2.5 px-3 whitespace-nowrap min-w-[120px]">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${member.status === 'Active' || member.status === 'Life Member' ? 'bg-green-100 text-green-700' : member.status === 'Inactive' || member.status === 'Grace Period' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                {member.status}
                                            </span>
                                            {member.memberType === "Associate Member" && member.daysRemaining !== Infinity && (
                                                <span className={`text-[12px] font-semibold ${member.daysRemaining < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                                                    {member.daysRemaining > 0 ? `${member.daysRemaining} days left` : `${Math.abs(member.daysRemaining)} days overdue`}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="border border-zinc-200 py-2.5 px-3 whitespace-nowrap w-28 text-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMessageMember(member);
                                                setIsMessageModalOpen(true);
                                            }}
                                            className="inline-flex items-center gap-1 rounded bg-orange-50 hover:bg-orange-100 text-orange-600 px-3 py-1.5 text-xs font-semibold border border-orange-200 transition-colors cursor-pointer"
                                        >
                                            <FaPaperPlane className="text-[10px]" />
                                            <span>Send Message</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {paginatedMembers.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="border border-zinc-200 py-6 text-center text-xs text-zinc-500 font-bold">
                                        No members found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm md:flex md:items-center md:justify-between md:gap-3">
                    <div className="flex items-center justify-between gap-2 md:flex-1">
                        <p className="font-semibold text-zinc-600">
                            Showing {showingFrom}-{showingTo} Of {filteredMembers.length}
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
                                        setPage(1);
                                    }}
                                    buttonClassName="h-8 py-0 min-w-16 bg-white !text-xs"
                                    label={null}
                                />
                            </div>
                            <span className="rounded-sm bg-white px-2 py-1.5 text-xs font-bold text-zinc-700 border border-zinc-200 sm:text-sm">
                                Page {page} of {totalPages}
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-3 md:mt-0 md:flex-row md:items-center md:justify-end">
                        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                    <div>
                        <h3 className="text-base font-bold text-zinc-800 flex items-center gap-2">
                            <FaHistory className="text-zinc-500 text-sm -mt-0.5" />
                            <span>Recent Communication Logs</span>
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">View recent SMS and Email messages sent to members.</p>
                    </div>
                    <div className="relative flex-1 md:w-64 max-w-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="text-zinc-400 text-sm" />
                        </div>
                        <input
                            type="text"
                            className="w-full pl-10 pr-3 py-2 border border-zinc-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 bg-zinc-50 text-zinc-800 placeholder-zinc-400"
                            placeholder="Search by ID, Type, Status..."
                            value={logsSearchQuery}
                            onChange={(e) => {
                                setLogsSearchQuery(e.target.value);
                                setLogsPage(1);
                            }}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <TableSkeleton rowCount={5} colCount={5} />
                ) : errorMsg ? (
                    <div className="py-8 px-4 text-center text-red-500 text-xs font-bold border border-red-200 bg-red-50 rounded">
                        Error loading logs: {errorMsg}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-8 text-center text-zinc-400 text-xs font-bold border border-dashed border-zinc-200 rounded">
                        No recent communication logs found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse border border-zinc-200">
                            <thead>
                                <tr className="bg-zinc-100 border-b border-zinc-200">
                                    {["Date", "Member ID", "Type", "Status", "Message/Error"].map((head) => (
                                        <th key={head} className="border border-zinc-200 py-3 px-3 text-left text-xs font-bold text-zinc-600 uppercase whitespace-nowrap">
                                            {head}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="border border-zinc-200 py-3 px-3 text-[12px] font-medium text-zinc-500 whitespace-nowrap">
                                            {log.date?.toDate ? log.date.toDate().toLocaleString() : 'Just now'}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-800 whitespace-nowrap">
                                            {log.memberId}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                {/* Badges inline */}
                                                <div className="flex flex-row items-center gap-1">
                                                    {(log.type === 'SMS' || log.type === 'Both') && (
                                                        <span className="px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 w-fit bg-blue-100 text-blue-700">
                                                            <FaSms /> SMS
                                                        </span>
                                                    )}
                                                    {(log.type === 'Email' || log.type === 'Both') && (
                                                        <span className="px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 w-fit bg-orange-100 text-orange-700">
                                                            <FaEnvelope /> Email
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Recipients */}
                                                {log.type === 'Both' ? (
                                                    <span className="text-[11px] text-zinc-500 font-medium whitespace-nowrap">
                                                        {log.smsRecipient || ""} · {log.emailRecipient || ""}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-zinc-500 font-medium whitespace-nowrap">
                                                        {log.recipient || ""}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 w-fit ${
                                                log.status === 'Success' ? 'bg-green-100 text-green-700'
                                                : log.status === 'Partial' ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-red-100 text-red-700'
                                            }`}>
                                                {log.status === 'Success' ? <FaCheckCircle />
                                                : log.status === 'Partial' ? <FaExclamationCircle />
                                                : <FaTimesCircle />} {log.status}
                                            </span>
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[12px] text-zinc-600">
                                            {log.status === 'Success' ? (
                                                <div className="line-clamp-2" title={log.messageSent}>{log.messageSent}</div>
                                            ) : log.status === 'Partial' ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="line-clamp-2 text-zinc-700" title={log.messageSent}>{log.messageSent}</div>
                                                    {log.smsStatus === 'Failed' && (
                                                        <span className="text-red-600 font-semibold text-[11px]">❌ SMS Failed{log.smsError ? `: ${log.smsError}` : ''}</span>
                                                    )}
                                                    {log.emailStatus === 'Failed' && (
                                                        <span className="text-red-600 font-semibold text-[11px]">❌ Email Failed{log.emailError ? `: ${log.emailError}` : ''}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-red-600 font-medium" title={log.error}>{log.error || "Unknown Error"}</div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* Logs Pagination */}
                {filteredLogs.length > 0 && (
                    <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm md:flex md:items-center md:justify-between md:gap-3">
                        <div className="flex items-center justify-between gap-2 md:flex-1">
                            <p className="font-semibold text-zinc-600">
                                Showing {logsShowingFrom}-{logsShowingTo} Of {filteredLogs.length}{logsSearchQuery && ` (filtered from ${logs.length})`}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <label className="text-xs font-bold uppercase text-zinc-500" htmlFor="logs-page-size">
                                        Rows
                                    </label>
                                    <CustomSelect
                                        dropdownData={pageSizeOptions.map(size => ({ value: size, label: size }))}
                                        value={logsPageSize}
                                        onChange={(val) => {
                                            setLogsPageSize(Number(val));
                                            setLogsPage(1);
                                        }}
                                        buttonClassName="h-8 py-0 min-w-16 bg-white !text-xs"
                                        label={null}
                                    />
                                </div>
                                <span className="rounded-sm bg-white px-2 py-1.5 text-xs font-bold text-zinc-700 border border-zinc-200 sm:text-sm">
                                    Page {logsPage} of {logsTotalPages}
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-col gap-3 md:mt-0 md:flex-row md:items-center md:justify-end">
                            <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
                                <button
                                    type="button"
                                    onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                                    disabled={logsPage === 1}
                                    className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLogsPage((p) => Math.min(logsTotalPages, p + 1))}
                                    disabled={logsPage === logsTotalPages}
                                    className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Message Modal */}
            <SendMemberMessageModal 
                isOpen={isMessageModalOpen}
                onClose={() => {
                    setIsMessageModalOpen(false);
                    setMessageMember(null);
                }}
                onSuccess={() => {
                    fetchBalances();
                    setLogsPage(1);
                    setLogsSearchQuery("");
                }}
                member={messageMember}
            />
        </div>
    );
}
