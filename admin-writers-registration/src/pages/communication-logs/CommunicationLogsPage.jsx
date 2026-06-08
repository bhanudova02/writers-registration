import { useState, useEffect } from "react";
import { FaSms, FaEnvelope, FaHistory, FaCheckCircle, FaTimesCircle, FaPaperPlane, FaWallet } from "react-icons/fa";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../firebase";
import { TableSkeleton } from "../../components/Skeletons";
import { toast } from "react-toastify";

export default function CommunicationLogsPage() {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [balances, setBalances] = useState({ sms: "Loading...", email: "Loading..." });
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [formData, setFormData] = useState({
        memberId: "",
        phone: "",
        emailAddress: "",
        message: "",
        sendToSms: true,
        sendToEmail: true
    });

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

        return () => unsubscribeLogs();
    }, []);

    const smsCount = logs.filter(log => log.type === "SMS").length;
    const emailCount = logs.filter(log => log.type === "Email").length;
    const successCount = logs.filter(log => log.status === "Success").length;

    const handleSendCustomMessage = async (e) => {
        e.preventDefault();
        if (!formData.sendToSms && !formData.sendToEmail) {
            toast.error("Please select at least one method (SMS or Email).");
            return;
        }
        if (formData.sendToSms && !formData.phone) {
            toast.error("Phone number is required for SMS.");
            return;
        }
        if (formData.sendToEmail && !formData.emailAddress) {
            toast.error("Email address is required for Email.");
            return;
        }

        setIsSending(true);
        try {
            const functions = getFunctions();
            const sendMsg = httpsCallable(functions, "sendCustomMessage");
            const result = await sendMsg(formData);
            
            if (result.data.success) {
                toast.success("Message sent successfully!");
                setShowModal(false);
                setFormData({
                    memberId: "",
                    phone: "",
                    emailAddress: "",
                    message: "",
                    sendToSms: true,
                    sendToEmail: true
                });
            } else {
                toast.error("Failed to send message.");
            }
        } catch (error) {
            console.error("Send custom message error:", error);
            toast.error(error.message || "Failed to send message.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="p-3 sm:p-6 relative">
            <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <FaHistory className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                    <h1 className="text-base sm:text-xl font-bold text-gray-800">Communication Logs</h1>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold py-2 px-4 rounded-md shadow-sm transition-colors flex items-center gap-2"
                >
                    <FaPaperPlane /> Send Custom Message
                </button>
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

            {/* Logs Table */}
            <div className="border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm">
                <h3 className="text-base font-bold text-zinc-800 mb-2 flex items-center gap-2">
                    <FaHistory className="text-zinc-500 text-sm -mt-0.5" />
                    <span>Recent Communications</span>
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
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
                            <h2 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                                <FaPaperPlane className="text-blue-500" /> Send Custom Message
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-red-500 transition">
                                <FaTimesCircle size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSendCustomMessage} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-zinc-600 mb-1">Member ID (Optional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. TCWA-101"
                                        value={formData.memberId}
                                        onChange={(e) => setFormData({...formData, memberId: e.target.value})}
                                        className="w-full px-3 py-2 border border-zinc-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1 flex items-center gap-4 mt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.sendToSms}
                                            onChange={(e) => setFormData({...formData, sendToSms: e.target.checked})}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <span className="text-sm font-bold text-zinc-700 flex items-center gap-1"><FaSms className="text-blue-500"/> SMS</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.sendToEmail}
                                            onChange={(e) => setFormData({...formData, sendToEmail: e.target.checked})}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <span className="text-sm font-bold text-zinc-700 flex items-center gap-1"><FaEnvelope className="text-orange-500"/> Email</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-zinc-600 mb-1">Phone Number {formData.sendToSms && <span className="text-red-500">*</span>}</label>
                                    <input 
                                        type="tel" 
                                        placeholder="e.g. 9876543210"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="w-full px-3 py-2 border border-zinc-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        required={formData.sendToSms}
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-zinc-600 mb-1">Email Address {formData.sendToEmail && <span className="text-red-500">*</span>}</label>
                                    <input 
                                        type="email" 
                                        placeholder="e.g. member@email.com"
                                        value={formData.emailAddress}
                                        onChange={(e) => setFormData({...formData, emailAddress: e.target.value})}
                                        className="w-full px-3 py-2 border border-zinc-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        required={formData.sendToEmail}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-600 mb-1">Custom Message <span className="text-red-500">*</span></label>
                                <textarea 
                                    placeholder="Type your message here..."
                                    rows="4"
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                    className="w-full px-3 py-2 border border-zinc-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                    required
                                ></textarea>
                                <p className="text-[10px] text-zinc-500 mt-1 text-right">{formData.message.length} characters</p>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 rounded transition"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSending}
                                    className={`px-4 py-2 text-sm font-bold text-white rounded shadow-sm flex items-center gap-2 transition ${
                                        isSending ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                    {isSending ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Sending...</>
                                    ) : (
                                        <><FaPaperPlane /> Send Now</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
