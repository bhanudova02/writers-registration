import { useState, useEffect } from "react";
import { FaFileSignature, FaSearch } from "react-icons/fa";
import { FiCheckCircle, FiXCircle, FiEye, FiTrendingUp } from "react-icons/fi";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db, auth } from "../../firebase";
import CustomButton from "../../components/custom/CustomButton";
import { CustomSelect } from "../../components/custom/CustomSelect";
import { toast } from "react-toastify";
import { logAdminActivity } from "../../lib/logger";

export default function RegistrationsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [registrations, setRegistrations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewReceipt, setViewReceipt] = useState(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const pageSizeOptions = [10, 20, 50, 100];

    // Reset page to 1 on search filter
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Fetch registrations in real-time from Firestore
    useEffect(() => {
        const regsRef = collection(db, "registrations");
        const q = query(regsRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                list.push({
                    id: docSnap.id,
                    ...data
                });
            });
            setRegistrations(list);
            setIsLoading(false);
        }, (error) => {
            console.error(error);
            toast.error("Failed to load registrations from database.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Filter registrations
    const filteredRegs = registrations.filter(reg => {
        const title = reg.title || "";
        const writer = reg.writerName || "";
        const regId = reg.registrationId || "";

        const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              writer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              regId.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesSearch;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredRegs.length / pageSize) || 1;
    const paginatedRegs = filteredRegs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const fromIndex = (currentPage - 1) * pageSize + 1;
    const toIndex = Math.min(currentPage * pageSize, filteredRegs.length);

    return (
        <div className="p-3 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <FaFileSignature className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                <h1 className="text-base sm:text-xl font-bold text-gray-800">Movie Script Registrations</h1>
            </div>

            {/* Main Action Card */}
            <div className="border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-zinc-800">Script Registration Receipts</h3>
                        <p className="text-sm text-zinc-500 mt-1">Track and manage real member movie script registration receipts.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 sm:w-64 w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaSearch className="text-zinc-400 text-sm" />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-10 pr-3 py-1.5 border border-zinc-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 bg-zinc-50 text-zinc-800 placeholder-zinc-400"
                                placeholder="Search script, writer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-zinc-500 text-sm font-bold">
                        Fetching live registrations database...
                    </div>
                ) : filteredRegs.length === 0 ? (
                    <div className="py-16 text-center border border-dashed border-zinc-200 rounded flex flex-col items-center justify-center">
                        <FaFileSignature className="text-zinc-300 text-4xl mb-3" />
                        <p className="text-sm font-bold text-zinc-500">No script registrations match your filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse border border-zinc-200">
                            <thead>
                                <tr className="bg-zinc-100 border-b border-zinc-200">
                                    {["Reg ID", "Script Title", "Writer Name", "Category", "Pages Count", "Fee Paid", "Status", "Actions"].map((head) => (
                                        <th key={head} className={`border border-zinc-200 py-3 px-3 text-xs font-bold text-zinc-600 uppercase whitespace-nowrap ${head === 'Actions' || head === 'Status' ? 'text-center' : 'text-left'}`}>
                                            {head}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRegs.map((reg) => (
                                    <tr key={reg.id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-700 w-44 whitespace-nowrap">
                                            {reg.registrationId || reg.id}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-800">
                                            {reg.title}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-semibold text-zinc-700 capitalize w-56 min-w-[180px]">
                                            {reg.writerName || "N/A"} (ID: {reg.membershipId})
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[12px] font-semibold text-zinc-600">
                                            {reg.category}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[12px] font-medium text-zinc-500">
                                            {reg.pageCount} Pages
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-green-700">
                                            ₹{reg.amount}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 w-28 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${reg.status === 'Approved' ? 'bg-green-100 text-green-700' : reg.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {reg.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 w-32 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => setViewReceipt(reg)}
                                                    className="flex items-center gap-1.5 py-1 px-2.5 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 transition cursor-pointer text-[11px] font-bold"
                                                    title="View Receipt Details"
                                                >
                                                    <FiEye size={13} />
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {filteredRegs.length > 0 && (
                            <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm md:flex md:items-center md:justify-between md:gap-3">
                                <div className="flex items-center justify-between gap-2 md:flex-1">
                                    <p className="font-semibold text-zinc-600">
                                        <span className="hidden xl:inline">Showing </span>{fromIndex}-{toIndex} Of {filteredRegs.length}
                                    </p>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <label className="text-xs font-bold uppercase text-zinc-500">
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
                                            className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 hover:bg-zinc-100 transition"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                            disabled={currentPage === totalPages}
                                            className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 hover:bg-zinc-100 transition"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* View Receipt Modal */}
            {viewReceipt && (
                <div className="fixed inset-0 z-[60] bg-black/60 px-4 py-8 overflow-y-auto flex items-start justify-center">
                    <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white shadow-2xl my-auto shrink-0">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 bg-zinc-50 rounded-t-lg">
                            <h3 className="text-base font-bold text-zinc-800">Receipt Details</h3>
                            <button
                                onClick={() => setViewReceipt(null)}
                                className="text-zinc-500 hover:text-zinc-800 transition cursor-pointer"
                            >
                                <FiXCircle size={20} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3 text-sm font-medium text-zinc-700">
                            <div className="flex justify-between border-b border-zinc-100 pb-2"><span className="text-zinc-500">Name of the Member:</span> <span className="font-bold text-zinc-900 text-right">{viewReceipt.writerName}</span></div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2"><span className="text-zinc-500">Working Title:</span> <span className="font-bold text-zinc-900 text-right">{viewReceipt.title}</span></div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2"><span className="text-zinc-500">Total Pages:</span> <span className="font-bold text-zinc-900 text-right">{viewReceipt.pageCount}</span></div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2"><span className="text-zinc-500">Membership Id No.:</span> <span className="font-bold text-zinc-900 text-right">{viewReceipt.membershipId}</span></div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2"><span className="text-zinc-500">Receipt No.:</span> <span className="font-bold text-zinc-900 text-right">{viewReceipt.registrationId || viewReceipt.id}</span></div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2"><span className="text-zinc-500">Time:</span> <span className="font-bold text-zinc-900 text-right">{new Date(viewReceipt.createdAt).toLocaleString()}</span></div>
                            <div className="flex justify-between"><span className="text-zinc-500">Amount:</span> <span className="font-bold text-green-600 text-right">₹{viewReceipt.amount}</span></div>
                        </div>
                        <div className="border-t border-zinc-200 px-5 py-3 bg-zinc-50 rounded-b-lg flex justify-end">
                            <button onClick={() => setViewReceipt(null)} className="px-4 py-2 bg-zinc-800 text-white rounded text-sm font-semibold hover:bg-zinc-700 transition cursor-pointer">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
