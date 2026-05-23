import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FaTasks, FaSearch, FaUserTie, FaCalendarAlt, FaDownload } from "react-icons/fa";
import * as XLSX from "xlsx";
import { HiDocumentReport } from "react-icons/hi";
import { PortalSelect } from "../components/custom/PortalSelect";
import { CustomFilterInput } from "../components/custom/CustomFilterInput";
import CustomButton from "../components/custom/CustomButton";
import { CustomSelect } from "../components/custom/CustomSelect";
import { getLeads } from "../services/leadService";
import { getAdmins } from "../services/adminService";

const statusFilterOptions = [
    { value: "all", label: "All Status" },
    { value: "Pending", label: "Pending" },
    { value: "Callback", label: "Callback" },
    { value: "Interested", label: "Interested" },
    { value: "Just Enquiry", label: "Just Enquiry" },
    { value: "No Response", label: "No Response" },
    { value: "Not Interested", label: "Not Interested" },
    { value: "Online", label: "Online" },
    { value: "Retail Shop - B2B", label: "Retail Shop - B2B" },
    { value: "Unresponse", label: "Unresponsive" },
];
const leadPageSizeOptions = [5, 10, 25, 50];

const StatusBadge = ({ status }) => {
    const statusMap = {
        pending: "bg-amber-50 text-amber-600 border-amber-200",
        assigned: "bg-blue-50 text-blue-600 border-blue-200",
        completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
        followup: "bg-purple-50 text-purple-600 border-purple-200",
        rejected: "bg-rose-50 text-rose-600 border-rose-200",
    };
    const style = statusMap[status?.toLowerCase().replace(/\s/g, "")] || "bg-slate-50 text-slate-600 border-slate-200";
    return (
        <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold border ${style} capitalize whitespace-nowrap`}>
            {status}
        </span>
    );
};

const Tag = ({ text, color = "zinc" }) => (
    <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap
        ${color === "blue" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-zinc-50 text-zinc-500 border-zinc-200"}`}>
        {text}
    </span>
);

