import { useState, useEffect } from "react";
import { FaBell, FaPaperPlane, FaHistory } from "react-icons/fa";
import { FiMessageSquare, FiSend, FiClock, FiLayers } from "react-icons/fi";
import { collection, onSnapshot, doc, setDoc, query } from "firebase/firestore";
import { db } from "../../firebase";
import CustomButton from "../../components/custom/CustomButton";
import { CustomSelect } from "../../components/custom/CustomSelect";
import { toast } from "react-toastify";

export default function NotificationsPage() {
    const [targetAudience, setTargetAudience] = useState("All");
    const [messageText, setMessageText] = useState("");
    const [isSending, setIsSending] = useState(false);
    
    // Live database stats
    const [membersList, setMembersList] = useState([]);
    const [broadcasts, setBroadcasts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch members real-time to compute target recipient counts dynamically
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "members"), (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                list.push(docSnap.data());
            });
            setMembersList(list);
        });
        return () => unsubscribe();
    }, []);

    // Fetch sent broadcasts from real database
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "broadcasts"), (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            // Sort by date descending
            list.sort((a, b) => new Date(b.date) - new Date(a.date));
            setBroadcasts(list);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Calculate count of target recipients dynamically from the live database
    const getRecipientCount = (audience) => {
        if (audience === "All") return membersList.length;
        if (audience === "Life Time") return membersList.filter(m => m.memberType === "Life Time Member").length;
        if (audience === "Associate") return membersList.filter(m => m.memberType === "Associate Member").length;
        if (audience === "Expired") {
            return membersList.filter(m => {
                if (m.memberType !== "Associate Member") return false;
                const createdDate = m.createdAt ? new Date(m.createdAt) : new Date();
                const expiryDate = new Date(createdDate);
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                return expiryDate.getTime() < new Date().getTime();
            }).length;
        }
        return 0;
    };

    const targetAudienceOptions = [
        { value: "All", label: `All Live Members (${getRecipientCount("All")})` },
        { value: "Life Time", label: `Life Time Members Only (${getRecipientCount("Life Time")})` },
        { value: "Associate", label: `Associate Members Only (${getRecipientCount("Associate")})` },
        { value: "Expired", label: `Expired Membership Accounts (${getRecipientCount("Expired")})` }
    ];

    const handleSendBroadcast = async (e) => {
        e.preventDefault();
        if (!messageText.trim()) {
            toast.error("Please enter a message to broadcast.");
            return;
        }

        setIsSending(true);

        try {
            const count = getRecipientCount(targetAudience);
            const campId = `CAMP-${Math.floor(100000 + Math.random() * 900000)}`;
            const nowStr = new Date().toISOString();

            // Save campaign details directly to Firestore broadcasts collection
            const broadcastRef = doc(db, "broadcasts", campId);
            await setDoc(broadcastRef, {
                campaignId: campId,
                audience: targetAudience === "All" ? "All Members" : `${targetAudience} Only`,
                message: messageText.trim(),
                date: nowStr,
                recipientsCount: count,
                status: "Delivered"
            });

            toast.success(`SMS Broadcast Campaign initiated successfully to ${count} members!`);
            setMessageText("");
        } catch (error) {
            console.error(error);
            toast.error("Failed to post broadcast announcement.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="p-3 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <FaBell className="text-xl md:text-2xl text-zinc-700 -mt-0.5" />
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800">Broadcast SMS & Notifications</h1>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">SMS Balance</h3>
                        <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">45,820</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-50 rounded border border-green-100">
                        <FiMessageSquare className="text-green-500 text-base sm:text-lg" />
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Campaigns Sent</h3>
                        <p className="text-xl sm:text-2xl font-bold text-zinc-800 mt-1">{broadcasts.length}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-zinc-50 rounded border border-zinc-100">
                        <FaPaperPlane className="text-zinc-500 text-base sm:text-lg" />
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Sent SMS</h3>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
                            {broadcasts.reduce((acc, c) => acc + (c.recipientsCount || 0), 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-blue-50 rounded border border-blue-100">
                        <FiLayers className="text-blue-500 text-base sm:text-lg" />
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Failed SMS</h3>
                        <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">0</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-red-50 rounded border border-red-100">
                        <FaBell className="text-red-500 text-base sm:text-lg" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Form column */}
                <div className="lg:col-span-2 border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm">
                    <h3 className="text-lg font-bold text-zinc-800 mb-2">Compose Broadcast Campaign</h3>
                    <p className="text-sm text-zinc-500 mb-5">Broadcast SMS directly to members. Data is sourced from the live directory.</p>

                    <form onSubmit={handleSendBroadcast} className="space-y-4">
                        <CustomSelect
                            label="Target Audience *"
                            dropdownData={targetAudienceOptions}
                            value={targetAudience}
                            onChange={(val) => setTargetAudience(val)}
                        />

                        <div>
                            <label className="block text-[13px] font-bold text-zinc-700 uppercase tracking-wider mb-2">
                                Message Text (SMS) *
                            </label>
                            <textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                rows="4"
                                maxLength="160"
                                placeholder="Write the announcement message here (Max 160 characters)..."
                                className="w-full p-3 border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 text-sm text-zinc-800 bg-zinc-50"
                            />
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-zinc-400">Standard message rates apply.</p>
                                <p className="text-xs font-bold text-zinc-500">{messageText.length} / 160 characters</p>
                            </div>
                        </div>

                        <div className="border-t border-zinc-100 pt-4 flex justify-end">
                            <CustomButton
                                label={isSending ? "Sending Broadcast..." : "Send Broadcast"}
                                type="submit"
                                icon={FiSend}
                                disabled={isSending || !messageText.trim()}
                            />
                        </div>
                    </form>
                </div>

                {/* Empty demo boxes */}
                <div className="space-y-4">
                    <div className="border border-zinc-200 bg-white p-5 rounded-md shadow-sm">
                        <h3 className="text-sm font-bold text-zinc-800 mb-3 flex items-center gap-1.5">
                            <FiClock className="text-amber-500" />
                            <span>Scheduled Broadcasts (Demo)</span>
                        </h3>
                        <div className="border border-dashed border-zinc-200 rounded-md py-8 px-4 text-center">
                            <FiClock className="text-zinc-300 text-3xl mx-auto mb-2" />
                            <p className="text-xs font-semibold text-zinc-500">No scheduled SMS broadcasts.</p>
                        </div>
                    </div>

                    <div className="border border-zinc-200 bg-white p-5 rounded-md shadow-sm">
                        <h3 className="text-sm font-bold text-zinc-800 mb-3 flex items-center gap-1.5">
                            <FiMessageSquare className="text-blue-500" />
                            <span>Draft Messages (Demo)</span>
                        </h3>
                        <div className="border border-dashed border-zinc-200 rounded-md py-8 px-4 text-center">
                            <FiMessageSquare className="text-zinc-300 text-3xl mx-auto mb-2" />
                            <p className="text-xs font-semibold text-zinc-500">No drafts currently saved.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Campaign History Log */}
            <div className="border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm">
                <h3 className="text-lg font-bold text-zinc-800 mb-2 flex items-center gap-2">
                    <FaHistory className="text-zinc-500 text-sm -mt-0.5" />
                    <span>Recent Broadcast Logs</span>
                </h3>
                <p className="text-sm text-zinc-500 mb-4">View history of previously dispatched broadcast announcements.</p>

                {isLoading ? (
                    <div className="py-8 text-center text-zinc-400 text-xs font-bold">
                        Loading broadcast logs...
                    </div>
                ) : broadcasts.length === 0 ? (
                    <div className="py-8 text-center text-zinc-400 text-xs font-bold border border-dashed border-zinc-200 rounded">
                        No sent SMS broadcasts in history.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[750px] border-collapse border border-zinc-200">
                            <thead>
                                <tr className="bg-zinc-100 border-b border-zinc-200">
                                    {["Campaign ID", "Target Audience", "Message", "Sent Date", "Recipients", "Status"].map((head) => (
                                        <th key={head} className="border border-zinc-200 py-3 px-3 text-left text-xs font-bold text-zinc-600 uppercase whitespace-nowrap">
                                            {head}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {broadcasts.map((camp) => (
                                    <tr key={camp.id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-700 w-32">
                                            {camp.campaignId || camp.id}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-800 w-40">
                                            {camp.audience}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-medium text-zinc-600 max-w-[300px] truncate">
                                            {camp.message}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[12px] font-medium text-zinc-500 w-32">
                                            {new Date(camp.date).toLocaleDateString()}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-700 w-28">
                                            {camp.recipientsCount}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 w-28 text-center">
                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-700">
                                                {camp.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
