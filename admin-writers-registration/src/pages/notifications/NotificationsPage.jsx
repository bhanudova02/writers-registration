import { useState, useEffect } from "react";
import { FaBell, FaUserShield, FaSignInAlt, FaSignOutAlt, FaHistory } from "react-icons/fa";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { TableSkeleton } from "../../components/Skeletons";
import { CustomSelect } from "../../components/custom/CustomSelect";

export default function NotificationsPage() {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const pageSizeOptions = [5, 10, 25, 50, 100];

    useEffect(() => {
        const q = query(collection(db, "admin_logs"), orderBy("timestamp", "desc"), limit(100));
        const unsubscribeLogs = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            setLogs(list);
            setIsLoading(false);
            setErrorMsg(null);
        }, (error) => {
            console.error("Error fetching admin logs:", error);
            setErrorMsg(error.message);
            setIsLoading(false);
        });
        return () => {
            unsubscribeLogs();
        };
    }, []);

    const loginCount = logs.filter(log => log.action === "Login").length;
    const logoutCount = logs.filter(log => log.action === "Logout").length;
    const otherCount = logs.length - loginCount - logoutCount;

    const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedLogs = logs.slice(startIndex, startIndex + pageSize);
    const fromIndex = logs.length === 0 ? 0 : startIndex + 1;
    const toIndex = Math.min(startIndex + pageSize, logs.length);

    return (
        <div className="p-3 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <FaBell className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                <h1 className="text-base sm:text-xl font-bold text-gray-800">Admin Activity Log</h1>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Activity</h3>
                        <p className="text-xl sm:text-2xl font-bold text-zinc-800 mt-1">{logs.length}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-zinc-50 rounded border border-zinc-100">
                        <FaHistory className="text-zinc-500 text-base sm:text-lg" />
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Logins</h3>
                        <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{loginCount}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-50 rounded border border-green-100">
                        <FaSignInAlt className="text-green-500 text-base sm:text-lg" />
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Logouts</h3>
                        <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{logoutCount}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-red-50 rounded border border-red-100">
                        <FaSignOutAlt className="text-red-500 text-base sm:text-lg" />
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Other Actions</h3>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{otherCount}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-blue-50 rounded border border-blue-100">
                        <FaUserShield className="text-blue-500 text-base sm:text-lg" />
                    </div>
                </div>
            </div>


            {/* Activity Log Table */}
            <div className="border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm">
                <h3 className="text-base font-bold text-zinc-800 mb-2 flex items-center gap-2">
                    <FaHistory className="text-zinc-500 text-sm -mt-0.5" />
                    <span>Recent Admin Activities</span>
                </h3>
                <p className="text-xs text-zinc-500 mb-4">Monitor all administrative actions including logins, logouts, and data modifications.</p>

                {isLoading ? (
                    <TableSkeleton rowCount={5} colCount={4} />
                ) : errorMsg ? (
                    <div className="py-8 px-4 text-center text-red-500 text-xs font-bold border border-red-200 bg-red-50 rounded">
                        Error loading logs: {errorMsg}
                        <div className="text-[10px] text-red-400 mt-2">Please check Firebase Rules for 'admin_logs' collection or Index requirements.</div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-8 text-center text-zinc-400 text-xs font-bold border border-dashed border-zinc-200 rounded">
                        No recent admin activity found.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                        <table className="w-full min-w-[750px] border-collapse border border-zinc-200">
                            <thead>
                                <tr className="bg-zinc-100 border-b border-zinc-200">
                                    {["Time", "Admin User", "Action", "Details"].map((head) => (
                                        <th key={head} className="border border-zinc-200 py-3 px-3 text-left text-xs font-bold text-zinc-600 uppercase whitespace-nowrap">
                                            {head}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="border border-zinc-200 py-3 px-3 text-[12px] font-medium text-zinc-500 w-40 whitespace-nowrap">
                                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Just now'}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-800 w-48">
                                            {log.adminEmail}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 w-40 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${
                                                log.action === 'Login' ? 'bg-green-100 text-green-700' :
                                                log.action === 'Logout' ? 'bg-red-100 text-red-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-medium text-zinc-600">
                                            {log.details}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm md:flex md:items-center md:justify-between md:gap-3">
                        <div className="flex items-center justify-between gap-2 md:flex-1">
                            <p className="font-semibold text-zinc-600">
                                Showing {fromIndex}-{toIndex} Of {logs.length}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <label className="text-xs font-bold uppercase text-zinc-500" htmlFor="logs-page-size">
                                        Rows
                                    </label>
                                    <CustomSelect
                                        dropdownData={pageSizeOptions.map(size => ({ value: size, label: size }))}
                                        value={pageSize}
                                        onChange={(value) => {
                                            setPageSize(Number(value));
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
                                    className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 cursor-pointer"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 cursor-pointer"
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
    );
}
