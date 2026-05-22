import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FaTasks, FaSearch, FaUserTie, FaMapMarkerAlt, FaPhoneAlt, FaCalendarAlt } from "react-icons/fa";
import { CustomSelect } from "../../components/custom/CustomSelect";
import { CustomFilterInput } from "../../components/custom/CustomFilterInput";
import { PortalSelect } from "../../components/custom/PortalSelect";
import CustomButton from "../../components/custom/CustomButton";
import { assignLead, getLeads } from "../../services/leadService";
import { getAdmins } from "../../services/adminService";

const stateOptions = [{ value: "all", label: "All States" }];
const assignmentOptions = [
    { value: "all", label: "All Leads" },
    { value: "pending", label: "Pending (Not Assigned)" },
    { value: "assigned", label: "Assigned Leads" },
];
const leadPageSizeOptions = [5, 10, 25, 50];
const enquiryOptions = [
    { value: "all", label: "All Enquiries" },
    { value: "wholesale/distributor", label: "Wholesale/Distributor" },
    { value: "franchise", label: "Franchise" },
    { value: "retail-shop", label: "Retail-Shop" },
];

const normalizeState = (state = "") => state.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();

const formatStateLabel = (state = "") => {
    const normalizedState = normalizeState(state);
    return normalizedState
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

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

export default function LeadAssigning({ user }) {
    const [leads, setLeads] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [availableStates, setAvailableStates] = useState([]);
    const [selectedState, setSelectedState] = useState("all");
    const [assignmentFilter, setAssignmentFilter] = useState("pending");
    const [selectedAdmins, setSelectedAdmins] = useState({});
    const [loading, setLoading] = useState(true);
    const [assigningId, setAssigningId] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [selectedLeads, setSelectedLeads] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [bulkAdminId, setBulkAdminId] = useState("");
    const [bulkAssigning, setBulkAssigning] = useState(false);
    const [selectedEnquiry, setSelectedEnquiry] = useState("all");

    const fetchData = async () => {
        try {
            setLoading(true);
            const [leadData, adminData] = await Promise.all([
                getLeads(),
                getAdmins(),
            ]);
            setLeads(leadData);
            const stateMap = new Map();
            leadData.forEach((lead) => {
                const normalizedState = normalizeState(lead.state);
                if (normalizedState && !stateMap.has(normalizedState)) {
                    stateMap.set(normalizedState, formatStateLabel(lead.state));
                }
            });
            setAvailableStates([...stateMap.entries()].map(([value, label]) => ({ value, label })));
            setAdmins(adminData);
            setCurrentPage(1);
        } catch (error) {
            toast.error("Failed to load lead assigning data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedState, assignmentFilter, selectedEnquiry]);

    const stateDropdownData = useMemo(() => {
        return [
            { value: "all", label: "All States" },
            ...availableStates,
        ];
    }, [availableStates]);

    const adminDropdownData = admins.map((admin) => ({
        value: admin._id,
        label: admin.username,
    }));

    const filteredLeads = useMemo(() => {
        return leads.filter((lead) => {
            const matchesState = selectedState === "all" || normalizeState(lead.state) === selectedState;

            let matchesAssignment = true;
            if (assignmentFilter === "pending") {
                matchesAssignment = !lead.assignedTo;
            } else if (assignmentFilter === "assigned") {
                matchesAssignment = !!lead.assignedTo;
            }

            const matchesEnquiry = selectedEnquiry === "all" || lead.enquiryType === selectedEnquiry;

            const matchesSearch = searchQuery
                ? (lead.name && lead.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (lead.mobileNumber && lead.mobileNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (lead.state && lead.state.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (lead.source && lead.source.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (lead.enquiryType && lead.enquiryType.toLowerCase().includes(searchQuery.toLowerCase()))
                : true;

            return matchesState && matchesAssignment && matchesEnquiry && matchesSearch;
        });
    }, [leads, selectedState, assignmentFilter, selectedEnquiry, searchQuery]);
    const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedLeads = filteredLeads.slice(startIndex, startIndex + pageSize);
    const fromCount = filteredLeads.length === 0 ? 0 : startIndex + 1;
    const toCount = Math.min(startIndex + pageSize, filteredLeads.length);

    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setCurrentPage(1);
    };

    const handleSelectRow = (id) => {
        setSelectedLeads((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSelectAll = () => {
        const paginatedIds = paginatedLeads.map((l) => l._id);
        const allPaginatedSelected = paginatedIds.length > 0 && paginatedIds.every((id) => selectedLeads.has(id));

        setSelectedLeads((prev) => {
            const newSet = new Set(prev);
            if (allPaginatedSelected) {
                paginatedIds.forEach((id) => newSet.delete(id));
            } else {
                paginatedIds.forEach((id) => newSet.add(id));
            }
            return newSet;
        });
    };

    const handleBulkAssign = async () => {
        if (!bulkAdminId) {
            toast.info("Please select an admin for bulk assignment.");
            return;
        }
        if (selectedLeads.size === 0) {
            toast.info("No leads selected.");
            return;
        }

        try {
            setBulkAssigning(true);
            const leadIds = Array.from(selectedLeads);
            // Assuming the backend supports bulk assignment or we loop
            // To be safe and reuse existing service, we loop or use a Promise.all
            await Promise.all(leadIds.map(leadId => 
                assignLead(leadId, {
                    adminId: bulkAdminId,
                    assignedBy: user?.displayName || user?.username || "system",
                })
            ));

            const [updatedLeads] = await Promise.all([getLeads()]);
            setLeads(updatedLeads);
            setSelectedLeads(new Set());
            setBulkAdminId("");
            toast.success(`${leadIds.length} leads assigned successfully!`);
        } catch (error) {
            toast.error("Failed to assign some leads.");
        } finally {
            setBulkAssigning(false);
        }
    };

    const handleAssign = async (leadId) => {
        const adminId = selectedAdmins[leadId];
        if (!adminId) {
            toast.info("Please select an admin.");
            return;
        }

        try {
            setAssigningId(leadId);
            const updatedLead = await assignLead(leadId, {
                adminId,
                assignedBy: user?.displayName || user?.username || "system",
            });
            setLeads((prev) => prev.map((lead) => (lead._id === leadId ? updatedLead : lead)));
            toast.success("Lead assigned successfully!");
        } catch (error) {
            toast.error(error.response?.data?.msg || "Failed to assign lead.");
        } finally {
            setAssigningId("");
        }
    };

    return (
        <div className="pb-8 px-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-1 ms-1">
                    <FaTasks className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                    <h2 className="title-1">Lead Assigning</h2>
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
                    <div className="flex-1 md:w-48">
                        <PortalSelect
                            dropdownData={stateDropdownData.length > 1 ? stateDropdownData : stateOptions}
                            value={selectedState}
                            onChange={setSelectedState}
                            rounded="rounded-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-zinc-300 rounded-sm overflow-hidden">
                <div className="bg-zinc-50 border-b border-zinc-200 p-2 flex flex-col md:flex-row md:items-center justify-between gap-3 px-4">
                    <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                        <CustomFilterInput
                            dropdownData={assignmentOptions}
                            value={assignmentFilter}
                            onChange={setAssignmentFilter}
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

                    <div className="flex items-center gap-2 md:gap-3">
                        <div className={`flex items-center gap-2 px-2 md:px-3 py-1 border rounded-sm transition-colors duration-300
                            ${selectedLeads.size > 0 ? "bg-blue-50 border-blue-100" : "bg-zinc-100 border-zinc-200 opacity-60"}`}>
                            <span className={`text-[11px] font-bold uppercase whitespace-nowrap ${selectedLeads.size > 0 ? "text-blue-600" : "text-zinc-500"}`}>
                                {selectedLeads.size} <span className="hidden md:inline text-[11px]">Selected</span>
                            </span>
                        </div>
                        <div className="w-32 md:w-48">
                            <PortalSelect
                                dropdownData={[
                                    { value: "disabled", label: "Select User" },
                                    ...adminDropdownData,
                                ]}
                                value={bulkAdminId}
                                onChange={setBulkAdminId}
                                rounded="rounded-sm"
                                disabled={selectedLeads.size === 0 || bulkAssigning}
                            />
                        </div>
                        <CustomButton
                            label={bulkAssigning ? "..." : "Assign"}
                            icon={FaUserTie}
                            onClick={handleBulkAssign}
                            disabled={bulkAssigning || !bulkAdminId || selectedLeads.size === 0}
                            className="!py-[6px] !px-3 md:!px-4 !rounded-sm !text-[13px] whitespace-nowrap"
                        />
                    </div>
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
                                                className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-800 focus:ring-zinc-500 cursor-pointer"
                                                checked={paginatedLeads.length > 0 && paginatedLeads.every((l) => selectedLeads.has(l._id))}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        {["S No", "Date/Time", "Source", "Enquiry", "State", "Name", "Mobile", "District", "Address", "Pincode", "Status", "Assigned To", "Action"].map((head) => (
                                            <th key={head} className="border border-zinc-400 py-3 px-3 text-left text-[11px] font-bold text-zinc-800 uppercase whitespace-nowrap">
                                                {head}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedLeads.map((lead, index) => (
                                        <tr key={lead._id} className="hover:bg-zinc-50 transition-colors">
                                            <td className="border border-zinc-300 py-2.5 px-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-800 focus:ring-zinc-500 cursor-pointer mt-1"
                                                    checked={selectedLeads.has(lead._id)}
                                                    onChange={() => handleSelectRow(lead._id)}
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
                                                <a href={`tel:${lead.mobileNumber}`} className="text-[13px] font-bold text-zinc-900 capitalize hover:text-blue-600 hover:underline transition-colors w-fit">
                                                    {lead.name}
                                                </a>
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3">
                                                <a href={`tel:${lead.mobileNumber}`} className="text-[13px] font-bold text-zinc-700 hover:text-black whitespace-nowrap">
                                                    {lead.mobileNumber}
                                                </a>
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
                                            <td className="border border-zinc-300 py-2.5 px-3">
                                                <div className="min-w-44">
                                                    <PortalSelect
                                                        dropdownData={[
                                                            { value: "disabled", label: "Select User" },
                                                            ...adminDropdownData,
                                                        ]}
                                                        value={selectedAdmins[lead._id] || lead.assignedTo?._id || ""}
                                                        onChange={(value) => setSelectedAdmins((prev) => ({ ...prev, [lead._id]: value }))}
                                                        isUp={paginatedLeads.length > 3 && index > paginatedLeads.length - 3}
                                                        rounded="rounded-sm"
                                                    />
                                                </div>
                                            </td>
                                            <td className="border border-zinc-300 py-2.5 px-3">
                                                <CustomButton
                                                    label={assigningId === lead._id ? "..." : "Assign"}
                                                    onClick={() => handleAssign(lead._id)}
                                                    disabled={assigningId === lead._id}
                                                    className="!py-1.5 !px-3 w-full !rounded-sm"
                                                />
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
                                        <label className="text-xs font-bold uppercase text-zinc-500" htmlFor="lead-assigning-page-size">
                                            Rows
                                        </label>
                                        <select
                                            id="lead-assigning-page-size"
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
