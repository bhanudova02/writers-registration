import React from "react";
import { FiXCircle } from "react-icons/fi";

export default function ViewMemberModal({ isOpen, onClose, member }) {
    if (!isOpen || !member) return null;

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString("en-GB"); // dd/MM/yyyy
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/60 px-4 py-8 overflow-y-auto flex items-start justify-center">
            <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white shadow-2xl my-auto shrink-0">
                <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 bg-zinc-50 rounded-t-lg">
                    <h3 className="text-base font-bold text-zinc-800">Member Details - {member.membershipId}</h3>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-zinc-800 transition cursor-pointer"
                    >
                        <FiXCircle size={20} />
                    </button>
                </div>
                
                <div className="p-5 overflow-y-auto max-h-[70vh]">
                    {/* Basic Info */}
                    <h4 className="text-[13px] font-black text-zinc-800 mb-3 uppercase tracking-wide border-b border-zinc-200 pb-1">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm font-medium text-zinc-700 mb-6">
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">First Name:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.name || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Surname:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.surname || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Member Type:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.memberType || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Date of Joining:</span> 
                            <span className="font-bold text-zinc-900 text-right">{formatDate(member.dateOfJoining)}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Date of Birth:</span> 
                            <span className="font-bold text-zinc-900 text-right">{formatDate(member.dateOfBirth)}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Qualification:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.qualification || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Blood Group:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.bloodGroup || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Added On:</span> 
                            <span className="font-bold text-zinc-900 text-right">
                                {member.createdAt ? new Date(member.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "N/A"}
                            </span>
                        </div>
                    </div>

                    {/* Fees & Additional Details */}
                    <h4 className="text-[13px] font-black text-zinc-800 mb-3 uppercase tracking-wide border-b border-zinc-200 pb-1">Fees & Additional Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm font-medium text-zinc-700 mb-6">
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Joining Fee:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.joiningFeeAmount || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Receipt No (Joining):</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.joiningFeeReceiptNo || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">DD/Bank (Joining):</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.joiningFeeDDNoBank || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Title Card Movie:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.titleCardMovieDetails || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">AM to LM Fee:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.amToLmFeeAmount || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Receipt No (AM to LM):</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.amToLmFeeReceiptNo || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">DD/Bank (AM to LM):</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.amToLmFeeDDNoBank || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Change to LM Date:</span> 
                            <span className="font-bold text-zinc-900 text-right">{formatDate(member.changeToLifeMemberDate)}</span>
                        </div>
                    </div>

                    {/* Contact & Identity */}
                    <h4 className="text-[13px] font-black text-zinc-800 mb-3 uppercase tracking-wide border-b border-zinc-200 pb-1">Contact & Identity</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm font-medium text-zinc-700 mb-6">
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Mobile Number:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.mobileNumber || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Alternate Mobile:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.alternateMobileNumber || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Email:</span> 
                            <span className="font-bold text-zinc-900 text-right truncate ml-2" title={member.email}>{member.email || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Aadhar No:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.aadharNo || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">PAN Card No:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.panCardNo || "N/A"}</span>
                        </div>
                    </div>

                    {/* Addresses */}
                    <h4 className="text-[13px] font-black text-zinc-800 mb-3 uppercase tracking-wide border-b border-zinc-200 pb-1">Addresses</h4>
                    <div className="grid grid-cols-1 gap-y-3 text-sm font-medium text-zinc-700 mb-6">
                        <div className="flex flex-col border-b border-zinc-100 pb-2">
                            <span className="text-zinc-500 mb-1">Temporary Address:</span> 
                            <span className="font-bold text-zinc-900">{member.temporaryAddress || "N/A"}</span>
                        </div>
                        <div className="flex flex-col border-b border-zinc-100 pb-2">
                            <span className="text-zinc-500 mb-1">Permanent Address:</span> 
                            <span className="font-bold text-zinc-900">{member.permanentAddress || "N/A"}</span>
                        </div>
                    </div>

                    {/* Nominee Details */}
                    <h4 className="text-[13px] font-black text-zinc-800 mb-3 uppercase tracking-wide border-b border-zinc-200 pb-1">Nominee Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm font-medium text-zinc-700 mb-2">
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Nominee Name:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.nomineeName || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Relation:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.nomineeRelation || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 pb-1">
                            <span className="text-zinc-500">Nominee Aadhar:</span> 
                            <span className="font-bold text-zinc-900 text-right">{member.nomineeAadharNo || "N/A"}</span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-zinc-200 px-5 py-3 bg-zinc-50 rounded-b-lg flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-zinc-800 text-white rounded text-sm font-semibold hover:bg-zinc-700 transition cursor-pointer">Close</button>
                </div>
            </div>
        </div>
    );
}
