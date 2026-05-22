import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { FaUserPlus, FaUsers, FaSearch } from "react-icons/fa";
import { FiCheckCircle, FiDownload, FiFileText, FiList, FiTrash2, FiUpload, FiEdit } from "react-icons/fi";
import CustomInput from "../../components/custom/CustomInput";
import { CustomSelect } from "../../components/custom/CustomSelect";
import CustomButton from "../../components/custom/CustomButton";
import { collection, onSnapshot, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import * as XLSX from 'xlsx';
import EditMemberModal from "../../components/members/EditMemberModal";

const memberTypeOptions = [
    { value: "", label: "Select Member Type" },
    { value: "Life Time Member", label: "Life Time Member" },
    { value: "Associate Member", label: "Associate Member" },
];

const initialFormData = {
    membershipId: "",
    name: "",
    mobileNumber: "",
    memberType: "",
    email: "",
};

const savedMemberPageSizeOptions = [5, 10, 25, 50, 100];

export default function MembersPage() {
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedMembers, setSavedMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoadingSavedMembers, setIsLoadingSavedMembers] = useState(false);
    const [savedMembersPage, setSavedMembersPage] = useState(1);
    const [savedMembersPageSize, setSavedMembersPageSize] = useState(10);
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSummary, setUploadSummary] = useState(null);
    const [activeTab, setActiveTab] = useState("normal");
    const fileInputRef = useRef(null);
    
    // Edit Member Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const isSubmitDisabled = useMemo(() => {
        return !formData.membershipId.trim()
            || !formData.name.trim()
            || formData.mobileNumber.length !== 10
            || !formData.memberType
            || Object.values(errors).some(Boolean);
    }, [errors, formData]);

    const filteredSavedMembers = useMemo(() => {
        if (!searchQuery) return savedMembers;
        const lowerQuery = searchQuery.toLowerCase();
        return savedMembers.filter((member) =>
            (member.name && member.name.toLowerCase().includes(lowerQuery)) ||
            (member.mobileNumber && member.mobileNumber.toLowerCase().includes(lowerQuery)) ||
            (member.membershipId && member.membershipId.toLowerCase().includes(lowerQuery)) ||
            (member.memberType && member.memberType.toLowerCase().includes(lowerQuery))
        );
    }, [savedMembers, searchQuery]);

    const savedMembersTotalPages = Math.max(1, Math.ceil(filteredSavedMembers.length / savedMembersPageSize));
    const savedMembersStartIndex = (savedMembersPage - 1) * savedMembersPageSize;
    const paginatedSavedMembers = filteredSavedMembers.slice(savedMembersStartIndex, savedMembersStartIndex + savedMembersPageSize);
    const savedMembersFrom = filteredSavedMembers.length === 0 ? 0 : savedMembersStartIndex + 1;
    const savedMembersTo = Math.min(savedMembersStartIndex + savedMembersPageSize, filteredSavedMembers.length);

    useEffect(() => {
        setIsLoadingSavedMembers(true);
        const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
            setSavedMembers(data);
            setIsLoadingSavedMembers(false);
        }, (error) => {
            console.error("Error fetching members:", error);
            setIsLoadingSavedMembers(false);
            toast.error("Failed to load members.");
        });
        return () => unsub();
    }, []);

    const validateField = (name, value) => {
        const trimmedValue = typeof value === "string" ? value.trim() : value;

        switch (name) {
            case "membershipId":
            case "name":
            case "memberType":
                return trimmedValue ? "" : "Field is required.";
            case "mobileNumber":
                if (!trimmedValue) return "Field is required.";
                if (!/^\d{10}$/.test(trimmedValue)) return "Mobile number must be exactly 10 digits.";
                return "";
            case "email":
                if (trimmedValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) return "Invalid email format.";
                return "";
            default:
                return "";
        }
    };

    const handleTextChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    };

    const handleNumberChange = (field, value, maxLength) => {
        const numericValue = value.replace(/\D/g, "").slice(0, maxLength);
        handleTextChange(field, numericValue);
    };

    const validateForm = () => {
        const nextErrors = {
            membershipId: validateField("membershipId", formData.membershipId),
            name: validateField("name", formData.name),
            mobileNumber: validateField("mobileNumber", formData.mobileNumber),
            memberType: validateField("memberType", formData.memberType),
            email: validateField("email", formData.email),
        };

        setErrors(nextErrors);
        return !Object.values(nextErrors).some(Boolean);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Please fill in all required fields correctly.");
            return;
        }

        try {
            setIsSubmitting(true);
            
            const existingMember = savedMembers.find(m => m.membershipId && m.membershipId.toLowerCase() === formData.membershipId.toLowerCase().trim());
            if (existingMember) {
                toast.error(`Membership ID ${formData.membershipId} already exists!`);
                setIsSubmitting(false);
                return;
            }

            const docId = formData.membershipId.trim().toUpperCase();
            const memberRef = doc(db, 'members', docId);
            
            await setDoc(memberRef, {
                membershipId: docId,
                name: formData.name.trim(),
                mobileNumber: formData.mobileNumber,
                memberType: formData.memberType,
                email: formData.email.trim(),
                status: "Active",
                createdAt: new Date().toISOString()
            });

            toast.success("Member added successfully!");
            setFormData(initialFormData);
            setErrors({});
            setActiveTab("saved");
        } catch (error) {
            console.error("Failed to create member:", error);
            toast.error(`Failed to create member: ${error.message || error}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadDemo = () => {
        const worksheetData = [
            ["Membership ID", "Name", "Member Type", "Mobile Number", "Email"],
            ["TCWA1001", "John Doe", "Life Time Member", "9876543210", "john@example.com"],
            ["TCWA1002", "Jane Smith", "Associate Member", "9876543211", "jane@example.com"],
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        
        const wscols = [
            { wch: 15 }, // Membership ID
            { wch: 20 }, // Name
            { wch: 20 }, // Member Type
            { wch: 15 }, // Mobile Number
            { wch: 25 }, // Email
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Members_Demo");

        XLSX.writeFile(workbook, "TCWA_Members_Bulk_Upload_Demo.xlsx");
    };

    const handleBulkUpload = async () => {
        if (!uploadFile) {
            toast.info("Please choose an Excel file first.");
            return;
        }
        setIsUploading(true);

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    let insertedCount = 0;
                    let failedCount = 0;
                    let errorsList = [];
                    
                    // Keep track of IDs processed in this batch to prevent duplicates
                    const processedIds = new Set();

                    for (let i = 0; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        const rowNum = i + 2; // +1 for 0-index, +1 for header
                        
                        try {
                            const membershipId = (row["Membership ID"] || "").toString().trim().toUpperCase();
                            const name = (row["Name"] || "").toString().trim();
                            const memberType = (row["Member Type"] || "").toString().trim();
                            const mobileNumber = (row["Mobile Number"] || "").toString().trim().replace(/\D/g, "");
                            const email = (row["Email"] || "").toString().trim();

                            if (!membershipId || !name || !memberType || !mobileNumber) {
                                throw new Error("Missing required fields (Membership ID, Name, Member Type, or Mobile Number)");
                            }
                            if (mobileNumber.length !== 10) {
                                throw new Error("Mobile Number must be 10 digits");
                            }
                            if (memberType !== "Life Time Member" && memberType !== "Associate Member") {
                                throw new Error("Invalid Member Type (Must be 'Life Time Member' or 'Associate Member')");
                            }

                            if (processedIds.has(membershipId)) {
                                throw new Error(`Duplicate Membership ID ${membershipId} in the Excel file`);
                            }

                            if (savedMembers.some(m => m.membershipId === membershipId)) {
                                throw new Error(`Membership ID ${membershipId} already exists in database`);
                            }

                            processedIds.add(membershipId);

                            const memberRef = doc(db, 'members', membershipId);
                            await setDoc(memberRef, {
                                membershipId,
                                name,
                                mobileNumber,
                                memberType,
                                email,
                                status: "Active",
                                createdAt: new Date().toISOString()
                            });
                            insertedCount++;
                        } catch (err) {
                            failedCount++;
                            errorsList.push({ row: rowNum, reason: err.message });
                        }
                    }

                    setUploadSummary({ insertedCount, failedCount, errors: errorsList });
                    
                    if (insertedCount > 0 && failedCount === 0) {
                        toast.success(`Bulk upload completed. Inserted: ${insertedCount}`);
                    } else if (insertedCount > 0 && failedCount > 0) {
                        toast.warning(`Bulk upload partially completed. Inserted: ${insertedCount}, Failed: ${failedCount}`);
                    } else {
                        toast.error(`Bulk upload failed. Failed rows: ${failedCount}`);
                    }

                    setUploadFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    if (insertedCount > 0) setActiveTab("saved");

                } catch (err) {
                    toast.error("Failed to parse Excel file. Ensure it is a valid format.");
                    console.error(err);
                } finally {
                    setIsUploading(false);
                }
            };
            reader.readAsArrayBuffer(uploadFile);
        } catch (error) {
            toast.error(`An error occurred during file upload: ${error.message || error}`);
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

    const handleSavedMembersPageSizeChange = (e) => {
        setSavedMembersPageSize(Number(e.target.value));
        setSavedMembersPage(1);
    };

    const handleSaveEdit = async (membershipId, updatedFields) => {
        setIsSavingEdit(true);
        try {
            const memberRef = doc(db, 'members', membershipId);
            await setDoc(memberRef, updatedFields, { merge: true });
            toast.success(`Member ${membershipId} updated successfully!`);
            setIsEditModalOpen(false);
            setSelectedMember(null);
        } catch (error) {
            console.error("Failed to update member:", error);
            toast.error(`Failed to update member: ${error.message || error}`);
        } finally {
            setIsSavingEdit(false);
        }
    };

    return (
        <div className="pb-4">
            <div className="flex items-center gap-2 ms-1 mb-4">
                <FaUsers className="text-xl md:text-2xl text-zinc-700 -mt-0.5" />
                <h2 className="text-xl font-bold">TCWA Members Management</h2>
            </div>

            <div className="w-full mt-3">
                <div className="flex overflow-x-auto only-scroll-width md:grid md:grid-cols-3 shadow-sm rounded-t-md">
                    <div className="min-w-36 flex-1 border-b border-zinc-200 md:min-w-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab("normal")}
                            className={`w-full px-4 py-3 text-sm font-semibold transition text-center cursor-pointer whitespace-nowrap ${activeTab === "normal"
                                ? "bg-white text-zinc-900 border border-zinc-300 border-b-white -mb-px rounded-tl-md"
                                : "bg-zinc-50 text-zinc-500 border border-transparent hover:text-zinc-700 rounded-tl-md"
                                }`}
                        >
                            <span className="inline-flex items-center gap-2">
                                <FaUserPlus className="text-sm" />
                                <span>Single Add</span>
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
                                <span>Bulk Import</span>
                            </span>
                        </button>
                    </div>
                    <div className="min-w-36 flex-1 border-b border-zinc-200 md:min-w-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab("saved")}
                            className={`w-full px-4 py-3 text-sm font-semibold transition text-center cursor-pointer whitespace-nowrap ${activeTab === "saved"
                                ? "bg-white text-zinc-900 border border-zinc-300 border-b-white -mb-px rounded-tr-md"
                                : "bg-zinc-50 text-zinc-500 border border-transparent hover:text-zinc-700 rounded-tr-md"
                                }`}
                        >
                            <span className="inline-flex items-center gap-2">
                                <FiList className="text-sm" />
                                <span>Members List</span>
                            </span>
                        </button>
                    </div>
                </div>

                {activeTab === "normal" ? (
                    <form onSubmit={handleSubmit} className="border border-zinc-200 border-t-0 bg-white px-6 md:px-10 pt-6 md:pt-8 pb-7 md:pb-10 rounded-b-md shadow-sm">
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5">
                                <div>
                                    <CustomInput
                                        label="Membership ID *"
                                        value={formData.membershipId}
                                        onChange={(e) => handleTextChange("membershipId", e.target.value.toUpperCase())}
                                        placeholder="e.g. TCWA1234"
                                        error={errors.membershipId}
                                    />
                                </div>
                                <div>
                                    <CustomInput
                                        label="Member Name *"
                                        value={formData.name}
                                        onChange={(e) => handleTextChange("name", e.target.value)}
                                        placeholder="Enter member's full name"
                                        error={errors.name}
                                    />
                                </div>
                                <div>
                                    <CustomSelect
                                        label="Member Type *"
                                        dropdownData={memberTypeOptions}
                                        value={formData.memberType}
                                        onChange={(value) => handleTextChange("memberType", value)}
                                        error={errors.memberType}
                                    />
                                </div>
                                <div>
                                    <CustomInput
                                        label="Mobile Number *"
                                        value={formData.mobileNumber}
                                        onChange={(e) => handleNumberChange("mobileNumber", e.target.value, 10)}
                                        placeholder="Enter 10-digit mobile number"
                                        error={errors.mobileNumber}
                                    />
                                </div>
                                <div>
                                    <CustomInput
                                        label="Email Address (Optional)"
                                        value={formData.email}
                                        onChange={(e) => handleTextChange("email", e.target.value)}
                                        placeholder="Enter email address"
                                        error={errors.email}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end mt-8 border-t border-gray-100 pt-5">
                                <CustomButton
                                    type="submit"
                                    label={isSubmitting ? "Adding Member..." : "Add Member"}
                                    className="min-w-40"
                                    disabled={isSubmitDisabled || isSubmitting}
                                />
                            </div>
                        </div>
                    </form>
                ) : activeTab === "bulk" ? (
                    <div className="border border-zinc-200 border-t-0 bg-white px-6 md:px-10 pt-6 md:pt-8 pb-7 md:pb-10 rounded-b-md shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold">Bulk Members Import</h3>
                                <p className="text-sm text-zinc-500 mt-1">Upload `.xlsx`, `.xls`, or `.csv` file using the exact template columns.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleDownloadDemo}
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700 border border-zinc-300 hover:bg-zinc-200 transition-colors w-fit"
                            >
                                <FiDownload className="text-lg" />
                                <span className="hidden sm:inline">Download Demo</span>
                            </button>
                        </div>

                        <div className="mt-4 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6">
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
                                <div className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-4">
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
                                <div className="mt-5 rounded-md border border-zinc-200 bg-white px-4 py-3">
                                    <p className="text-sm text-zinc-500">No file selected yet. Choose a file to continue bulk upload.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 text-sm text-zinc-600">
                            <p className="font-semibold">Required columns:</p>
                            <p className="bg-zinc-100 p-2 rounded mt-1 border border-zinc-200">Membership ID, Name, Member Type, Mobile Number, Email</p>
                        </div>

                        {uploadSummary && (
                            <div className="mt-5 rounded-md border border-zinc-200 bg-white p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-3">
                                    <p className="text-sm font-bold text-zinc-800">Upload Results Summary</p>
                                    <CustomButton
                                        label="Reset Upload"
                                        onClick={handleResetBulkUpload}
                                        bgColor="bg-white"
                                        textColor="text-zinc-700"
                                        className="border border-zinc-300"
                                    />
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-3 max-w-md">
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
                                    <div className="mt-4 max-h-60 overflow-y-auto rounded-md border border-red-100 bg-red-50 p-3.5">
                                        <p className="text-sm font-bold text-red-800 mb-2">Failed Rows & Error Details</p>
                                        <div className="space-y-1.5">
                                            {uploadSummary.errors.map((item, idx) => (
                                                <p key={`${item.row}-${idx}`} className="text-xs font-medium text-red-600">
                                                    Row {item.row}: {item.reason}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="border border-zinc-200 border-t-0 bg-white px-3 md:px-6 pt-5 pb-6 rounded-b-md shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold">TCWA Members List</h3>
                                <p className="text-sm text-zinc-500 mt-1">Database of all Life Time and Associate Members.</p>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaSearch className="text-zinc-400 text-sm" />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-3 py-2 border border-zinc-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 bg-zinc-50 text-zinc-800 placeholder-zinc-400"
                                        placeholder="Search by ID, Name or Mobile..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {isLoadingSavedMembers ? (
                            <div className="py-16 flex flex-col items-center justify-center text-zinc-400 text-sm font-semibold">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-800 mb-2"></div>
                                Fetching list...
                            </div>
                        ) : savedMembers.length === 0 ? (
                            <div className="py-16 text-center text-sm font-bold text-zinc-500 border border-dashed border-gray-200 rounded">
                                No members found in the database.
                            </div>
                        ) : (
                            <div>
                                <div className="overflow-x-auto only-scroll-width">
                                    <table className="w-full min-w-[900px] border-collapse border border-zinc-200">
                                        <thead>
                                            <tr className="bg-zinc-100 border-b border-zinc-200">
                                                {["S No", "Membership ID", "Name", "Member Type", "Mobile", "Email", "Added On", "Status", "Actions"].map((head) => (
                                                    <th key={head} className="border border-zinc-200 py-3 px-3 text-left text-xs font-bold text-zinc-600 uppercase whitespace-nowrap">
                                                        {head}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedSavedMembers.map((member, index) => (
                                                <tr key={member._id} className="hover:bg-zinc-50 transition-colors">
                                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-bold text-zinc-600 text-center bg-zinc-50/30 w-12">
                                                        {savedMembersStartIndex + index + 1}
                                                    </td>
                                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-bold text-blue-700 whitespace-nowrap w-32">
                                                        {member.membershipId}
                                                    </td>
                                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-bold text-zinc-800 capitalize min-w-[150px]">
                                                        {member.name}
                                                    </td>
                                                    <td className="border border-zinc-200 py-2.5 px-3 text-[12px] font-semibold text-zinc-700 w-36">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${member.memberType === 'Life Time Member' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {member.memberType === 'Life Time Member' ? 'Life Time' : 'Associate'}
                                                        </span>
                                                    </td>
                                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-semibold text-zinc-700 whitespace-nowrap w-28">
                                                        {member.mobileNumber}
                                                    </td>
                                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-medium text-zinc-600 min-w-[150px]">
                                                        {member.email || "-"}
                                                    </td>
                                                    <td className="border border-zinc-200 py-2.5 px-3 text-[11px] font-semibold text-zinc-500 whitespace-nowrap w-32">
                                                        {member.createdAt ? new Date(member.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-"}
                                                    </td>
                                                    <td className="border border-zinc-200 py-2.5 px-3 w-28 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${member.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {member.status || "Active"}
                                                        </span>
                                                    </td>
                                                    <td className="border border-zinc-200 py-2.5 px-3 w-24 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedMember(member);
                                                                setIsEditModalOpen(true);
                                                            }}
                                                            className="inline-flex items-center gap-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2 py-1 text-xs font-semibold border border-zinc-300 transition-colors cursor-pointer"
                                                        >
                                                            <FiEdit className="text-[10px]" />
                                                            <span>Edit</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm md:flex md:items-center md:justify-between md:gap-3">
                                    <div className="flex items-center justify-between gap-2 md:flex-1">
                                        <p className="font-semibold text-zinc-600">
                                            <span className="hidden xl:inline">Showing </span>{savedMembersFrom}-{savedMembersTo} Of {filteredSavedMembers.length}
                                        </p>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                <label className="text-xs font-bold uppercase text-zinc-500" htmlFor="saved-members-page-size">
                                                    Rows
                                                </label>
                                                <select
                                                    id="saved-members-page-size"
                                                    value={savedMembersPageSize}
                                                    onChange={handleSavedMembersPageSizeChange}
                                                    className="h-8 rounded-sm border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-700 outline-none"
                                                >
                                                    {savedMemberPageSizeOptions.map((size) => (
                                                        <option key={size} value={size}>
                                                            {size}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <span className="rounded-sm bg-white px-2 py-1.5 text-xs font-bold text-zinc-700 border border-zinc-200 sm:text-sm">
                                                Page {savedMembersPage} of {savedMembersTotalPages}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-col gap-3 md:mt-0 md:flex-row md:items-center md:justify-end">
                                        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
                                            <button
                                                type="button"
                                                onClick={() => setSavedMembersPage((page) => Math.max(1, page - 1))}
                                                disabled={savedMembersPage === 1}
                                                className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSavedMembersPage((page) => Math.min(savedMembersTotalPages, page + 1))}
                                                disabled={savedMembersPage === savedMembersTotalPages}
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

            <EditMemberModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedMember(null);
                }}
                member={selectedMember}
                onSave={handleSaveEdit}
                loading={isSavingEdit}
            />
        </div>
    );
}
