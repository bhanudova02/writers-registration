import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FaPhoneAlt, FaSearch } from "react-icons/fa";
import { MdRotateLeft } from "react-icons/md";
import { PortalSelect } from "../../components/custom/PortalSelect";
import CustomDateInput from "../../components/custom/CustomDateInput";
import CustomTextarea from "../../components/custom/CustomTextarea";
import CustomButton from "../../components/custom/CustomButton";
import CustomTimeSelect from "../../components/custom/CustomTimeSelect";
import { CustomFilterInput } from "../../components/custom/CustomFilterInput";
import { getLeads, updateLeadStatus } from "../../services/leadService";

const statusOptions = [
    { value: "", label: "Select Status" },
    { value: "Callback", label: "Callback" },
    { value: "Interested", label: "Interested" },
    { value: "Just Enquiry", label: "Just Enquiry" },
    { value: "No Response", label: "No Response" },
    { value: "Not Interested", label: "Not Interested" },
    { value: "Online", label: "Online" },
    { value: "Retail Shop - B2B", label: "Retail Shop - B2B" },
    { value: "Unresponse", label: "Unresponse" },
];

const interestedOptions = [
    { value: "", label: "Select Interested Stage" },
    { value: "Properties Search", label: "Properties Search" },
    { value: "Properties Finalized", label: "Properties Finalized" },
    { value: "Properties Rejected", label: "Properties Rejected" },
];

const leadPageSizeOptions = [5, 10, 25, 50];

const enquiryOptions = [
    { value: "all", label: "All Enquiries" },
    { value: "wholesale/distributor", label: "Wholesale/Distributor" },
    { value: "franchise", label: "Franchise" },
    { value: "retail-shop", label: "Retail-Shop" },
];

const workFilterOptions = [
    { value: "all", label: "All Works" },
    { value: "pending", label: "Pending Works" },
    { value: "completed", label: "Completed Works" },
];

