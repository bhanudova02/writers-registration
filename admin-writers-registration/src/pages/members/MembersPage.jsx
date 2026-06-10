import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FaUserPlus, FaUsers, FaSearch, FaDownload } from "react-icons/fa";
import { FiEdit, FiList } from "react-icons/fi";
import { jsPDF } from "jspdf";
import CustomInput from "../../components/custom/CustomInput";
import CustomTextArea from "../../components/custom/CustomTextArea";
import { CustomSelect } from "../../components/custom/CustomSelect";
import CustomButton from "../../components/custom/CustomButton";
import { collection, onSnapshot, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { logAdminActivity } from '../../lib/logger';
import EditMemberModal from "../../components/members/EditMemberModal";
import ViewMemberModal from "../../components/members/ViewMemberModal";
import SendMemberMessageModal from "../../components/members/SendMemberMessageModal";
import { TableSkeleton } from "../../components/Skeletons";
import { FaPaperPlane } from "react-icons/fa";

const memberTypeOptions = [
    { value: "", label: "Select Member Type" },
    { value: "Life Time Member", label: "Life Time Member" },
    { value: "Associate Member", label: "Associate Member" },
];

const initialFormData = {
    membershipId: "",
    name: "",
    surname: "",
    dateOfJoining: "",
    dateOfBirth: "",
    qualification: "",
    bloodGroup: "",
    mobileNumber: "",
    email: "",
    aadharNo: "",
    panCardNo: "",
    nomineeName: "",
    nomineeRelation: "",
    nomineeAadharNo: "",
    permanentAddress: "",
    temporaryAddress: "",
    memberType: "",
    // New Fields
    joiningFeeAmount: "",
    joiningFeeReceiptNo: "",
    joiningFeeDDNoBank: "",
    titleCardMovieDetails: "",
    amToLmFeeAmount: "",
    amToLmFeeReceiptNo: "",
    amToLmFeeDDNoBank: "",
    changeToLifeMemberDate: "",
    alternateMobileNumber: "",
};

const calculateExpiryDate = (member) => {
    if (!member) return null;
    let joiningDateStr = member.dateOfJoining || member.createdAt;
    if (!joiningDateStr) return null;
    let joiningDate = typeof joiningDateStr.toDate === 'function' ? joiningDateStr.toDate() : new Date(joiningDateStr);
    if (isNaN(joiningDate.getTime())) return null;
    
    let refDateStr = member.lastRenewalDate || member.dateOfJoining || member.createdAt;
    let refDate = typeof refDateStr.toDate === 'function' ? refDateStr.toDate() : new Date(refDateStr);
    if (isNaN(refDate.getTime())) return null;
    
    let expiryDate = new Date(joiningDate);
    expiryDate.setFullYear(refDate.getFullYear());
    if (expiryDate <= refDate) {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }
    return expiryDate;
};

const getComputedStatus = (member) => {
    let status = member.status || "Active";
    let daysRemaining = Infinity;
    const expDate = calculateExpiryDate(member);

    if (member.memberType === "Associate Member" && expDate) {
        const now = new Date();
        const diffTime = expDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (status === "Disabled" || (daysRemaining !== Infinity && daysRemaining <= -1095)) {
        return "Disabled";
    } else if (status === "Inactive" || (daysRemaining !== Infinity && daysRemaining <= 0)) {
        return "Inactive";
    } else if (member.memberType === "Life Time Member" || member.memberType === "Life Member" || member.memberType === "Life Time") {
        return "Life Member";
    } else {
        return "Active";
    }
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
    const [activeTab, setActiveTab] = useState("normal");
    const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    
    // View Member Modal States
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewMember, setViewMember] = useState(null);

    // Message Modal States
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [messageMember, setMessageMember] = useState(null);

    const isSubmitDisabled = useMemo(() => {
        return !(formData.membershipId || "").trim()
            || !(formData.name || "").trim()
            || !(formData.surname || "").trim()
            || !formData.dateOfJoining
            || !formData.memberType
            || !(formData.email || "").trim()
            || !(formData.permanentAddress || "").trim()
            || (formData.mobileNumber || "").length !== 10
            || (formData.alternateMobileNumber && formData.alternateMobileNumber.length !== 10)
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

    const toggleSelectAll = () => {
        const allFilteredIds = filteredSavedMembers.map(m => m._id);
        const hasAllSelected = allFilteredIds.every(id => selectedMemberIds.has(id));
        
        const newSelected = new Set(selectedMemberIds);
        if (hasAllSelected) {
            allFilteredIds.forEach(id => newSelected.delete(id));
        } else {
            allFilteredIds.forEach(id => newSelected.add(id));
        }
        setSelectedMemberIds(newSelected);
    };

    const toggleSelectMember = (memberId) => {
        const newSelected = new Set(selectedMemberIds);
        if (newSelected.has(memberId)) {
            newSelected.delete(memberId);
        } else {
            newSelected.add(memberId);
        }
        setSelectedMemberIds(newSelected);
    };

    // Reset selection when search query changes
    useEffect(() => {
        setSelectedMemberIds(new Set());
    }, [searchQuery]);

    const downloadMembersListPDF = async () => {
        const membersToPrint = selectedMemberIds.size > 0 
            ? filteredSavedMembers.filter(m => selectedMemberIds.has(m._id))
            : filteredSavedMembers;

        if (membersToPrint.length === 0) {
            toast.info("No members available to print.");
            return;
        }

        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        const headers = ["S No", "Membership ID", "Name", "Member Type", "Mobile", "Email", "Joined On", "Status"];
        const colWidths = [15, 35, 45, 35, 30, 60, 30, 20];
        const startX = 13.5;
        
        let yPos = 45;
        let currentPage = 1;

        const drawPageHeader = (pageNumber) => {
            doc.setDrawColor(0, 0, 150);
            doc.setLineWidth(0.5);
            doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

            doc.setTextColor(0, 0, 150);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("TELUGU CINE WRITERS' ASSOCIATION", pageWidth / 2, 18, { align: "center" });

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text("(Regd. No. A741, Registered under Trade Union Act, 1926, Affiliated to T.S.F.I.E.F.)", pageWidth / 2, 22, { align: "center" });

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text("TCWA MEMBERS DIRECTORY LIST", pageWidth / 2, 30, { align: "center" });
            
            let currentX = startX;
            doc.setFillColor(240, 240, 240);
            doc.rect(startX, 37, 270, 8, "F");
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.2);
            doc.rect(startX, 37, 270, 8, "D");
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(50, 50, 50);
            
            headers.forEach((header, index) => {
                if (index === 0) {
                    doc.text(header, currentX + colWidths[index] / 2, 42.5, { align: "center" });
                } else {
                    doc.text(header, currentX + 3, 42.5);
                }
                currentX += colWidths[index];
            });

            currentX = startX;
            colWidths.forEach((width) => {
                doc.line(currentX, 37, currentX, 45);
                currentX += width;
            });
            doc.line(currentX, 37, currentX, 45);

            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.setFont("helvetica", "normal");
            doc.text(`Page ${pageNumber}`, pageWidth - 15, pageHeight - 13, { align: "right" });
            doc.text(`Generated on: ${new Date().toLocaleDateString("en-GB")} | Total Members: ${membersToPrint.length}`, 15, pageHeight - 13);
        };

        // Try preloading logo
        try {
            const logoImg = new Image();
            logoImg.src = '/Logo.png';
            await new Promise((resolve) => {
                logoImg.onload = resolve;
                logoImg.onerror = resolve;
            });
        } catch (e) {}

        drawPageHeader(currentPage);

        membersToPrint.forEach((member, index) => {
            if (yPos > pageHeight - 22) {
                doc.addPage();
                currentPage++;
                drawPageHeader(currentPage);
                yPos = 45;
            }

            doc.setDrawColor(220, 220, 220);
            doc.rect(startX, yPos, 270, 8, "D");

            doc.setFontSize(8.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 30, 30);

            let joinedDate = "-";
            if (member.dateOfJoining) {
                const jDate = new Date(member.dateOfJoining);
                joinedDate = isNaN(jDate.getTime()) ? String(member.dateOfJoining) : jDate.toLocaleDateString("en-GB");
            } else if (member.createdAt) {
                const cDate = new Date(member.createdAt);
                joinedDate = isNaN(cDate.getTime()) ? "-" : cDate.toLocaleDateString("en-GB");
            }

            const memberTypeDisplay = (member.memberType === "Life Time Member" || member.memberType === "Life Member" || member.memberType === "Life Time") 
                ? "Life Time" 
                : "Associate";

            const rowData = [
                String(index + 1),
                member.membershipId || "-",
                member.name || "-",
                memberTypeDisplay,
                member.mobileNumber || "-",
                member.email || "-",
                joinedDate,
                member.status || "Active"
            ];

            let currentX = startX;
            rowData.forEach((val, colIdx) => {
                let cleanVal = String(val);
                const maxChars = colIdx === 5 ? 35 : (colIdx === 2 ? 22 : 30);
                if (cleanVal.length > maxChars) {
                    cleanVal = cleanVal.substring(0, maxChars - 3) + "...";
                }
                
                if (colIdx === 0) {
                    doc.text(cleanVal, currentX + colWidths[colIdx] / 2, yPos + 5.5, { align: "center" });
                } else {
                    doc.text(cleanVal, currentX + 3, yPos + 5.5);
                }
                currentX += colWidths[colIdx];
            });

            currentX = startX;
            colWidths.forEach((width) => {
                doc.line(currentX, yPos, currentX, yPos + 8);
                currentX += width;
            });
            doc.line(currentX, yPos, currentX, yPos + 8);

            yPos += 8;
        });

        doc.save(`TCWA_Members_List_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.pdf`);
    };

    useEffect(() => {
        setIsLoadingSavedMembers(true);
        const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => {
                const docData = doc.data();
                return { 
                    _id: doc.id, 
                    ...docData, 
                    status: getComputedStatus(docData) 
                };
            });
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
            case "surname":
            case "dateOfJoining":
            case "memberType":
            case "permanentAddress":
                return trimmedValue ? "" : "Field is required.";
            case "mobileNumber":
                if (!trimmedValue) return "Field is required.";
                if (!/^\d{10}$/.test(trimmedValue)) return "Mobile number must be exactly 10 digits.";
                return "";
            case "aadharNo":
            case "nomineeAadharNo":
                if (trimmedValue && !/^\d{12}$/.test(trimmedValue)) return "Aadhar number must be exactly 12 digits.";
                return "";
            case "panCardNo":
                if (trimmedValue && !/^[A-Za-z]{5}\d{4}[A-Za-z]{1}$/.test(trimmedValue)) return "Invalid PAN format.";
                return "";
            case "email":
                if (!trimmedValue) return "Field is required.";
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) return "Invalid email format.";
                return "";
            default:
                return "";
        }
    };

    const handleTextChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({
            ...prev,
            [field]: validateField(field, value),
        }));
    };

    const handleNumberChange = (field, value, maxLength) => {
        let numericValue = value.replace(/\D/g, "");
        
        if (field === "mobileNumber") {
            if (numericValue.length > 10 && numericValue.startsWith("91")) {
                numericValue = numericValue.substring(2);
            } else if (numericValue.length > 10 && numericValue.startsWith("0")) {
                numericValue = numericValue.substring(1);
            }
        }
        
        numericValue = numericValue.slice(0, maxLength);
        handleTextChange(field, numericValue);
    };

    const validateForm = () => {
        const nextErrors = {
            membershipId: validateField("membershipId", formData.membershipId),
            name: validateField("name", formData.name),
            surname: validateField("surname", formData.surname),
            dateOfJoining: validateField("dateOfJoining", formData.dateOfJoining),
            dateOfBirth: validateField("dateOfBirth", formData.dateOfBirth),
            qualification: validateField("qualification", formData.qualification),
            bloodGroup: validateField("bloodGroup", formData.bloodGroup),
            mobileNumber: validateField("mobileNumber", formData.mobileNumber),
            email: validateField("email", formData.email),
            aadharNo: validateField("aadharNo", formData.aadharNo),
            panCardNo: validateField("panCardNo", formData.panCardNo),
            nomineeName: validateField("nomineeName", formData.nomineeName),
            nomineeRelation: validateField("nomineeRelation", formData.nomineeRelation),
            nomineeAadharNo: validateField("nomineeAadharNo", formData.nomineeAadharNo),
            permanentAddress: validateField("permanentAddress", formData.permanentAddress),
            temporaryAddress: validateField("temporaryAddress", formData.temporaryAddress),
            memberType: validateField("memberType", formData.memberType),
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
            
            const isSelfNominee = formData.aadharNo && formData.nomineeAadharNo && formData.aadharNo === formData.nomineeAadharNo;
            if (isSelfNominee) {
                toast.error("Member Aadhar and Nominee Aadhar cannot be the same.");
                setIsSubmitting(false);
                return;
            }

            const existingMember = savedMembers.find(m => m.membershipId && m.membershipId.toLowerCase() === formData.membershipId.toLowerCase().trim());
            if (existingMember) {
                toast.error(`Membership ID ${formData.membershipId} already exists!`);
                setIsSubmitting(false);
                return;
            }

            const existingAadhar = savedMembers.find(m => m.aadharNo === formData.aadharNo);
            if (existingAadhar) {
                toast.error(`Aadhar Number is already registered to Member ID: ${existingAadhar.membershipId}`);
                setIsSubmitting(false);
                return;
            }

            const existingPan = savedMembers.find(m => m.panCardNo && m.panCardNo.toUpperCase() === formData.panCardNo.toUpperCase().trim());
            if (existingPan) {
                toast.error(`PAN Card Number is already registered to Member ID: ${existingPan.membershipId}`);
                setIsSubmitting(false);
                return;
            }

            const existingMobile = savedMembers.find(m => m.mobileNumber === formData.mobileNumber);
            if (existingMobile) {
                toast.error(`Mobile Number is already registered to Member ID: ${existingMobile.membershipId}`);
                setIsSubmitting(false);
                return;
            }

            const docId = formData.membershipId.trim().toUpperCase();
            const memberRef = doc(db, 'members', docId);
            const createdAt = new Date();
            
            const joiningDate = formData.dateOfJoining ? new Date(formData.dateOfJoining) : new Date();
            const validityYears = formData.memberType === "Associate Member" ? 1 : null;
            const validityExpiresAt = validityYears ? new Date(new Date(joiningDate).setFullYear(joiningDate.getFullYear() + validityYears)).toISOString() : null;
            
            await setDoc(memberRef, {
                membershipId: docId,
                name: (formData.name || "").trim(),
                surname: (formData.surname || "").trim(),
                dateOfJoining: formData.dateOfJoining || "",
                dateOfBirth: formData.dateOfBirth || "",
                qualification: (formData.qualification || "").trim(),
                bloodGroup: (formData.bloodGroup || "").trim(),
                mobileNumber: formData.mobileNumber || "",
                email: (formData.email || "").trim(),
                aadharNo: formData.aadharNo || "",
                panCardNo: (formData.panCardNo || "").trim().toUpperCase(),
                nomineeName: (formData.nomineeName || "").trim(),
                nomineeRelation: (formData.nomineeRelation || "").trim(),
                nomineeAadharNo: formData.nomineeAadharNo || "",
                permanentAddress: (formData.permanentAddress || "").trim(),
                temporaryAddress: (formData.temporaryAddress || "").trim(),
                memberType: formData.memberType || "",
                validityYears,
                validityExpiresAt,
                status: "Active",
                createdAt: createdAt.toISOString(),
                joiningFeeAmount: (formData.joiningFeeAmount || "").trim(),
                joiningFeeReceiptNo: (formData.joiningFeeReceiptNo || "").trim(),
                joiningFeeDDNoBank: (formData.joiningFeeDDNoBank || "").trim(),
                titleCardMovieDetails: (formData.titleCardMovieDetails || "").trim(),
                amToLmFeeAmount: (formData.amToLmFeeAmount || "").trim(),
                amToLmFeeReceiptNo: (formData.amToLmFeeReceiptNo || "").trim(),
                amToLmFeeDDNoBank: (formData.amToLmFeeDDNoBank || "").trim(),
                changeToLifeMemberDate: formData.changeToLifeMemberDate || "",
                alternateMobileNumber: formData.alternateMobileNumber || ""
            });

            const adminEmail = auth.currentUser?.email || JSON.parse(sessionStorage.getItem('employee_admin'))?.email || "Unknown Admin";
            await logAdminActivity(adminEmail, "Add Member", `Added new member: ${docId} - ${formData.name.trim()}`);

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



    const handleSaveEdit = async (membershipId, updatedFields) => {
        setIsSavingEdit(true);
        try {
            const isSelfNominee = updatedFields.aadharNo && updatedFields.nomineeAadharNo && updatedFields.aadharNo === updatedFields.nomineeAadharNo;
            if (isSelfNominee) {
                toast.error("Member Aadhar and Nominee Aadhar cannot be the same.");
                setIsSavingEdit(false);
                return;
            }

            const existingAadhar = savedMembers.find(m => m.aadharNo === updatedFields.aadharNo && m.membershipId !== membershipId);
            if (existingAadhar) {
                toast.error(`Aadhar Number is already registered to Member ID: ${existingAadhar.membershipId}`);
                setIsSavingEdit(false);
                return;
            }

            const existingPan = savedMembers.find(m => m.panCardNo && m.panCardNo.toUpperCase() === updatedFields.panCardNo.toUpperCase().trim() && m.membershipId !== membershipId);
            if (existingPan) {
                toast.error(`PAN Card Number is already registered to Member ID: ${existingPan.membershipId}`);
                setIsSavingEdit(false);
                return;
            }

            const existingMobile = savedMembers.find(m => m.mobileNumber === updatedFields.mobileNumber && m.membershipId !== membershipId);
            if (existingMobile) {
                toast.error(`Mobile Number is already registered to Member ID: ${existingMobile.membershipId}`);
                setIsSavingEdit(false);
                return;
            }

            const currentMember = savedMembers.find(m => m.membershipId === membershipId);
            const isOldLife = currentMember ? (currentMember.memberType === "Life Time Member" || currentMember.memberType === "Life Member" || currentMember.memberType === "Life Time") : false;
            const isNewLife = updatedFields.memberType === "Life Time Member" || updatedFields.memberType === "Life Member" || updatedFields.memberType === "Life Time";
            
            let upgradeToLifeHistory = currentMember?.upgradeToLifeHistory || [];
            let downgradeToAssociateHistory = currentMember?.downgradeToAssociateHistory || [];
            const currentDate = new Date().toISOString();
            
            if (currentMember && updatedFields.memberType && updatedFields.memberType !== currentMember.memberType) {
                if (!isOldLife && isNewLife) {
                    upgradeToLifeHistory = [...upgradeToLifeHistory, currentDate];
                } else if (isOldLife && !isNewLife) {
                    downgradeToAssociateHistory = [...downgradeToAssociateHistory, currentDate];
                }
            }

            const mergedMember = { ...currentMember, ...updatedFields };
            
            let validityExpiresAt = null;
            if (mergedMember.memberType === "Associate Member") {
                let joiningDateStr = mergedMember.dateOfJoining || mergedMember.createdAt;
                if (joiningDateStr) {
                    let joiningDate = new Date(joiningDateStr);
                    if (!isNaN(joiningDate.getTime())) {
                        let refDateStr = mergedMember.lastRenewalDate || mergedMember.dateOfJoining || mergedMember.createdAt;
                        let refDate = new Date(refDateStr);
                        if (!isNaN(refDate.getTime())) {
                            let expiryDate = new Date(joiningDate);
                            expiryDate.setFullYear(refDate.getFullYear());
                            if (expiryDate <= refDate) {
                                expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                            }
                            validityExpiresAt = expiryDate.toISOString();
                        }
                    }
                }
            }

            const memberRef = doc(db, 'members', membershipId);
            await setDoc(memberRef, { ...updatedFields, upgradeToLifeHistory, downgradeToAssociateHistory, validityExpiresAt }, { merge: true });
            
            const adminEmail = auth.currentUser?.email || JSON.parse(sessionStorage.getItem('employee_admin'))?.email || "Unknown Admin";
            await logAdminActivity(adminEmail, "Edit Member", `Updated member profile: ${membershipId}`);

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
        <div className="p-3 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <FaUsers className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                <h1 className="text-base sm:text-xl font-bold text-gray-800">TCWA Members Management</h1>
            </div>

            <div className="w-full mt-3">
                <div className="flex overflow-x-auto only-scroll-width md:grid md:grid-cols-2 shadow-sm rounded-t-md">
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
                            <div className="mb-8 bg-zinc-50/50 p-5 rounded-md border border-zinc-200">
                                <h3 className="text-[13px] font-black text-zinc-800 mb-5 uppercase tracking-wide border-b border-zinc-200 pb-2">1. Personal Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5">
                                    <CustomInput
                                        label="Full Name *"
                                        value={formData.name}
                                        onChange={(e) => handleTextChange("name", e.target.value)}
                                        placeholder="Enter member's full name"
                                        error={errors.name}
                                    />
                                    <CustomInput
                                        label="Surname *"
                                        value={formData.surname}
                                        onChange={(e) => handleTextChange("surname", e.target.value)}
                                        placeholder="Enter surname"
                                        error={errors.surname}
                                    />
                                    <CustomInput
                                        label="Date of Birth (dd/mm/yyyy)"
                                        type="date"
                                        value={formData.dateOfBirth}
                                        onChange={(e) => handleTextChange("dateOfBirth", e.target.value)}
                                        error={errors.dateOfBirth}
                                    />
                                    <CustomInput
                                        label="Qualification"
                                        value={formData.qualification}
                                        onChange={(e) => handleTextChange("qualification", e.target.value)}
                                        placeholder="Enter qualification"
                                        error={errors.qualification}
                                    />
                                    <CustomInput
                                        label="Blood Group"
                                        value={formData.bloodGroup}
                                        onChange={(e) => handleTextChange("bloodGroup", e.target.value)}
                                        placeholder="e.g. O+"
                                        error={errors.bloodGroup}
                                    />
                                </div>
                            </div>

                            <div className="mb-8 bg-zinc-50/50 p-5 rounded-md border border-zinc-200">
                                <h3 className="text-[13px] font-black text-zinc-800 mb-5 uppercase tracking-wide border-b border-zinc-200 pb-2">2. Contact & Identity</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5">
                                    <CustomInput
                                        label="Mobile Number *"
                                        value={formData.mobileNumber}
                                        onChange={(e) => handleNumberChange("mobileNumber", e.target.value, 10)}
                                        placeholder="Enter 10-digit mobile number"
                                        error={errors.mobileNumber}
                                    />
                                    <CustomInput
                                        label="Alternate Mobile Number"
                                        value={formData.alternateMobileNumber}
                                        onChange={(e) => handleNumberChange("alternateMobileNumber", e.target.value, 10)}
                                        placeholder="Enter 10-digit number"
                                        error={errors.alternateMobileNumber}
                                    />
                                    <CustomInput
                                        label="Email Address *"
                                        value={formData.email}
                                        onChange={(e) => handleTextChange("email", e.target.value)}
                                        placeholder="Enter email address"
                                        error={errors.email}
                                    />
                                    <CustomInput
                                        label="Aadhar Number"
                                        value={formData.aadharNo}
                                        onChange={(e) => handleNumberChange("aadharNo", e.target.value, 12)}
                                        placeholder="Enter 12-digit Aadhar"
                                        error={errors.aadharNo}
                                    />
                                    <CustomInput
                                        label="PAN Card Number"
                                        value={formData.panCardNo}
                                        onChange={(e) => handleTextChange("panCardNo", e.target.value.toUpperCase())}
                                        placeholder="Enter PAN number"
                                        error={errors.panCardNo}
                                    />
                                    <div className="col-span-1 md:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pt-3">
                                        <CustomTextArea
                                            label="Permanent Address *"
                                            value={formData.permanentAddress}
                                            onChange={(e) => handleTextChange("permanentAddress", e.target.value)}
                                            placeholder="Enter complete permanent address"
                                            error={errors.permanentAddress}
                                            rows={3}
                                        />
                                        <CustomTextArea
                                            label="Temporary Address (Optional)"
                                            value={formData.temporaryAddress}
                                            onChange={(e) => handleTextChange("temporaryAddress", e.target.value)}
                                            placeholder="Enter temporary/present address"
                                            error={errors.temporaryAddress}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8 bg-zinc-50/50 p-5 rounded-md border border-zinc-200">
                                <h3 className="text-[13px] font-black text-zinc-800 mb-5 uppercase tracking-wide border-b border-zinc-200 pb-2">3. Membership Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5">
                                    <CustomInput
                                        label="Membership ID *"
                                        value={formData.membershipId}
                                        onChange={(e) => handleTextChange("membershipId", e.target.value.toUpperCase())}
                                        placeholder="e.g. TCWA1234"
                                        error={errors.membershipId}
                                    />
                                    <CustomSelect
                                        label="Member Type *"
                                        dropdownData={memberTypeOptions}
                                        value={formData.memberType}
                                        onChange={(value) => handleTextChange("memberType", value)}
                                        error={errors.memberType}
                                    />
                                    <CustomInput
                                        label="Date of Joining *"
                                        type="date"
                                        value={formData.dateOfJoining}
                                        onChange={(e) => handleTextChange("dateOfJoining", e.target.value)}
                                        error={errors.dateOfJoining}
                                    />
                                    <CustomInput
                                        label="Joining Fee / Donation Amount"
                                        value={formData.joiningFeeAmount}
                                        onChange={(e) => handleTextChange("joiningFeeAmount", e.target.value)}
                                        placeholder="Enter amount"
                                    />
                                    <CustomInput
                                        label="Joining Fee Receipt No."
                                        value={formData.joiningFeeReceiptNo}
                                        onChange={(e) => handleTextChange("joiningFeeReceiptNo", e.target.value)}
                                        placeholder="Enter receipt no"
                                    />
                                    <CustomInput
                                        label="Joining Fee DD No & Bank"
                                        value={formData.joiningFeeDDNoBank}
                                        onChange={(e) => handleTextChange("joiningFeeDDNoBank", e.target.value)}
                                        placeholder="Enter DD No & Bank"
                                    />
                                    <CustomInput
                                        label="Title Card Movie Details"
                                        value={formData.titleCardMovieDetails}
                                        onChange={(e) => handleTextChange("titleCardMovieDetails", e.target.value)}
                                        placeholder="Enter movie details"
                                    />
                                    <CustomInput
                                        label="AM to LM Fee / Donation Amount"
                                        value={formData.amToLmFeeAmount}
                                        onChange={(e) => handleTextChange("amToLmFeeAmount", e.target.value)}
                                        placeholder="Enter amount"
                                    />
                                    <CustomInput
                                        label="AM to LM Fee Receipt No."
                                        value={formData.amToLmFeeReceiptNo}
                                        onChange={(e) => handleTextChange("amToLmFeeReceiptNo", e.target.value)}
                                        placeholder="Enter receipt no"
                                    />
                                    <CustomInput
                                        label="AM to LM DD No & Bank"
                                        value={formData.amToLmFeeDDNoBank}
                                        onChange={(e) => handleTextChange("amToLmFeeDDNoBank", e.target.value)}
                                        placeholder="Enter DD No & Bank"
                                    />
                                    <CustomInput
                                        label="Change to Life Member Date"
                                        type="date"
                                        value={formData.changeToLifeMemberDate}
                                        onChange={(e) => handleTextChange("changeToLifeMemberDate", e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="mb-2 bg-zinc-50/50 p-5 rounded-md border border-zinc-200">
                                <h3 className="text-[13px] font-black text-zinc-800 mb-5 uppercase tracking-wide border-b border-zinc-200 pb-2">4. Nominee Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5">
                                    <CustomInput
                                        label="Nominee Name"
                                        value={formData.nomineeName}
                                        onChange={(e) => handleTextChange("nomineeName", e.target.value)}
                                        placeholder="Enter nominee name"
                                        error={errors.nomineeName}
                                    />
                                    <CustomInput
                                        label="Relation with Nominee"
                                        value={formData.nomineeRelation}
                                        onChange={(e) => handleTextChange("nomineeRelation", e.target.value)}
                                        placeholder="e.g. Wife, Son"
                                        error={errors.nomineeRelation}
                                    />
                                    <CustomInput
                                        label="Nominee Aadhar Number"
                                        value={formData.nomineeAadharNo}
                                        onChange={(e) => handleNumberChange("nomineeAadharNo", e.target.value, 12)}
                                        placeholder="Enter 12-digit Aadhar"
                                        error={errors.nomineeAadharNo}
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
                                <CustomButton
                                    icon={FaDownload}
                                    label="Download List"
                                    onClick={downloadMembersListPDF}
                                    bgColor="bg-zinc-800 hover:bg-zinc-900"
                                    textColor="text-white"
                                    className="py-2 px-4 text-xs font-bold whitespace-nowrap h-[38px] rounded-sm"
                                />
                            </div>
                        </div>

                        {isLoadingSavedMembers ? (
                            <TableSkeleton rowCount={5} colCount={10} />
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
                                                <th className="border border-zinc-200 py-3 px-3 text-center w-12 bg-zinc-50/50">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                                                        checked={filteredSavedMembers.length > 0 && filteredSavedMembers.every(m => selectedMemberIds.has(m._id))}
                                                        onChange={toggleSelectAll}
                                                    />
                                                </th>
                                                {["S No", "Membership ID", "Name", "Member Type", "Mobile", "Email", "Joined On", "Status", "Actions"].map((head) => (
                                                    <th key={head} className="border border-zinc-200 py-3 px-3 text-left text-xs font-bold text-zinc-600 uppercase whitespace-nowrap">
                                                        {head}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedSavedMembers.map((member, index) => (
                                                <tr key={member._id} className="hover:bg-zinc-50 transition-colors">
                                                    <td className="border border-zinc-200 py-2.5 px-3 text-center w-12 bg-zinc-50/10">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                                                            checked={selectedMemberIds.has(member._id)}
                                                            onChange={() => toggleSelectMember(member._id)}
                                                        />
                                                    </td>
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
                                                        <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${(member.memberType === 'Life Time Member' || member.memberType === 'Life Member' || member.memberType === 'Life Time') ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {(member.memberType === 'Life Time Member' || member.memberType === 'Life Member' || member.memberType === 'Life Time') ? 'Life Time' : 'Associate'}
                                                        </span>
                                                    </td>
                                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-semibold text-zinc-700 whitespace-nowrap w-28">
                                                        {member.mobileNumber}
                                                    </td>
                                                    <td className="border border-zinc-200 py-2.5 px-3 text-[13px] font-medium text-zinc-600 min-w-[150px]">
                                                        {member.email || "-"}
                                                    </td>
                                                    <td className="border border-zinc-200 py-2.5 px-3 text-[11px] font-semibold text-zinc-500 whitespace-nowrap w-32">
                                                        {member.dateOfJoining 
                                                            ? new Date(member.dateOfJoining).toLocaleDateString("en-GB") 
                                                            : (member.createdAt ? new Date(member.createdAt).toLocaleString("en-GB", { dateStyle: "short" }) : "-")}
                                                    </td>
                                                    <td className="border border-zinc-200 py-2.5 px-3 w-28 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                            member.status === 'Active' 
                                                                ? 'bg-green-100 text-green-700' 
                                                                : member.status === 'Inactive'
                                                                    ? 'bg-amber-100 text-amber-700'
                                                                    : 'bg-red-100 text-red-700'
                                                        }`}>
                                                            {member.status || "Active"}
                                                        </span>
                                                    </td>
                                                    <td className="border border-zinc-200 py-2.5 px-3 w-36 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setViewMember(member);
                                                                    setIsViewModalOpen(true);
                                                                }}
                                                                className="inline-flex items-center gap-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 text-xs font-semibold border border-blue-200 transition-colors cursor-pointer"
                                                            >
                                                                <FiList className="text-[10px]" />
                                                                <span>View</span>
                                                            </button>
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
                                                        </div>
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
                                                <CustomSelect
                                                    dropdownData={savedMemberPageSizeOptions.map(size => ({ value: size, label: size }))}
                                                    value={savedMembersPageSize}
                                                    onChange={(value) => {
                                                        setSavedMembersPageSize(Number(value));
                                                        setSavedMembersPage(1);
                                                    }}
                                                    buttonClassName="h-8 py-0 min-w-16 bg-white !text-xs"
                                                    label={null}
                                                />
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

            <ViewMemberModal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setViewMember(null);
                }}
                member={viewMember}
            />

            <SendMemberMessageModal 
                isOpen={isMessageModalOpen}
                onClose={() => {
                    setIsMessageModalOpen(false);
                    setMessageMember(null);
                }}
                member={messageMember}
            />
        </div>
    );
}