export default function ReportsPage() {
    const [leads, setLeads] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState(new Set());

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const [leadData, adminData] = await Promise.all([
                getLeads(params),
                getAdmins(),
            ]);
            setLeads(leadData);
            setAdmins(adminData);
            setCurrentPage(1);
            setSelectedIds(new Set());
        } catch (error) {
            toast.error("Failed to load reports data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter]);

    const filteredLeads = useMemo(() => {
        return leads.filter((lead) => {
            let matchesStatus = true;
            if (statusFilter !== "all") {
                matchesStatus = lead.status === statusFilter;
            }

            const matchesSearch = searchQuery
                ? (lead.name && lead.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (lead.mobileNumber && lead.mobileNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (lead.state && lead.state.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (lead.source && lead.source.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (lead.enquiryType && lead.enquiryType.toLowerCase().includes(searchQuery.toLowerCase()))
                : true;

            return matchesStatus && matchesSearch;
        });
    }, [leads, statusFilter, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedLeads = filteredLeads.slice(startIndex, startIndex + pageSize);
    const fromCount = filteredLeads.length === 0 ? 0 : startIndex + 1;
    const toCount = Math.min(startIndex + pageSize, filteredLeads.length);

    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setCurrentPage(1);
    };

    const toggleSelectAll = () => {
        const newSelected = new Set(selectedIds);
        const allOnPageSelected = paginatedLeads.length > 0 && paginatedLeads.every(lead => selectedIds.has(lead._id));
        
        if (allOnPageSelected) {
            paginatedLeads.forEach(lead => newSelected.delete(lead._id));
        } else {
            paginatedLeads.forEach(lead => newSelected.add(lead._id));
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectRow = (id) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleDownload = () => {
        const dataToDownload = selectedIds.size > 0 
            ? leads.filter(lead => selectedIds.has(lead._id))
            : filteredLeads;

        if (dataToDownload.length === 0) {
            toast.info("No data available to download.");
            return;
        }

        const dataToExport = dataToDownload.map((lead, index) => ({
            "S No": index + 1,
            "Date/Time": new Date(lead.createdAt).toLocaleDateString("en-GB") + " " + new Date(lead.createdAt).toLocaleTimeString(),
            "Source": lead.source,
            "Enquiry": lead.enquiryType,
            "State": lead.state,
            "Name": lead.name,
            "Mobile": lead.mobileNumber,
            "District": lead.district || "-",
            "Address": lead.address,
            "Pincode": lead.pincode || "-",
            "Status": lead.status,
            "Assigned To": lead.assignedTo?.username || "-"
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
        XLSX.writeFile(workbook, `Leads_Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="pb-8 px-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-1 ms-1">
                    <HiDocumentReport className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                    <h2 className="title-1">Leads Reports</h2>
                </div>

                <div className="flex flex-row items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-white border border-zinc-300 rounded-sm px-2 py-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">From</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent text-xs font-semibold focus:outline-none text-zinc-800"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-zinc-300 rounded-sm px-2 py-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">To</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent text-xs font-semibold focus:outline-none text-zinc-800"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-zinc-300 rounded-sm overflow-hidden">
                <div className="bg-zinc-50 border-b border-zinc-200 p-2 flex items-center justify-between gap-2 md:gap-3 px-2 md:px-4">
                    <div className="flex items-center gap-2 flex-1">
                        <CustomFilterInput
                            dropdownData={statusFilterOptions}
                            value={statusFilter}
                            onChange={setStatusFilter}
                            rounded="rounded-sm"
                        />
                        <div className="relative flex-1 md:max-w-[240px]">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                <FaSearch className="text-zinc-400 text-[13px]" />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-8 pr-3 py-[7.5px] border border-zinc-300 rounded-sm text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 bg-white text-zinc-800 placeholder-zinc-400"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <CustomButton
                        label={<span className="hidden md:inline">Export</span>}
                        icon={FaDownload}
                        onClick={handleDownload}
                        disabled={loading || (filteredLeads.length === 0 && selectedIds.size === 0)}
                        className="!py-[6px] !px-3 md:!px-4 !rounded-sm !text-[13px] whitespace-nowrap bg-zinc-800 hover:bg-zinc-900"
                    />
                </div>
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-zinc-400 text-sm font-semibold">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-800 mb-2"></div>
                        Fetching leads...
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="py-20 text-center text-sm font-bold text-zinc-500">
                        No Leads Found.
                    </div>
                ) : (
                    <div>
                        <div className="overflow-x-auto only-scroll-width">
                            <table className="w-full min-w-[1200px] border-collapse border border-zinc-400">
                                <thead>
                                    <tr className="bg-zinc-200 border-b border-zinc-300">
                                        <th className="border border-zinc-400 py-3 px-3 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded-sm accent-zinc-800 cursor-pointer"
                                                checked={paginatedLeads.length > 0 && paginatedLeads.every(lead => selectedIds.has(lead._id))}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        {["S No", "Date/Time", "Source", "Enquiry", "State", "Name", "Mobile", "District", "Address", "Pincode", "Status", "Assigned To"].map((head) => (
                                            <th key={head} className="border border-zinc-400 py-3 px-3 text-left text-[11px] font-bold text-zinc-800 uppercase whitespace-nowrap">
                                                {head}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedLeads.map((lead, index) => (
                                        <tr key={lead._id} className={`hover:bg-zinc-50 transition-colors ${selectedIds.has(lead._id) ? 'bg-zinc-100/50' : ''}`}>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded-sm accent-zinc-800 cursor-pointer"
                                                    checked={selectedIds.has(lead._id)}
                                                    onChange={() => toggleSelectRow(lead._id)}
                                                />
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-bold text-zinc-600 text-center bg-zinc-50/30">
                                                {startIndex + index + 1}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[11px] text-zinc-600 whitespace-nowrap">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="flex items-center gap-1.5 font-bold text-zinc-800">
                                                        <FaCalendarAlt size={10} className="text-zinc-400" />
                                                        {new Date(lead.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 ml-4">
                                                        {new Date(lead.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3">
                                                <Tag text={lead.source} color="blue" />
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[12px] font-semibold text-zinc-600 text-center">
                                                {lead.enquiryType === 'wholesale/distributor' ? 'Wholesale/Distributor' : lead.enquiryType}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-bold text-zinc-800 whitespace-nowrap">
                                                {lead.state}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 min-w-40">
                                                <span className="text-[13px] font-bold text-zinc-900 capitalize w-fit">
                                                    {lead.name}
                                                </span>
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3">
                                                <span className="text-[13px] font-bold text-zinc-700 whitespace-nowrap">
                                                    {lead.mobileNumber}
                                                </span>
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-semibold text-zinc-700">
                                                {lead.district || "-"}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[12px] text-zinc-600 max-w-56 truncate font-medium" title={lead.address}>
                                                {lead.address}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-bold text-zinc-700 text-center">
                                                {lead.pincode || "-"}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-center">
                                                <StatusBadge status={lead.status} />
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-semibold text-zinc-800">
                                                {lead.assignedTo?.username || "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="m-3 rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm md:flex md:items-center md:justify-between md:gap-3">
                            <div className="flex items-center justify-between gap-2 md:flex-1">
                                <p className="font-semibold text-zinc-600">
                                    <span className="hidden xl:inline">Showing </span>{fromCount}-{toCount} Of {filteredLeads.length}
                                </p>
                                <div className="flex shrink-0 items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold uppercase text-zinc-500" htmlFor="lead-reports-page-size">
                                            Rows
                                        </label>
                                        <CustomSelect
                                            dropdownData={leadPageSizeOptions.map(size => ({ value: size, label: size }))}
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
                    </div>
                )}
            </div>
        </div>
    );
}
