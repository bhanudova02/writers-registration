import { useState, useEffect } from "react";
import { FaSms, FaEnvelope, FaHistory, FaCheckCircle, FaTimesCircle, FaPaperPlane, FaWallet } from "react-icons/fa";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../firebase";
import { TableSkeleton } from "../../components/Skeletons";
import SendMemberMessageModal from "../../components/members/SendMemberMessageModal";
import { toast } from "react-toastify";

export default function CommunicationLogsPage() {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [balances, setBalances] = useState({ sms: "Loading...", email: "Loading..." });
    
    // Members Table State
    const [members, setMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);

    // Modal State
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [messageMember, setMessageMember] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "communication_logs"), orderBy("date", "desc"), limit(100));
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
            }).catch(err => {
                console.error("Failed to load balances:", err);
                setBalances({ sms: "Error", email: "Error" });
            });
        } catch(e) {
            console.error("Functions init error:", e);
        }

        const qMembers = query(collection(db, "members"), orderBy("createdAt", "desc"));
        const unsubscribeMembers = onSnapshot(qMembers, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            setMembers(list);
        });

        return () => {
            unsubscribeLogs();
            unsubscribeMembers();
        };
    }, []);

    const smsCount = logs.filter(log => log.type === "SMS").length;
    const emailCount = logs.filter(log => log.type === "Email").length;
    const successCount = logs.filter(log => log.status === "Success").length;

    const filteredMembers = members.filter(m => 
        (m.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (m.membershipId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.mobileNumber || "").includes(searchQuery)
    );
    const paginatedMembers = filteredMembers.slice((page-1)*5, page*5);
    const totalPages = Math.max(1, Math.ceil(filteredMembers.length / 5));

    return (
        <div className="p-3 sm:p-6 relative">
            <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <FaHistory className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                    <h1 className="text-base sm:text-xl font-bold text-gray-800">Communication Center</h1>
                </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-white p-3 sm:p-4 rounded-md shadow-sm border border-zinc-200 flex flex-col justify-center lg:col-span-1">
                    <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Msgs</h3>
                    <p className="text-xl sm:text-2xl font-bold text-zinc-800 mt-1">{logs.length}</p>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-md shadow-sm border border-zinc-200 flex flex-col justify-center lg:col-span-1">
                    <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">SMS Sent</h3>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{smsCount}</p>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-md shadow-sm border border-zinc-200 flex flex-col justify-center lg:col-span-1">
                    <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Emails Sent</h3>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600 mt-1">{emailCount}</p>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-md shadow-sm border border-zinc-200 flex flex-col justify-center lg:col-span-1">
                    <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Success Rate</h3>
                    <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{logs.length > 0 ? Math.round((successCount/logs.length)*100) : 0}%</p>
                </div>
                {/* Balance Cards */}
                <div className="bg-blue-50 p-3 sm:p-4 rounded-md shadow-sm border border-blue-200 flex items-center justify-between lg:col-span-1">
                    <div>
                        <h3 className="text-blue-600 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Fast2SMS Wallet</h3>
                        <p className="text-lg sm:text-xl font-bold text-blue-800 mt-1">{balances.sms}</p>
                    </div>
                    <FaWallet className="text-blue-300 text-lg sm:text-2xl" />
                </div>
                <div className="bg-orange-50 p-3 sm:p-4 rounded-md shadow-sm border border-orange-200 flex items-center justify-between lg:col-span-1">
                    <div>
                        <h3 className="text-orange-600 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Resend Limit</h3>
                        <p className="text-lg sm:text-xl font-bold text-orange-800 mt-1">{balances.email}</p>
                    </div>
                    <FaEnvelope className="text-orange-300 text-lg sm:text-2xl" />
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
                    <input 
                        type="text"
                        placeholder="Search by ID, Name or Mobile..."
                        className="px-3 py-1.5 border border-zinc-300 rounded text-sm min-w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse border border-zinc-200">
                        <thead>
                            <tr className="bg-zinc-100 border-b border-zinc-200">
                                {["Member ID", "Name", "Mobile", "Email", "Action"].map((head) => (
                                    <th key={head} className="border border-zinc-200 py-2.5 px-3 text-left text-xs font-bold text-zinc-600 uppercase whitespace-nowrap">
                                        {head}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedMembers.map((member) => (
                                <tr key={member.id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-bold text-blue-700 w-32">
                                        {member.membershipId}
                                    </td>
                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-bold text-zinc-800 capitalize">
                                        {member.name}
                                    </td>
                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-semibold text-zinc-700 w-32">
                                        {member.mobileNumber || "-"}
                                    </td>
                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-medium text-zinc-600">
                                        {member.email || "-"}
                                    </td>
                                    <td className="border border-zinc-200 py-2.5 px-3 w-28 text-center">
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
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-3 px-1">
                        <span className="text-xs font-bold text-zinc-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p-1))}
                                disabled={page === 1}
                                className="px-3 py-1 rounded border border-zinc-300 text-xs font-bold disabled:opacity-50"
                            >Prev</button>
                            <button 
                                onClick={() => setPage(p => Math.min(totalPages, p+1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 rounded border border-zinc-300 text-xs font-bold disabled:opacity-50"
                            >Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Logs Table */}
            <div className="border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm">
                <h3 className="text-base font-bold text-zinc-800 mb-2 flex items-center gap-2">
                    <FaHistory className="text-zinc-500 text-sm -mt-0.5" />
                    <span>Recent Communication Logs</span>
                </h3>
                <p className="text-xs text-zinc-500 mb-4">View recent SMS and Email messages sent to members.</p>

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
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="border border-zinc-200 py-3 px-3 text-[12px] font-medium text-zinc-500 whitespace-nowrap">
                                            {log.date?.toDate ? log.date.toDate().toLocaleString() : 'Just now'}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-800">
                                            {log.memberId}
                                            {log.isCustom && <span className="ml-2 text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">Custom</span>}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 w-fit ${
                                                log.type === 'SMS' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                                {log.type === 'SMS' ? <FaSms /> : <FaEnvelope />} {log.type}
                                            </span>
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 w-fit ${
                                                log.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {log.status === 'Success' ? <FaCheckCircle /> : <FaTimesCircle />} {log.status}
                                            </span>
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[12px] text-zinc-600">
                                            {log.status === 'Success' ? (
                                                <div className="line-clamp-2" title={log.messageSent}>{log.messageSent}</div>
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
            </div>

            {/* Custom Message Modal */}
            <SendMemberMessageModal 
                isOpen={isMessageModalOpen}
                onClose={() => {
                    setIsMessageModalOpen(false);
                    setMessageMember(null);
                }}
                member={messageMember}
            />
        </div>
    );
}
