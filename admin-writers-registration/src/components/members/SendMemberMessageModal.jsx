import { useState, useEffect } from "react";
import { FaPaperPlane, FaTimesCircle, FaSms, FaEnvelope } from "react-icons/fa";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "react-toastify";

export default function SendMemberMessageModal({ isOpen, onClose, member }) {
    const [isSending, setIsSending] = useState(false);
    const [formData, setFormData] = useState({
        message: "",
        sendToSms: true,
        sendToEmail: !!member?.email
    });

    useEffect(() => {
        if (isOpen && member) {
            setFormData({
                message: "",
                sendToSms: !!member.mobileNumber,
                sendToEmail: !!member.email
            });
        }
    }, [isOpen, member]);

    if (!isOpen || !member) return null;

    const handleSend = async (e) => {
        e.preventDefault();
        
        if (!formData.sendToSms && !formData.sendToEmail) {
            toast.error("Please select at least one method (SMS or Email).");
            return;
        }

        const payload = {
            memberId: member.membershipId,
            phone: member.mobileNumber || "",
            emailAddress: member.email || "",
            message: formData.message,
            sendToSms: formData.sendToSms,
            sendToEmail: formData.sendToEmail
        };

        if (payload.sendToSms && !payload.phone) {
            toast.error("This member does not have a registered mobile number.");
            return;
        }
        if (payload.sendToEmail && !payload.emailAddress) {
            toast.error("This member does not have a registered email address.");
            return;
        }

        setIsSending(true);
        try {
            const functions = getFunctions();
            const sendMsg = httpsCallable(functions, "sendCustomMessage");
            const result = await sendMsg(payload);
            
            if (result.data.success) {
                toast.success("Message sent successfully!");
                onClose();
            } else {
                toast.error("Failed to send message.");
            }
        } catch (error) {
            console.error("Send custom message error:", error);
            toast.error(error.message || "Failed to send message.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
                    <h2 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                        <FaPaperPlane className="text-blue-500" /> Message to {member.name}
                    </h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-red-500 transition">
                        <FaTimesCircle size={20} />
                    </button>
                </div>
                <form onSubmit={handleSend} className="p-6 space-y-4">
                    <div className="bg-blue-50/50 p-3 rounded border border-blue-100 flex flex-col gap-1">
                        <p className="text-[11px] font-bold text-zinc-500 uppercase">Recipient Details</p>
                        <p className="text-sm font-semibold text-zinc-800">{member.name} ({member.membershipId})</p>
                        <div className="flex gap-4 mt-1">
                            {member.mobileNumber && <span className="text-xs text-zinc-600 flex items-center gap-1"><FaSms className="text-blue-500"/> +91 {member.mobileNumber}</span>}
                            {member.email && <span className="text-xs text-zinc-600 flex items-center gap-1"><FaEnvelope className="text-orange-500"/> {member.email}</span>}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 py-2 border-b border-zinc-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={formData.sendToSms}
                                disabled={!member.mobileNumber}
                                onChange={(e) => setFormData({...formData, sendToSms: e.target.checked})}
                                className="w-4 h-4 text-blue-600"
                            />
                            <span className={`text-sm font-bold flex items-center gap-1 ${member.mobileNumber ? 'text-zinc-700' : 'text-zinc-400 line-through'}`}>
                                <FaSms className={member.mobileNumber ? "text-blue-500" : "text-zinc-400"}/> Send SMS
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={formData.sendToEmail}
                                disabled={!member.email}
                                onChange={(e) => setFormData({...formData, sendToEmail: e.target.checked})}
                                className="w-4 h-4 text-blue-600"
                            />
                            <span className={`text-sm font-bold flex items-center gap-1 ${member.email ? 'text-zinc-700' : 'text-zinc-400 line-through'}`}>
                                <FaEnvelope className={member.email ? "text-orange-500" : "text-zinc-400"}/> Send Email
                            </span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-600 mb-1">Message Content <span className="text-red-500">*</span></label>
                        <textarea 
                            placeholder="Type your message here..."
                            rows="4"
                            value={formData.message}
                            onChange={(e) => setFormData({...formData, message: e.target.value})}
                            className="w-full px-3 py-2 border border-zinc-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            required
                        ></textarea>
                        <p className="text-[10px] text-zinc-500 mt-1 text-right">{formData.message.length} characters</p>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 rounded transition"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSending}
                            className={`px-4 py-2 text-sm font-bold text-white rounded shadow-sm flex items-center gap-2 transition ${
                                isSending ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {isSending ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Sending...</>
                            ) : (
                                <><FaPaperPlane /> Send Now</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