export default function LeadStatus() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState("");
    const [formState, setFormState] = useState({});
    const [filterDate, setFilterDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [selectedEnquiry, setSelectedEnquiry] = useState("all");
    const [workFilter, setWorkFilter] = useState("all");
    const [assignedDateFilter, setAssignedDateFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const data = await getLeads();
            setLeads(data);
            setFormState(
                data.reduce((acc, lead) => {
                    acc[lead._id] = {
                        status: lead.status || "",
                        callNote: lead.callNote || "",
                        nextCallbackAt: lead.nextCallbackAt ? new Date(lead.nextCallbackAt).toISOString().slice(0, 16) : "",
                        interestedSubStatus: lead.interestedSubStatus || "",
                    };
                    return acc;
                }, {})
            );
        } catch (error) {
            toast.error("Failed to load assigned leads.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterDate, selectedEnquiry, workFilter, assignedDateFilter, searchQuery]);

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

                const matchesEnquiry = selectedEnquiry === "all" || lead.enquiryType === selectedEnquiry;

                let matchesWork = true;
                if (workFilter === "pending") {
                    matchesWork = lead.status === "Pending";
                } else if (workFilter === "completed") {
                    matchesWork = lead.status !== "Pending";
                }

                const matchesAssignedDate = assignedDateFilter
                    ? (() => {
                        if (!lead.assignedAt) return false;
                        const d1 = new Date(lead.assignedAt);
                        const d2 = new Date(assignedDateFilter);
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

                return matchesDate && matchesEnquiry && matchesWork && matchesAssignedDate && matchesSearch;
            })
            .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    }, [leads, filterDate, selectedEnquiry, workFilter, assignedDateFilter, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedLeads = filteredLeads.slice(startIndex, startIndex + pageSize);
    const fromCount = filteredLeads.length === 0 ? 0 : startIndex + 1;
    const toCount = Math.min(startIndex + pageSize, filteredLeads.length);

    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setCurrentPage(1);
    };

    const handleChange = (leadId, field, value) => {
        setFormState((prev) => {
            const newState = {
                ...prev,
                [leadId]: {
                    ...prev[leadId],
                    [field]: value,
                },
            };

            // Auto-fill time for "No Response"
            if (field === "status" && value === "No Response") {
                const now = new Date();
                const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
                // Snap to next 15-min interval
                oneHourFromNow.setMinutes(Math.ceil(oneHourFromNow.getMinutes() / 15) * 15);
                oneHourFromNow.setSeconds(0);
                oneHourFromNow.setMilliseconds(0);
                newState[leadId].nextCallbackAt = oneHourFromNow.toISOString();
            }

            return newState;
        });
    };

    const handleSave = async (leadId) => {
        const payload = formState[leadId];
        if (!payload?.status) {
            toast.info("Please select status.");
            return;
        }
        if (payload.status === "Callback" && !payload.nextCallbackAt) {
            toast.info("Please choose next callback date and time.");
            return;
        }
        if (payload.status === "Interested" && !payload.interestedSubStatus) {
            toast.info("Please choose interested stage.");
            return;
        }

        try {
            setSavingId(leadId);
            const updatedLead = await updateLeadStatus(leadId, payload);
            setLeads((prev) => prev.map((lead) => (lead._id === leadId ? updatedLead : lead)));
            setCurrentPage(1); // Jump to top to show the updated lead
            toast.success("Lead status updated.");
        } catch (error) {
            toast.error(error.response?.data?.msg || "Failed to update lead status.");
        } finally {
            setSavingId("");
        }
    };

    return (
        <div className="pb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-1 ms-1">
                    <FaPhoneAlt className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                    <h2 className="title-1">Lead Status</h2>
                </div>

                <div className="flex flex-row items-center gap-2 w-full md:w-auto">
                    <div className="flex-1 md:w-48">
                        <PortalSelect
                            dropdownData={enquiryOptions}
                            value={selectedEnquiry}
                            onChange={setSelectedEnquiry}
                            rounded="rounded-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-1 md:w-auto">
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
                                className="px-3 h-[36px] bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-sm transition-colors border border-zinc-200"
                                title="Reset Date"
                            >
                                <MdRotateLeft className="text-lg" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-zinc-300 rounded-sm overflow-hidden">
                <div className="bg-zinc-50 border-b border-zinc-200 p-2 flex flex-col md:flex-row md:items-center justify-between gap-3 px-4">
                    <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                        <CustomFilterInput
                            dropdownData={workFilterOptions}
                            value={workFilter}
                            onChange={setWorkFilter}
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
                    <div className="flex items-center gap-2">
                        <div className="flex-1 w-32 md:w-36">
                            <CustomDateInput
                                type="date"
                                value={assignedDateFilter}
                                onChange={(e) => setAssignedDateFilter(e.target.value)}
                                placeholder="Assigned Date"
                            />
                        </div>
                        {assignedDateFilter && (
                            <button
                                onClick={() => setAssignedDateFilter("")}
                                className="flex items-center justify-center px-3 h-[36px] bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-sm transition-colors border border-zinc-200"
                                title="Reset Assigned Date"
                            >
                                <MdRotateLeft className="text-lg" />
                            </button>
                        )}
                    </div>
                </div>
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-zinc-400 text-sm font-semibold">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-800 mb-2"></div>
                        Fetching leads...
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="py-20 text-center text-sm font-bold text-zinc-500">
                        {leads.length === 0 ? "No assigned leads found." : "No leads match your search/date filter."}
                    </div>
                ) : (
                    <div>
                        <div className="overflow-x-auto only-scroll-width">
                            <table className="w-full min-w-[1050px] border-collapse border border-zinc-400">
                                <thead>
                                    <tr className="bg-zinc-200 border-b border-zinc-300">
                                        {["S No", "Lead Details", "Source/Enquiry", "Update Status", "Remarks", "Action"].map((head) => (
                                            <th key={head} className="border border-zinc-400 py-3 px-3 text-left text-[11px] font-bold text-zinc-800 uppercase whitespace-nowrap">
                                                {head}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                {paginatedLeads.map((lead, index) => {
                                    const row = formState[lead._id] || {};
                                    return (
                                        <tr key={lead._id} className="hover:bg-zinc-50 transition-colors">
                                            <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-bold text-zinc-600 text-center bg-zinc-50/30">
                                                {startIndex + index + 1}
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3">
                                                <div className="flex flex-col">
                                                    <a href={`tel:${lead.mobileNumber}`} className="text-[13px] font-bold text-zinc-900 capitalize hover:text-blue-600 hover:underline transition-colors w-fit">
                                                        {lead.name}
                                                    </a>
                                                    <a href={`tel:${lead.mobileNumber}`} className="text-[12px] font-semibold text-zinc-600 hover:text-blue-600 hover:underline transition-colors w-fit">
                                                        {lead.mobileNumber}
                                                    </a>
                                                    <span className="text-[10px] text-zinc-400 font-medium">{lead.state} | {lead.district || "-"}</span>
                                                </div>
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="px-2 py-0.5 w-fit bg-blue-50 text-blue-600 text-[9px] font-bold uppercase border border-blue-100">{lead.source}</span>
                                                    <span className="text-[11px] font-semibold text-zinc-500 uppercase">{lead.enquiryType === 'wholesale/distributor' ? 'Wholesale/Distributor' : lead.enquiryType}</span>
                                                </div>
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 min-w-40">
                                                <div className="space-y-2">
                                                    <PortalSelect
                                                        dropdownData={statusOptions}
                                                        value={row.status || ""}
                                                        onChange={(value) => handleChange(lead._id, "status", value)}
                                                        rounded="rounded-sm"
                                                        isUp={paginatedLeads.length > 3 && index > paginatedLeads.length - 3}
                                                    />
                                                    {row.status === "Interested" && (
                                                        <PortalSelect
                                                            dropdownData={interestedOptions}
                                                            value={row.interestedSubStatus || ""}
                                                            onChange={(value) => handleChange(lead._id, "interestedSubStatus", value)}
                                                            rounded="rounded-sm"
                                                            isUp={paginatedLeads.length > 3 && index > paginatedLeads.length - 3}
                                                        />
                                                    )}
                                                    {(row.status === "Callback" || row.status === "Interested") && (
                                                        <CustomDateInput
                                                            type="datetime-local"
                                                            value={row.nextCallbackAt || ""}
                                                            onChange={(e) => handleChange(lead._id, "nextCallbackAt", e.target.value)}
                                                            placeholder="Next Call"
                                                        />
                                                    )}
                                                    {row.status === "No Response" && (
                                                        <CustomTimeSelect
                                                            value={row.nextCallbackAt || ""}
                                                            onChange={(value) => handleChange(lead._id, "nextCallbackAt", value)}
                                                            isUp={paginatedLeads.length > 3 && index > paginatedLeads.length - 3}
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3 min-w-56">
                                                <CustomTextarea
                                                    value={row.callNote || ""}
                                                    onChange={(e) => handleChange(lead._id, "callNote", e.target.value)}
                                                    rows={2}
                                                    className="!py-1 !text-[12px] rounded-sm resize-none"
                                                    placeholder="Enter remarks..."
                                                />
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
                                );
                                })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-1 rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm md:flex md:items-center md:justify-between md:gap-3">
                            <div className="flex items-center justify-between gap-2 md:flex-1">
                                <p className="font-semibold text-zinc-600">
                                    <span className="hidden xl:inline">Showing </span>{fromCount}-{toCount} Of {filteredLeads.length}
                                </p>
                                <div className="flex shrink-0 items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold uppercase text-zinc-500" htmlFor="lead-status-page-size">
                                            Rows
                                        </label>
                                        <select
                                            id="lead-status-page-size"
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
