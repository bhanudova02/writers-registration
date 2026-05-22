import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { FaUserPlus } from "react-icons/fa6";
import { FaSearch } from "react-icons/fa";
import { FiCheckCircle, FiDownload, FiFileText, FiList, FiTrash2, FiUpload } from "react-icons/fi";
import CustomInput from "../../components/custom/CustomInput";
import CustomTextarea from "../../components/custom/CustomTextarea";
import { CustomSelect } from "../../components/custom/CustomSelect";
import { CustomSelectSearch } from "../../components/custom/CustomSelectSearch";
import CustomButton from "../../components/custom/CustomButton";
import { bulkUploadLeads, createLead, getLeads } from "../../services/leadService";
import { stateDistrictMap, stateOptions } from "../../data/indiaStatesDistricts";

const sourceOptions = [
    { value: "", label: "Select Source" },
    { value: "meta", label: "Meta" },
    { value: "google", label: "Google" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "email", label: "Email" },
    { value: "other", label: "Other" },
];

const enquiryOptions = [
    { value: "", label: "Select Enquiry" },
    { value: "franchise", label: "Franchise" },
    { value: "wholesale/distributor", label: "Wholesale/Distributor" },
    { value: "retail-shop", label: "Retail Shop" },
];

const initialFormData = {
    source: "",
    enquiry: "",
    name: "",
    mobileNumber: "",
    state: "",
    district: "",
    address: "",
    pincode: "",
};

const savedLeadPageSizeOptions = [5, 10, 25, 50];

