import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FaStar, FaSearch, FaDownload } from "react-icons/fa";
import { MdRotateLeft } from "react-icons/md";
import * as XLSX from "xlsx";
import { PortalSelect } from "../../components/custom/PortalSelect";
import CustomDateInput from "../../components/custom/CustomDateInput";
import CustomButton from "../../components/custom/CustomButton";
import { getLeads, updateLeadStatus } from "../../services/leadService";

const interestedOptions = [
    { value: "", label: "Select Interested Stage" },
    { value: "Properties Search", label: "Properties Search" },
    { value: "Properties Finalized", label: "Properties Finalized" },
    { value: "Properties Rejected", label: "Properties Rejected" },
];

const Tag = ({ text, color = "zinc" }) => (
    <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap
        ${color === "blue" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-zinc-50 text-zinc-500 border-zinc-200"}`}>
        {text}
    </span>
);

const leadPageSizeOptions = [5, 10, 25, 50];

export default function InterestedLeads() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState("");
    const [selectedStage, setSelectedStage] = useState({});
    const [filterDate, setFilterDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const data = await getLeads({ interested: true });
            setLeads(data);
            setSelectedStage(
                data.reduce((acc, lead) => {
                    acc[lead._id] = {
                        interestedSubStatus: lead.interestedSubStatus || "",
                        nextCallbackAt: lead.nextCallbackAt ? new Date(lead.nextCallbackAt).toISOString().slice(0, 16) : "",
                    };
                    return acc;
                }, {})
            );
        } catch (error) {
            toast.error("Failed to load interested leads.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterDate, searchQuery]);

    const filteredLeads = useMemo(() => {
        return leads
            .filter((lead) => {
                const matchesDate = filterDate
                    ? (() => {
                        if (!lead.nextCallbackAt) return false;
                        const d1 = new Date(lead.nextCallbackAt);
                        const d2 = new Date(filterDate);
                        return d1.getFullYear() === d2.getFullYear() &&
                               d1.getMonth() === d2.getMonth() &&
                               d1.getDate() === d2.getDate();
                      })()
                    : true;

                const matchesSearch = searchQuery
                    ? (lead.name && lead.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                      (lead.mobileNumber && lead.mobileNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                      (lead.state && lead.state.toLowerCase().includes(searchQuery.toLowerCase())) ||
                      (lead.source && lead.source.toLowerCase().includes(searchQuery.toLowerCase())) ||
                      (lead.enquiryType && lead.enquiryType.toLowerCase().includes(searchQuery.toLowerCase()))
                    : true;

                return matchesDate && matchesSearch;
            })
            .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    }, [leads, filterDate, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedLeads = filteredLeads.slice(startIndex, startIndex + pageSize);
    const fromCount = filteredLeads.length === 0 ? 0 : startIndex + 1;
    const toCount = Math.min(startIndex + pageSize, filteredLeads.length);

    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setCurrentPage(1);
    };

    const handleSave = async (leadId) => {
        const { interestedSubStatus, nextCallbackAt } = selectedStage[leadId] || {};
        if (!interestedSubStatus) {
            toast.info("Please select interested stage.");
            return;
        }

        try {
            setSavingId(leadId);
            const updatedLead = await updateLeadStatus(leadId, {
                status: 'Interested',
                interestedSubStatus,
                nextCallbackAt,
            });
            setLeads((prev) => prev.map((lead) => (lead._id === leadId ? updatedLead : lead)));
            setCurrentPage(1); // Jump to top to show the updated lead
            setSelectedStage((prev) => ({
                ...prev,
                [leadId]: {
                    interestedSubStatus: updatedLead.interestedSubStatus || "",
                    nextCallbackAt: updatedLead.nextCallbackAt ? new Date(updatedLead.nextCallbackAt).toISOString().slice(0, 16) : "",
                },
            }));
            toast.success("Interested stage updated.");
        } catch (error) {
            toast.error(error.response?.data?.msg || "Failed to update interested stage.");
        } finally {
            setSavingId("");
        }
    };

    const handleDownloadExcel = () => {
        if (filteredLeads.length === 0) {
            toast.info("No data to download.");
            return;
        }

        const excelData = filteredLeads.map((lead, index) => ({
            "S No": index + 1,
            "Lead Name": lead.name,
            "Mobile": lead.mobileNumber,
            "Source": lead.source,
            "Enquiry": lead.enquiryType,
            "State": lead.state,
            "District": lead.district || "-",
            "Current Stage": lead.interestedSubStatus || "Interested",
            "Updated At": lead.interestedUpdatedAt ? new Date(lead.interestedUpdatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "-",
            "Next Call": lead.nextCallbackAt ? new Date(lead.nextCallbackAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "-"
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Interested Leads");
        XLSX.writeFile(workbook, "Interested_Leads.xlsx");
    };

    return (
        <div className="pb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-1 ms-1">
                    <FaStar className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                    <h2 className="title-1">Interested Leads</h2>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3">
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
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="flex-1 md:w-36">
                            <CustomDateInput
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                placeholder="Follow-up Date"
                            />
                        </div>
                        {filterDate && (
                            <button
                                onClick={() => setFilterDate("")}
                                className="flex items-center justify-center px-3 h-[35px] bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-sm transition-colors border border-zinc-200"
                                title="Reset Date"
                            >
                                <MdRotateLeft className="text-lg" />
                            </button>
                        )}
                        <button
                            onClick={handleDownloadExcel}
                            className="flex items-center justify-center gap-2 px-4 h-[35px] bg-zinc-800 hover:bg-zinc-900 text-white rounded-sm transition-colors text-sm font-semibold shadow-sm whitespace-nowrap"
                            title="Download Excel"
                        >
                            <FaDownload />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                    </div>
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
                        {leads.length === 0 ? "No interested leads found." : "No leads match your search/date filter."}
                    </div>
                ) : (
                    <div>
                        <div className="overflow-x-auto only-scroll-width">
                            <table className="w-full min-w-[1100px] border-collapse border border-zinc-400">
                                <thead>
                                    <tr className="bg-zinc-200 border-b border-zinc-300">
                                        {["S No", "Lead Name", "Mobile", "Source", "Enquiry", "State", "District", "Current Stage", "Updated At", "Change Stage", "Action"].map((head) => (
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
                                        <td className="border border-zinc-300 py-2.5 px-3 min-w-40">
                                            <a href={`tel:${lead.mobileNumber}`} className="text-[13px] font-bold text-zinc-900 capitalize hover:text-blue-600 hover:underline transition-colors w-fit">
                                                {lead.name}
                                            </a>
                                        </td>
                                        <td className="border border-zinc-300 py-2.5 px-3">
                                            <a href={`tel:${lead.mobileNumber}`} className="text-[13px] font-bold text-zinc-700 hover:text-black whitespace-nowrap">
                                                {lead.mobileNumber}
                                            </a>
                                        </td>
                                        <td className="border border-zinc-300 py-2.5 px-3">
                                            <Tag text={lead.source} color="blue" />
                                        </td>
                                        <td className="border border-zinc-300 py-2.5 px-3 text-[12px] font-semibold text-zinc-600">
                                            {lead.enquiryType === 'wholesale/distributor' ? 'Wholesale/Distributor' : lead.enquiryType}
                                        </td>
                                        <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-bold text-zinc-800 whitespace-nowrap">
                                            {lead.state}
                                        </td>
                                        <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-semibold text-zinc-700">
                                            {lead.district || "-"}
                                        </td>
                                        <td className="border border-zinc-300 py-2.5 px-3 text-center">
                                            <span className="px-2 py-0.5 rounded-none text-[10px] font-bold border bg-blue-50 text-blue-600 border-blue-200 uppercase whitespace-nowrap">
                                                {lead.interestedSubStatus || "Interested"}
                                            </span>
                                        </td>
                                        <td className="border border-zinc-300 py-2.5 px-3 text-[11px] font-bold text-zinc-500 whitespace-nowrap text-center">
                                            {lead.interestedUpdatedAt ? new Date(lead.interestedUpdatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "-"}
                                        </td>
                                        <td className="border border-zinc-300 py-2.5 px-3 whitespace-nowrap">
                                            <div className="min-w-56 space-y-2">
                                                <PortalSelect
                                                    dropdownData={interestedOptions}
                                                    value={selectedStage[lead._id]?.interestedSubStatus || ""}
                                                    onChange={(value) => setSelectedStage((prev) => ({ 
                                                        ...prev, 
                                                        [lead._id]: { ...prev[lead._id], interestedSubStatus: value } 
                                                    }))}
                                                    rounded="rounded-sm"
                                                    isUp={paginatedLeads.length > 3 && index > paginatedLeads.length - 3}
                                                />
                                                <CustomDateInput
                                                    type="datetime-local"
                                                    value={selectedStage[lead._id]?.nextCallbackAt || ""}
                                                    onChange={(e) => setSelectedStage((prev) => ({ 
                                                        ...prev, 
                                                        [lead._id]: { ...prev[lead._id], nextCallbackAt: e.target.value } 
                                                    }))}
                                                    placeholder="Next Call"
                                                />
                                            </div>
                                        </td>
                                        <td className="border border-zinc-300 py-2.5 px-3 text-center">
                                            <CustomButton
                                                label={savingId === lead._id ? "..." : "Update"}
                                                onClick={() => handleSave(lead._id)}
                                                disabled={savingId === lead._id}
                                                className="!py-1.5 !px-3 w-full !rounded-sm !text-[12px]"
                                            />
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm md:flex md:items-center md:justify-between md:gap-3">
                            <div className="flex items-center justify-between gap-2 md:flex-1">
                                <p className="font-semibold text-zinc-600">
                                    <span className="hidden xl:inline">Showing </span>{fromCount}-{toCount} Of {filteredLeads.length}
                                </p>
                                <div className="flex shrink-0 items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold uppercase text-zinc-500" htmlFor="interested-leads-page-size">
                                            Rows
                                        </label>
                                        <select
                                            id="interested-leads-page-size"
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
