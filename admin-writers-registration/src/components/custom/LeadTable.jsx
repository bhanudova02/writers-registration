import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { FaSearch } from "react-icons/fa";
import { getLeads } from "../../services/leadService";

export default function LeadTable({ title, params = {} }) {
    const [leads, setLeads] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    const leadPageSizeOptions = [5, 10, 25, 50];

    useEffect(() => {
        const fetchLeads = async () => {
            try {
                setLoading(true);
                const data = await getLeads(params);
                setLeads(data);
                setCurrentPage(1); // Reset to first page on new filter
            } catch (error) {
                toast.error(`Failed to load ${title.toLowerCase()}.`);
            } finally {
                setLoading(false);
            }
        };

        fetchLeads();
    }, [JSON.stringify(params)]);

    const filteredLeads = useMemo(() => {
        if (!searchQuery) return leads;
        const lowerQuery = searchQuery.toLowerCase();
        return leads.filter((lead) =>
            (lead.name && lead.name.toLowerCase().includes(lowerQuery)) ||
            (lead.mobileNumber && lead.mobileNumber.toLowerCase().includes(lowerQuery)) ||
            (lead.state && lead.state.toLowerCase().includes(lowerQuery)) ||
            (lead.source && lead.source.toLowerCase().includes(lowerQuery)) ||
            (lead.enquiryType && lead.enquiryType.toLowerCase().includes(lowerQuery))
        );
    }, [leads, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedLeads = useMemo(() => filteredLeads.slice(startIndex, startIndex + pageSize), [filteredLeads, startIndex, pageSize]);
    const fromCount = filteredLeads.length === 0 ? 0 : startIndex + 1;
    const toCount = Math.min(startIndex + pageSize, filteredLeads.length);

    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setCurrentPage(1);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    return (
        <div className="pb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <h2 className="title-1">{title}</h2>
                <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch className="text-zinc-400 text-sm" />
                    </div>
                    <input
                        type="text"
                        className="w-full pl-10 pr-3 py-[7.5px] border border-zinc-300 rounded-sm text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 bg-white text-zinc-800 placeholder-zinc-400 shadow-sm"
                        placeholder="Search name or mobile..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white border border-zinc-300 rounded-sm overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-zinc-400 text-sm font-semibold">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-800 mb-2"></div>
                        Fetching leads...
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="py-20 text-center text-sm font-bold text-zinc-500">
                        {leads.length === 0 ? "No leads found." : "No leads match your search query."}
                    </div>
                ) : (
                    <div>
                        <div className="overflow-x-auto only-scroll-width">
                            <table className="w-full min-w-[1200px] border-collapse border border-zinc-400">
                                <thead>
                                    <tr className="bg-zinc-200 border-b border-zinc-300">
                                        {["S No", "Name", "Mobile", "Source", "Enquiry", "State", "District", "Follow-up", "Remarks", "Status"].map((head) => (
                                            <th key={head} className="border border-zinc-400 py-3 px-3 text-left text-[11px] font-bold text-zinc-800 uppercase whitespace-nowrap">
                                                {head}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedLeads.map((lead, index) => (
                                        <tr key={lead._id} className="hover:bg-zinc-50 transition-colors">
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-bold text-zinc-600 text-center bg-zinc-50/30">
                                                {startIndex + index + 1}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-bold text-zinc-900 capitalize">
                                                {lead.name}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-bold text-zinc-700">
                                                <a href={`tel:${lead.mobileNumber}`} className="hover:text-blue-600 hover:underline transition-colors">
                                                    {lead.mobileNumber}
                                                </a>
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[11px] font-bold text-zinc-500 uppercase">
                                                {lead.source}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[11px] font-semibold text-zinc-600 uppercase">
                                                {lead.enquiryType === 'wholesale/distributor' ? 'Wholesale/Distributor' : lead.enquiryType}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-bold text-zinc-800 whitespace-nowrap">
                                                {lead.state}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-semibold text-zinc-700">
                                                {lead.district || "-"}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[11px] font-bold text-zinc-500 whitespace-nowrap text-left">
                                                {lead.nextCallbackAt ? (() => {
                                                    const date = new Date(lead.nextCallbackAt);
                                                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                                    const month = months[date.getMonth()];
                                                    const day = String(date.getDate()).padStart(2, '0');
                                                    const year = String(date.getFullYear()).slice(-2);
                                                    let hours = date.getHours();
                                                    const minutes = String(date.getMinutes()).padStart(2, '0');
                                                    const ampm = hours >= 12 ? 'PM' : 'AM';
                                                    hours = hours % 12;
                                                    hours = hours ? hours : 12;
                                                    return `${day}-${month}-${year} | ${hours}:${minutes} ${ampm}`;
                                                })() : "-"}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[12px] text-zinc-600 min-w-[150px]">
                                                {lead.callNote || "-"}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-center">
                                                {lead.status === 'Callback' ? (
                                                    <a 
                                                        href={`tel:${lead.mobileNumber}`}
                                                        className="px-2 py-0.5 rounded-none text-[10px] font-bold border uppercase whitespace-nowrap bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 transition-colors inline-block"
                                                    >
                                                        {lead.status}
                                                    </a>
                                                ) : (
                                                    <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold border uppercase whitespace-nowrap ${
                                                        lead.status === 'Interested' ? 'bg-green-50 text-green-600 border-green-200' :
                                                        'bg-zinc-50 text-zinc-600 border-zinc-200'
                                                    }`}>
                                                        {lead.status || "Pending"}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="mt-1 rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm md:flex md:items-center md:justify-between md:gap-3">
                            <div className="flex items-center justify-between gap-2 md:flex-1">
                                <p className="font-semibold text-zinc-600">
                                    Showing {fromCount}-{toCount} Of {leads.length}
                                </p>
                                <div className="flex shrink-0 items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold uppercase text-zinc-500">
                                            Rows
                                        </label>
                                        <select
                                            value={pageSize}
                                            onChange={handlePageSizeChange}
                                            className="h-8 rounded-sm border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-700 outline-none"
                                        >
                                            {leadPageSizeOptions.map((size) => (
                                                <option key={size} value={size}>
                                                    {size}
                                                </option>
                                            ))}
                                        </select>
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
                    </div>
                )}
            </div>
        </div>
    );
}
