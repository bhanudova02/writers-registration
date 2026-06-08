import { useState, useEffect } from "react";
import { FaSms, FaEnvelope, FaHistory, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { TableSkeleton } from "../../components/Skeletons";

export default function CommunicationLogsPage() {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

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
        return () => unsubscribeLogs();
    }, []);

    const smsCount = logs.filter(log => log.type === "SMS").length;
    const emailCount = logs.filter(log => log.type === "Email").length;
    const successCount = logs.filter(log => log.status === "Success").length;

    return (
        <div className="p-3 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <FaHistory className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                <h1 className="text-base sm:text-xl font-bold text-gray-800">Communication Logs</h1>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Messages</h3>
                        <p className="text-xl sm:text-2xl font-bold text-zinc-800 mt-1">{logs.length}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-zinc-50 rounded border border-zinc-100">
                        <FaHistory className="text-zinc-500 text-base sm:text-lg" />
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">SMS Sent</h3>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{smsCount}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-blue-50 rounded border border-blue-100">
                        <FaSms className="text-blue-500 text-base sm:text-lg" />
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Emails Sent</h3>
                        <p className="text-xl sm:text-2xl font-bold text-orange-600 mt-1">{emailCount}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-orange-50 rounded border border-orange-100">
                        <FaEnvelope className="text-orange-500 text-base sm:text-lg" />
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Success Rate</h3>
                        <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{logs.length > 0 ? Math.round((successCount/logs.length)*100) : 0}%</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-50 rounded border border-green-100">
                        <FaCheckCircle className="text-green-500 text-base sm:text-lg" />
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm">
                <h3 className="text-base font-bold text-zinc-800 mb-2 flex items-center gap-2">
                    <FaHistory className="text-zinc-500 text-sm -mt-0.5" />
                    <span>Recent Automated Communications</span>
                </h3>
                <p className="text-xs text-zinc-500 mb-4">View recent SMS and Email reminders sent to members for renewal penalties.</p>

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
        </div>
    );
}
