import { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import CustomInput from '../custom/CustomInput';
import CustomTextArea from '../custom/CustomTextArea';
import { CustomSelect } from '../custom/CustomSelect';
import CustomButton from '../custom/CustomButton';

const statusOptions = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
];

export default function EditMemberModal({ isOpen, onClose, member, onSave, loading }) {
    const [formData, setFormData] = useState({
        name: "",
        surname: "",
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
        status: "Active"
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (member) {
            setFormData({
                name: member.name || "",
                surname: member.surname || "",
                dateOfBirth: member.dateOfBirth || "",
                qualification: member.qualification || "",
                bloodGroup: member.bloodGroup || "",
                mobileNumber: member.mobileNumber || "",
                email: member.email || "",
                aadharNo: member.aadharNo || "",
                panCardNo: member.panCardNo || "",
                nomineeName: member.nomineeName || "",
                nomineeRelation: member.nomineeRelation || "",
                nomineeAadharNo: member.nomineeAadharNo || "",
                permanentAddress: member.permanentAddress || "",
                temporaryAddress: member.temporaryAddress || "",
                status: member.status || "Active"
            });
            setErrors({});
        }
    }, [member]);

    const validateField = (fieldName, value) => {
        const trimmedValue = typeof value === 'string' ? value.trim() : value;
        switch (fieldName) {
            case "name":
            case "surname":
            case "dateOfBirth":
            case "qualification":
            case "bloodGroup":
            case "nomineeName":
            case "nomineeRelation":
            case "permanentAddress":
            case "temporaryAddress":
                return trimmedValue ? "" : "Field is required.";
            case "mobileNumber":
                if (!trimmedValue) return "Field is required.";
                if (!/^\d{10}$/.test(trimmedValue)) return "Mobile number must be exactly 10 digits.";
                return "";
            case "aadharNo":
            case "nomineeAadharNo":
                if (!trimmedValue) return "Field is required.";
                if (!/^\d{12}$/.test(trimmedValue)) return "Aadhar number must be exactly 12 digits.";
                return "";
            case "panCardNo":
                if (!trimmedValue) return "Field is required.";
                if (!/^[A-Za-z]{5}\d{4}[A-Za-z]{1}$/.test(trimmedValue)) return "Invalid PAN format.";
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
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
    };

    const handleNumberChange = (field, value, maxLength) => {
        let numericValue = value.replace(/\D/g, '');
        
        if (field === "mobileNumber") {
            if (numericValue.length > 10 && numericValue.startsWith("91")) {
                numericValue = numericValue.substring(2);
            } else if (numericValue.length > 10 && numericValue.startsWith("0")) {
                numericValue = numericValue.substring(1);
            }
        }
        
        numericValue = numericValue.slice(0, maxLength);
        
        setFormData(prev => ({ ...prev, [field]: numericValue }));
        setErrors(prev => ({ ...prev, [field]: validateField(field, numericValue) }));
    };

    const handleSave = () => {
        const nextErrors = {
            name: validateField("name", formData.name),
            surname: validateField("surname", formData.surname),
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
        };

        if (Object.values(nextErrors).some(Boolean)) {
            setErrors(nextErrors);
            return;
        }

        onSave(member.membershipId, {
            name: formData.name.trim(),
            surname: formData.surname.trim(),
            dateOfBirth: formData.dateOfBirth,
            qualification: formData.qualification.trim(),
            bloodGroup: formData.bloodGroup.trim(),
            mobileNumber: formData.mobileNumber,
            email: formData.email.trim(),
            aadharNo: formData.aadharNo,
            panCardNo: formData.panCardNo.trim().toUpperCase(),
            nomineeName: formData.nomineeName.trim(),
            nomineeRelation: formData.nomineeRelation.trim(),
            nomineeAadharNo: formData.nomineeAadharNo,
            permanentAddress: formData.permanentAddress.trim(),
            temporaryAddress: formData.temporaryAddress.trim(),
            status: formData.status
        });
    };

    const isSubmitDisabled = useMemo(() => {
        return !(formData.name || "").trim()
            || !(formData.surname || "").trim()
            || !formData.dateOfBirth
            || !(formData.qualification || "").trim()
            || !(formData.bloodGroup || "").trim()
            || (formData.mobileNumber || "").length !== 10
            || (formData.aadharNo || "").length !== 12
            || (formData.nomineeAadharNo || "").length !== 12
            || !(formData.panCardNo || "").trim()
            || !(formData.nomineeName || "").trim()
            || !(formData.nomineeRelation || "").trim()
            || !(formData.permanentAddress || "").trim()
            || !(formData.temporaryAddress || "").trim()
            || !(formData.email || "").trim()
            || Object.values(errors).some(Boolean);
    }, [errors, formData]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Member: ${member?.membershipId}`} widthClass="md:max-w-4xl">
            <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-6">
                    <div>
                        <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3">Status</h4>
                        <div className="w-64">
                            <CustomSelect
                                dropdownData={statusOptions}
                                value={formData.status}
                                onChange={(val) => handleTextChange('status', val)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CustomInput
                            label="Full Name *"
                            value={formData.name}
                            onChange={(e) => handleTextChange("name", e.target.value)}
                            error={errors.name}
                        />
                        <CustomInput
                            label="Surname *"
                            value={formData.surname}
                            onChange={(e) => handleTextChange("surname", e.target.value)}
                            error={errors.surname}
                        />
                        <CustomInput
                            label="Date of Birth *"
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => handleTextChange("dateOfBirth", e.target.value)}
                            error={errors.dateOfBirth}
                        />
                        <CustomInput
                            label="Qualification *"
                            value={formData.qualification}
                            onChange={(e) => handleTextChange("qualification", e.target.value)}
                            error={errors.qualification}
                        />
                        <CustomInput
                            label="Blood Group *"
                            value={formData.bloodGroup}
                            onChange={(e) => handleTextChange("bloodGroup", e.target.value)}
                            error={errors.bloodGroup}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CustomInput
                            label="Mobile Number *"
                            value={formData.mobileNumber}
                            onChange={(e) => handleNumberChange("mobileNumber", e.target.value, 10)}
                            error={errors.mobileNumber}
                        />
                        <CustomInput
                            label="Email Address *"
                            value={formData.email}
                            onChange={(e) => handleTextChange("email", e.target.value)}
                            error={errors.email}
                        />
                        <CustomInput
                            label="Aadhar Number *"
                            value={formData.aadharNo}
                            onChange={(e) => handleNumberChange("aadharNo", e.target.value, 12)}
                            error={errors.aadharNo}
                        />
                        <CustomInput
                            label="PAN Card Number *"
                            value={formData.panCardNo}
                            onChange={(e) => handleTextChange("panCardNo", e.target.value.toUpperCase())}
                            error={errors.panCardNo}
                        />
                        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomTextArea
                                label="Permanent Address *"
                                value={formData.permanentAddress}
                                onChange={(e) => handleTextChange("permanentAddress", e.target.value)}
                                error={errors.permanentAddress}
                                rows={2}
                            />
                            <CustomTextArea
                                label="Temporary Address *"
                                value={formData.temporaryAddress}
                                onChange={(e) => handleTextChange("temporaryAddress", e.target.value)}
                                error={errors.temporaryAddress}
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CustomInput
                            label="Nominee Name *"
                            value={formData.nomineeName}
                            onChange={(e) => handleTextChange("nomineeName", e.target.value)}
                            error={errors.nomineeName}
                        />
                        <CustomInput
                            label="Relation with Nominee *"
                            value={formData.nomineeRelation}
                            onChange={(e) => handleTextChange("nomineeRelation", e.target.value)}
                            error={errors.nomineeRelation}
                        />
                        <CustomInput
                            label="Nominee Aadhar Number *"
                            value={formData.nomineeAadharNo}
                            onChange={(e) => handleNumberChange("nomineeAadharNo", e.target.value, 12)}
                            error={errors.nomineeAadharNo}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-zinc-100 pt-4">
                <CustomButton
                    label="Cancel"
                    onClick={onClose}
                    bgColor="bg-zinc-100 hover:bg-zinc-200"
                    textColor="text-zinc-700"
                    className="border border-zinc-300"
                />
                <CustomButton
                    label={loading ? "Saving..." : "Save Changes"}
                    onClick={handleSave}
                    disabled={isSubmitDisabled || loading}
                />
            </div>
        </Modal>
    );
}
