import { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import CustomInput from '../custom/CustomInput';
import CustomTextArea from '../custom/CustomTextArea';
import { CustomSelect } from '../custom/CustomSelect';
import CustomButton from '../custom/CustomButton';

export default function EditMemberModal({ isOpen, onClose, member, onSave, loading }) {
    const [formData, setFormData] = useState({
        memberType: "",
        dateOfJoining: "",
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
        joiningFeeAmount: "",
        joiningFeeReceiptNo: "",
        joiningFeeDDNoBank: "",
        titleCardMovieDetails: "",
        amToLmFeeAmount: "",
        amToLmFeeReceiptNo: "",
        amToLmFeeDDNoBank: "",
        changeToLifeMemberDate: "",
        alternateMobileNumber: "",
        validityExpiresAt: ""
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (member) {
            setFormData({
                memberType: member.memberType || "",
                dateOfJoining: member.dateOfJoining || "",
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
                joiningFeeAmount: member.joiningFeeAmount || "",
                joiningFeeReceiptNo: member.joiningFeeReceiptNo || "",
                joiningFeeDDNoBank: member.joiningFeeDDNoBank || "",
                titleCardMovieDetails: member.titleCardMovieDetails || "",
                amToLmFeeAmount: member.amToLmFeeAmount || "",
                amToLmFeeReceiptNo: member.amToLmFeeReceiptNo || "",
                amToLmFeeDDNoBank: member.amToLmFeeDDNoBank || "",
                changeToLifeMemberDate: member.changeToLifeMemberDate || "",
                alternateMobileNumber: member.alternateMobileNumber || "",
                validityExpiresAt: member.validityExpiresAt ? member.validityExpiresAt.substring(0, 10) : ""
            });
            setErrors({});
        }
    }, [member]);

    const validateField = (fieldName, value) => {
        const trimmedValue = typeof value === 'string' ? value.trim() : value;
        switch (fieldName) {
            case "memberType":
            case "dateOfJoining":
            case "name":
            case "surname":
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
            memberType: formData.memberType,
            dateOfJoining: formData.dateOfJoining,
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
            joiningFeeAmount: formData.joiningFeeAmount.trim(),
            joiningFeeReceiptNo: formData.joiningFeeReceiptNo.trim(),
            joiningFeeDDNoBank: formData.joiningFeeDDNoBank.trim(),
            titleCardMovieDetails: formData.titleCardMovieDetails.trim(),
            amToLmFeeAmount: formData.amToLmFeeAmount.trim(),
            amToLmFeeReceiptNo: formData.amToLmFeeReceiptNo.trim(),
            amToLmFeeDDNoBank: formData.amToLmFeeDDNoBank.trim(),
            changeToLifeMemberDate: formData.changeToLifeMemberDate,
            alternateMobileNumber: formData.alternateMobileNumber,
            validityExpiresAt: formData.validityExpiresAt
        });
    };

    const isSubmitDisabled = useMemo(() => {
        return !formData.memberType
            || !formData.dateOfJoining
            || !(formData.name || "").trim()
            || !(formData.surname || "").trim()
            || !(formData.email || "").trim()
            || !(formData.permanentAddress || "").trim()
            || (formData.mobileNumber || "").length !== 10
            || (formData.alternateMobileNumber && formData.alternateMobileNumber.length !== 10)
            || Object.values(errors).some(Boolean);
    }, [errors, formData]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Member: ${member?.membershipId}`} widthClass="md:max-w-4xl">
            <div className="space-y-6">

                {/* 1. Personal Details */}
                <div className="mb-2 bg-zinc-50/50 p-5 rounded-md border border-zinc-200">
                    <h3 className="text-[13px] font-black text-zinc-800 mb-5 uppercase tracking-wide border-b border-zinc-200 pb-2">1. Personal Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CustomInput label="Full Name *" value={formData.name} onChange={(e) => handleTextChange("name", e.target.value)} error={errors.name} />
                        <CustomInput label="Surname *" value={formData.surname} onChange={(e) => handleTextChange("surname", e.target.value)} error={errors.surname} />
                        <CustomInput label="Date of Birth (dd/mm/yyyy)" type="date" value={formData.dateOfBirth} onChange={(e) => handleTextChange("dateOfBirth", e.target.value)} error={errors.dateOfBirth} />
                        <CustomInput label="Qualification" value={formData.qualification} onChange={(e) => handleTextChange("qualification", e.target.value)} error={errors.qualification} />
                        <CustomInput label="Blood Group" value={formData.bloodGroup} onChange={(e) => handleTextChange("bloodGroup", e.target.value)} error={errors.bloodGroup} />
                    </div>
                </div>

                {/* 2. Contact & Identity */}
                <div className="mb-2 bg-zinc-50/50 p-5 rounded-md border border-zinc-200">
                    <h3 className="text-[13px] font-black text-zinc-800 mb-5 uppercase tracking-wide border-b border-zinc-200 pb-2">2. Contact & Identity</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CustomInput label="Mobile Number *" value={formData.mobileNumber} onChange={(e) => handleNumberChange("mobileNumber", e.target.value, 10)} error={errors.mobileNumber} />
                        <CustomInput label="Alternate Mobile Number (Optional)" value={formData.alternateMobileNumber} onChange={(e) => handleNumberChange("alternateMobileNumber", e.target.value, 10)} error={errors.alternateMobileNumber} />
                        <CustomInput label="Email Address *" value={formData.email} onChange={(e) => handleTextChange("email", e.target.value)} error={errors.email} />
                        <CustomInput label="Aadhar Number" value={formData.aadharNo} onChange={(e) => handleNumberChange("aadharNo", e.target.value, 12)} error={errors.aadharNo} />
                        <CustomInput label="PAN Card Number" value={formData.panCardNo} onChange={(e) => handleTextChange("panCardNo", e.target.value.toUpperCase())} error={errors.panCardNo} />
                        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomTextArea label="Permanent Address *" value={formData.permanentAddress} onChange={(e) => handleTextChange("permanentAddress", e.target.value)} error={errors.permanentAddress} rows={2} />
                            <CustomTextArea label="Temporary Address (Optional)" value={formData.temporaryAddress} onChange={(e) => handleTextChange("temporaryAddress", e.target.value)} error={errors.temporaryAddress} rows={2} />
                        </div>
                    </div>
                </div>

                {/* 3. Membership Details */}
                <div className="mb-2 bg-zinc-50/50 p-5 rounded-md border border-zinc-200">
                    <h3 className="text-[13px] font-black text-zinc-800 mb-5 uppercase tracking-wide border-b border-zinc-200 pb-2">3. Membership Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <CustomSelect
                            label="Member Type *"
                            dropdownData={[
                                { value: "", label: "Select Member Type" },
                                { value: "Life Time Member", label: "Life Time Member" },
                                { value: "Associate Member", label: "Associate Member" },
                            ]}
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <CustomInput label="Joining Fee Amount" value={formData.joiningFeeAmount} onChange={(e) => handleTextChange("joiningFeeAmount", e.target.value)} />
                        <CustomInput label="Joining Fee Receipt No" value={formData.joiningFeeReceiptNo} onChange={(e) => handleTextChange("joiningFeeReceiptNo", e.target.value)} />
                        <CustomInput label="Joining Fee DD/Bank" value={formData.joiningFeeDDNoBank} onChange={(e) => handleTextChange("joiningFeeDDNoBank", e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 mt-4">
                        <CustomInput label="Title Card Movie Details" value={formData.titleCardMovieDetails} onChange={(e) => handleTextChange("titleCardMovieDetails", e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <CustomInput label="AM to LM Fee Amount" value={formData.amToLmFeeAmount} onChange={(e) => handleTextChange("amToLmFeeAmount", e.target.value)} />
                        <CustomInput label="AM to LM Receipt No" value={formData.amToLmFeeReceiptNo} onChange={(e) => handleTextChange("amToLmFeeReceiptNo", e.target.value)} />
                        <CustomInput label="AM to LM DD/Bank" value={formData.amToLmFeeDDNoBank} onChange={(e) => handleTextChange("amToLmFeeDDNoBank", e.target.value)} />
                    </div>

                    {formData.memberType === "Associate Member" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-zinc-200 pt-4">
                            <CustomInput
                                label="Membership Expiry Date (Manually Override)"
                                type="date"
                                value={formData.validityExpiresAt}
                                onChange={(e) => handleTextChange("validityExpiresAt", e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* 4. Nominee Details */}
                <div className="mb-2 bg-zinc-50/50 p-5 rounded-md border border-zinc-200">
                    <h3 className="text-[13px] font-black text-zinc-800 mb-5 uppercase tracking-wide border-b border-zinc-200 pb-2">4. Nominee Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CustomInput label="Nominee Name" value={formData.nomineeName} onChange={(e) => handleTextChange("nomineeName", e.target.value)} error={errors.nomineeName} />
                        <CustomInput label="Relation with Nominee" value={formData.nomineeRelation} onChange={(e) => handleTextChange("nomineeRelation", e.target.value)} error={errors.nomineeRelation} />
                        <CustomInput label="Nominee Aadhar Number" value={formData.nomineeAadharNo} onChange={(e) => handleNumberChange("nomineeAadharNo", e.target.value, 12)} error={errors.nomineeAadharNo} />
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