export default function AddLeads() {
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedLeads, setSavedLeads] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoadingSavedLeads, setIsLoadingSavedLeads] = useState(false);
    const [savedLeadsPage, setSavedLeadsPage] = useState(1);
    const [savedLeadsPageSize, setSavedLeadsPageSize] = useState(5);
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSummary, setUploadSummary] = useState(null);
    const [activeTab, setActiveTab] = useState("normal");
    const fileInputRef = useRef(null);

    const districtOptions = useMemo(() => {
        if (!formData.state) {
            return [];
        }

        return [
            { value: "", label: "Select District" },
            ...(stateDistrictMap[formData.state] ?? []).map((district) => ({
                value: district,
                label: district,
            })),
        ];
    }, [formData.state]);

    const isSubmitDisabled = useMemo(() => {
        return !formData.source
            || !formData.enquiry
            || !formData.name.trim()
            || formData.mobileNumber.length !== 10
            || !formData.state
            || !formData.district
            || !formData.address.trim()
            || Object.values(errors).some(Boolean);
    }, [errors, formData]);

    const filteredSavedLeads = useMemo(() => {
        if (!searchQuery) return savedLeads;
        const lowerQuery = searchQuery.toLowerCase();
        return savedLeads.filter((lead) =>
            (lead.name && lead.name.toLowerCase().includes(lowerQuery)) ||
            (lead.mobileNumber && lead.mobileNumber.toLowerCase().includes(lowerQuery)) ||
            (lead.state && lead.state.toLowerCase().includes(lowerQuery)) ||
            (lead.source && lead.source.toLowerCase().includes(lowerQuery)) ||
            (lead.enquiryType && lead.enquiryType.toLowerCase().includes(lowerQuery))
        );
    }, [savedLeads, searchQuery]);

    const savedLeadsTotalPages = Math.max(1, Math.ceil(filteredSavedLeads.length / savedLeadsPageSize));
    const savedLeadsStartIndex = (savedLeadsPage - 1) * savedLeadsPageSize;
    const paginatedSavedLeads = filteredSavedLeads.slice(savedLeadsStartIndex, savedLeadsStartIndex + savedLeadsPageSize);
    const savedLeadsFrom = filteredSavedLeads.length === 0 ? 0 : savedLeadsStartIndex + 1;
    const savedLeadsTo = Math.min(savedLeadsStartIndex + savedLeadsPageSize, filteredSavedLeads.length);

    const fetchSavedLeads = async () => {
        try {
            setIsLoadingSavedLeads(true);
            const data = await getLeads();
            setSavedLeads(data);
            setSavedLeadsPage(1);
        } catch (error) {
            toast.error(error.response?.data?.msg || "Failed to load saved leads.");
        } finally {
            setIsLoadingSavedLeads(false);
        }
    };

    useEffect(() => {
        if (activeTab === "saved") {
            fetchSavedLeads();
        }
    }, [activeTab]);

    const validateField = (name, value) => {
        const trimmedValue = typeof value === "string" ? value.trim() : value;

        switch (name) {
            case "source":
            case "enquiry":
            case "district":
                return trimmedValue ? "" : "Field is required.";
            case "name":
            case "state":
            case "address":
                return trimmedValue ? "" : "Field is required.";
            case "mobileNumber":
                if (!trimmedValue) return "Field is required.";
                if (!/^\d{10}$/.test(trimmedValue)) return "Mobile number must be exactly 10 digits.";
                return "";
            case "pincode":
                if (!trimmedValue) return "";
                if (!/^\d{6}$/.test(trimmedValue)) return "Pincode must be exactly 6 digits.";
                return "";
            default:
                return "";
        }
    };

    const handleTextChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    };

    const handleStateChange = (value) => {
        setFormData((prev) => ({
            ...prev,
            state: value,
            district: "",
        }));
        setErrors((prev) => ({
            ...prev,
            state: validateField("state", value),
            district: value ? "Field is required." : "",
        }));
    };

    const handleNumberChange = (field, value, maxLength) => {
        const numericValue = value.replace(/\D/g, "").slice(0, maxLength);
        handleTextChange(field, numericValue);
    };

    const validateForm = () => {
        const nextErrors = {
            source: validateField("source", formData.source),
            enquiry: validateField("enquiry", formData.enquiry),
            name: validateField("name", formData.name),
            mobileNumber: validateField("mobileNumber", formData.mobileNumber),
            state: validateField("state", formData.state),
            district: validateField("district", formData.district),
            address: validateField("address", formData.address),
            pincode: validateField("pincode", formData.pincode),
        };

        setErrors(nextErrors);
        return !Object.values(nextErrors).some(Boolean);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Please fill in all required fields correctly.");
            return;
        }

        const submit = async () => {
            try {
                setIsSubmitting(true);
                await createLead({
                    source: formData.source,
                    enquiryType: formData.enquiry,
                    name: formData.name,
                    mobileNumber: formData.mobileNumber,
                    state: formData.state,
                    district: formData.district,
                    address: formData.address,
                    pincode: formData.pincode,
                });
                toast.success("Lead added successfully!");
                setFormData(initialFormData);
                setErrors({});
                setActiveTab("saved");
            } catch (error) {
                toast.error(error.response?.data?.msg || "Failed to create lead.");
            } finally {
                setIsSubmitting(false);
            }
        };

        submit();
    };

    const handleBulkUpload = async () => {
        if (!uploadFile) {
            toast.info("Please choose an Excel file first.");
            return;
        }

        try {
            setIsUploading(true);
            const result = await bulkUploadLeads(uploadFile);
            setUploadSummary(result);

            if (result.insertedCount > 0 && result.failedCount === 0) {
                toast.success(`Bulk upload completed. Inserted: ${result.insertedCount}`);
            } else if (result.insertedCount > 0 && result.failedCount > 0) {
                toast.warning(`Bulk upload partially completed. Inserted: ${result.insertedCount}, Failed: ${result.failedCount}`);
            } else {
                toast.error(`Bulk upload failed. Failed rows: ${result.failedCount}`);
            }

            setUploadFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            if (result.insertedCount > 0) {
                setActiveTab("saved");
            }
        } catch (error) {
            toast.error(error.response?.data?.msg || "Bulk upload failed.");
            if (error.response?.data?.errors) {
                setUploadSummary({
                    insertedCount: error.response.data.insertedCount || 0,
                    failedCount: error.response.data.failedCount || 0,
                    errors: error.response.data.errors
                });
            }
        } finally {
            setIsUploading(false);
        }
    };

    const handleResetBulkUpload = () => {
        setUploadFile(null);
        setUploadSummary(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSavedLeadsPageSizeChange = (e) => {
        setSavedLeadsPageSize(Number(e.target.value));
        setSavedLeadsPage(1);
    };

    return (
        <div className="pb-4">
            <div className="flex items-center gap-1 ms-1">
                <FaUserPlus className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                <h2 className="title-1">Add Leads</h2>
            </div>

            <div className="w-full mt-3">
                <div className="flex overflow-x-auto only-scroll-width md:grid md:grid-cols-3">
                    <div className="min-w-36 flex-1 border-b border-zinc-200 md:min-w-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab("normal")}
                            className={`w-full px-4 py-3 text-sm font-semibold transition text-center cursor-pointer whitespace-nowrap ${activeTab === "normal"
                                ? "bg-white text-zinc-900 border border-zinc-300 border-b-white -mb-px"
                                : "bg-zinc-50 text-zinc-500 border border-transparent hover:text-zinc-700"
                                }`}
                        >
                            <span className="inline-flex items-center gap-2">
                                <FiFileText className="text-sm" />
                                <span>Normal Upload</span>
                            </span>
                        </button>
                    </div>
                    <div className="min-w-36 flex-1 border-b border-zinc-200 md:min-w-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab("bulk")}
                            className={`w-full px-4 py-3 text-sm font-semibold transition text-center cursor-pointer whitespace-nowrap ${activeTab === "bulk"
                                ? "bg-white text-zinc-900 border border-zinc-300 border-b-white -mb-px"
                                : "bg-zinc-50 text-zinc-500 border border-transparent hover:text-zinc-700"
                                }`}
                        >
                            <span className="inline-flex items-center gap-2">
                                <FiUpload className="text-sm" />
                                <span>Bulk Upload</span>
                            </span>
                        </button>
                    </div>
                    <div className="min-w-36 flex-1 border-b border-zinc-200 md:min-w-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab("saved")}
                            className={`w-full px-4 py-3 text-sm font-semibold transition text-center cursor-pointer whitespace-nowrap ${activeTab === "saved"
                                ? "bg-white text-zinc-900 border border-zinc-300 border-b-white -mb-px"
                                : "bg-zinc-50 text-zinc-500 border border-transparent hover:text-zinc-700"
                                }`}
                        >
                            <span className="inline-flex items-center gap-2">
                                <FiList className="text-sm" />
                                <span>List</span>
                            </span>
                        </button>
                    </div>
                </div>

                {activeTab === "normal" ? (
                    <form onSubmit={handleSubmit} className="border border-zinc-200 bg-white px-6 md:px-10 pt-6 md:pt-8 pb-7 md:pb-10">
                        <div>
                            <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3">
                                <div>
                                    <CustomSelect
                                        label="Source *"
                                        dropdownData={sourceOptions}
                                        value={formData.source}
                                        onChange={(value) => handleTextChange("source", value)}
                                        error={errors.source}
                                    />
                                </div>
                                <div>
                                    <CustomSelect
                                        label="Enquiry *"
                                        dropdownData={enquiryOptions}
                                        value={formData.enquiry}
                                        onChange={(value) => handleTextChange("enquiry", value)}
                                        error={errors.enquiry}
                                    />
                                </div>
                                <div>
                                    <CustomInput
                                        label="Name *"
                                        value={formData.name}
                                        onChange={(e) => handleTextChange("name", e.target.value)}
                                        placeholder="Enter name"
                                        error={errors.name}
                                    />
                                </div>
                                <div>
                                    <CustomInput
                                        label="Mobile Number *"
                                        value={formData.mobileNumber}
                                        onChange={(e) => handleNumberChange("mobileNumber", e.target.value, 10)}
                                        placeholder="Enter mobile number"
                                        error={errors.mobileNumber}
                                    />
                                </div>
                                <div>
                                    <CustomSelectSearch
                                        label="State *"
                                        dropdownData={stateOptions}
                                        value={formData.state}
                                        onChange={handleStateChange}
                                        error={errors.state}
                                        searchPlaceholder="Search state..."
                                    />
                                </div>
                                <div>
                                    <CustomSelectSearch
                                        label="District *"
                                        dropdownData={districtOptions}
                                        value={formData.district}
                                        onChange={(value) => handleTextChange("district", value)}
                                        error={errors.district}
                                        searchPlaceholder="Search district..."
                                        emptyMessage="Please select state first"
                                    />
                                </div>
                                <div className="col-span-2 xl:col-span-3">
                                    <CustomTextarea
                                        label="Address *"
                                        value={formData.address}
                                        onChange={(e) => handleTextChange("address", e.target.value)}
                                        placeholder="Enter address"
                                        error={errors.address}
                                        rows={4}
                                    />
                                </div>
                                <div>
                                    <CustomInput
                                        label="Pincode"
                                        value={formData.pincode}
                                        onChange={(e) => handleNumberChange("pincode", e.target.value, 6)}
                                        placeholder="Enter pincode"
                                        error={errors.pincode}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end mt-5">
                                <CustomButton
                                    type="submit"
                                    label={isSubmitting ? "Saving..." : "Save Lead"}
                                    className="min-w-32"
                                    disabled={isSubmitDisabled || isSubmitting}
                                />
                            </div>
                        </div>
                    </form>
                ) : activeTab === "bulk" ? (
                    <div className="border border-zinc-200 bg-white px-6 md:px-10 pt-6 md:pt-8 pb-7 md:pb-10">
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                            <div>
                                <h3 className="title-2">Bulk Excel Upload</h3>
                                <p className="text-sm text-zinc-500 mt-1">Upload `.xlsx`, `.xls`, or `.csv` file using template columns.</p>
                            </div>
                            <a
                                href="/bulk_leads.xlsx"
                                download="bulk_leads.xlsx"
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700 border border-zinc-300 hover:bg-zinc-200 transition-colors w-fit"
                                title="Download Demo File"
                            >
                                <FiDownload className="text-lg" />
                                <span className="hidden sm:inline">Download Demo</span>
                            </a>
                        </div>

                        <div className="mt-4 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-zinc-700">Select your bulk upload file</p>
                                    <p className="text-xs text-zinc-500 mt-1">Accepted formats: `.xlsx`, `.xls`, `.csv`</p>
                                </div>
                                <label className="inline-flex items-center justify-center gap-2 cursor-pointer rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-700 border border-zinc-300 hover:bg-zinc-100">
                                    <FiUpload className="text-sm" />
                                    <span>Choose File</span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="hidden"
                                        onChange={(e) => {
                                            setUploadFile(e.target.files?.[0] || null);
                                            setUploadSummary(null);
                                        }}
                                    />
                                </label>
                            </div>

                            {uploadFile ? (
                                <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3">
                                    <div className="flex items-start gap-3">
                                        <FiCheckCircle className="mt-0.5 text-lg text-green-600" />
                                        <div>
                                            <p className="text-sm font-semibold text-green-800">File ready for upload</p>
                                            <p className="text-sm text-zinc-700">{uploadFile.name}</p>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                {(uploadFile.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                        <CustomButton
                                            label={(
                                                <span className="inline-flex items-center gap-2">
                                                    <FiUpload className="text-sm" />
                                                    <span>{isUploading ? "Uploading..." : "Upload File"}</span>
                                                </span>
                                            )}
                                            onClick={handleBulkUpload}
                                            disabled={!uploadFile || isUploading}
                                        />
                                        <CustomButton
                                            label={(
                                                <span className="inline-flex items-center gap-2">
                                                    <FiTrash2 className="text-sm" />
                                                    <span>Remove</span>
                                                </span>
                                            )}
                                            onClick={() => {
                                                setUploadFile(null);
                                                setUploadSummary(null);
                                            }}
                                            bgColor="bg-white"
                                            textColor="text-zinc-700"
                                            className="border border-zinc-300"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 rounded-md border border-zinc-200 bg-white px-4 py-3">
                                    <p className="text-sm text-zinc-500">No file selected yet. Choose a file to continue bulk upload.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 text-sm text-zinc-600">
                            <p className="font-semibold">Required columns:</p>
                            <p>Source, Enquiry, Name, Mobile Number, State, District, Address, Pincode</p>
                        </div>

                {uploadSummary && (
                    <div className="mt-4 rounded-md border border-zinc-200 bg-white p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm font-semibold text-zinc-800">Upload Result</p>
                            <CustomButton
                                label="Upload Another File"
                                onClick={handleResetBulkUpload}
                                bgColor="bg-white"
                                textColor="text-zinc-700"
                                className="border border-zinc-300"
                            />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                                    <div className="rounded-md bg-green-50 px-4 py-3 border border-green-200">
                                        <p className="text-xs font-semibold text-green-700">Inserted</p>
                                        <p className="text-xl font-bold text-green-800 mt-1">{uploadSummary.insertedCount}</p>
                                    </div>
                                    <div className="rounded-md bg-red-50 px-4 py-3 border border-red-200">
                                        <p className="text-xs font-semibold text-red-700">Failed</p>
                                        <p className="text-xl font-bold text-red-800 mt-1">{uploadSummary.failedCount}</p>
                                    </div>
                                </div>
                                {uploadSummary.errors?.length > 0 && (
                                    <div className="mt-4 max-h-48 overflow-y-auto rounded-md border border-red-100 bg-red-50 p-3">
                                        <p className="text-sm font-semibold text-red-700 mb-2">Failed Rows</p>
                                        {uploadSummary.errors.map((item) => (
                                            <p key={`${item.row}-${item.reason}`} className="text-sm text-red-500">
                                                Row {item.row}: {item.reason}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="border border-zinc-200 bg-white px-3 md:px-6 pt-5 pb-6">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
                            <div>
                                <h3 className="title-2">Leads List</h3>
                                <p className="text-sm text-zinc-500 mt-1">Recently added leads are shown here for reading purpose.</p>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaSearch className="text-zinc-400 text-sm" />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-3 py-2 border border-zinc-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 bg-zinc-50 text-zinc-800 placeholder-zinc-400"
                                        placeholder="Search name or mobile..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <CustomButton
                                    label={isLoadingSavedLeads ? "..." : "Refresh"}
                                    onClick={fetchSavedLeads}
                                    disabled={isLoadingSavedLeads}
                                    bgColor="bg-white"
                                    textColor="text-zinc-700"
                                    className="border border-zinc-300 !py-2 shrink-0"
                                />
                            </div>
                        </div>

                        {isLoadingSavedLeads ? (
                            <div className="py-16 flex flex-col items-center justify-center text-zinc-400 text-sm font-semibold">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-800 mb-2"></div>
                                Fetching list...
                            </div>
                        ) : savedLeads.length === 0 ? (
                            <div className="py-16 text-center text-sm font-bold text-zinc-500">
                                No leads found in list.
                            </div>
                        ) : (
                            <div>
                                <div className="overflow-x-auto only-scroll-width">
                                    <table className="w-full min-w-[1100px] border-collapse border border-zinc-400">
                                        <thead>
                                            <tr className="bg-zinc-200 border-b border-zinc-300">
                                                {["S No", "Added On", "Name", "Mobile", "Source", "Enquiry", "State", "District", "Address", "Pincode", "Status"].map((head) => (
                                                    <th key={head} className="border border-zinc-400 py-3 px-3 text-left text-[11px] font-bold text-zinc-800 uppercase whitespace-nowrap">
                                                        {head}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedSavedLeads.map((lead, index) => (
                                                <tr key={lead._id || `${lead.mobileNumber}-${savedLeadsStartIndex + index}`} className="hover:bg-zinc-50 transition-colors">
                                                    <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-bold text-zinc-600 text-center bg-zinc-50/30">
                                                        {savedLeadsStartIndex + index + 1}
                                                    </td>
                                                    <td className="border border-zinc-300 py-2.5 px-3 text-[11px] font-bold text-zinc-500 whitespace-nowrap">
                                                        {lead.createdAt ? new Date(lead.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-"}
                                                    </td>
                                                    <td className="border border-zinc-300 py-2.5 px-3 min-w-40">
                                                        <a href={`tel:${lead.mobileNumber}`} className="text-[13px] font-bold text-zinc-900 capitalize hover:text-blue-600 hover:underline transition-colors w-fit">
                                                            {lead.name || "-"}
                                                        </a>
                                                    </td>
                                                    <td className="border border-zinc-300 py-2.5 px-3">
                                                        <a href={`tel:${lead.mobileNumber}`} className="text-[13px] font-bold text-zinc-700 hover:text-blue-600 hover:underline transition-colors whitespace-nowrap">
                                                            {lead.mobileNumber || "-"}
                                                        </a>
                                                    </td>
                                                    <td className="border border-zinc-300 py-2.5 px-3 text-[12px] font-semibold text-zinc-700 capitalize">
                                                        {lead.source || "-"}
                                                    </td>
                                                    <td className="border border-zinc-300 py-2.5 px-3 text-[12px] font-semibold text-zinc-700 capitalize">
                                                        {lead.enquiryType === 'wholesale/distributor' ? 'Wholesale/Distributor' : (lead.enquiryType || "-")}
                                                    </td>
                                                    <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-bold text-zinc-800 capitalize whitespace-nowrap">
                                                        {lead.state || "-"}
                                                    </td>
                                                    <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-semibold text-zinc-700 whitespace-nowrap">
                                                        {lead.district || "-"}
                                                    </td>
                                                    <td className="border border-zinc-300 py-2.5 px-3 text-[12px] text-zinc-600 max-w-64 truncate font-medium" title={lead.address}>
                                                        {lead.address || "-"}
                                                    </td>
                                                    <td className="border border-zinc-300 py-2.5 px-3 text-[13px] font-bold text-zinc-700 text-center">
                                                        {lead.pincode || "-"}
                                                    </td>
                                                    <td className="border border-zinc-300 py-2.5 px-3 text-[12px] font-semibold text-zinc-700 capitalize whitespace-nowrap">
                                                        {lead.status || "-"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-4 rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm md:flex md:items-center md:justify-between md:gap-3">
                                    <div className="flex items-center justify-between gap-2 md:flex-1">
                                        <p className="font-semibold text-zinc-600">
                                            <span className="hidden xl:inline">Showing </span>{savedLeadsFrom}-{savedLeadsTo} Of {savedLeads.length}
                                        </p>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                <label className="text-xs font-bold uppercase text-zinc-500" htmlFor="saved-leads-page-size">
                                                    Rows
                                                </label>
                                                <select
                                                    id="saved-leads-page-size"
                                                    value={savedLeadsPageSize}
                                                    onChange={handleSavedLeadsPageSizeChange}
                                                    className="h-8 rounded-sm border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-700 outline-none"
                                                >
                                                    {savedLeadPageSizeOptions.map((size) => (
                                                        <option key={size} value={size}>
                                                            {size}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <span className="rounded-sm bg-white px-2 py-1.5 text-xs font-bold text-zinc-700 border border-zinc-200 sm:text-sm">
                                                Page {savedLeadsPage} of {savedLeadsTotalPages}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-col gap-3 md:mt-0 md:flex-row md:items-center md:justify-end">
                                        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
                                            <button
                                                type="button"
                                                onClick={() => setSavedLeadsPage((page) => Math.max(1, page - 1))}
                                                disabled={savedLeadsPage === 1}
                                                className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSavedLeadsPage((page) => Math.min(savedLeadsTotalPages, page + 1))}
                                                disabled={savedLeadsPage === savedLeadsTotalPages}
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
                )}
            </div>
        </div>
    );
}
