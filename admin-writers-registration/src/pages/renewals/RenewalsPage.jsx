import { useState, useEffect } from "react";
import { FaSyncAlt, FaSearch, FaRegCreditCard, FaUserGraduate } from "react-icons/fa";
import { FiAlertTriangle, FiCheck, FiDollarSign, FiClock, FiLayers } from "react-icons/fi";
import { collection, onSnapshot, doc, updateDoc, setDoc, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import CustomButton from "../../components/custom/CustomButton";
import { toast } from "react-toastify";

export default function RenewalsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [members, setMembers] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch members real-time
    useEffect(() => {
        const membersRef = collection(db, "members");
        const unsubscribe = onSnapshot(membersRef, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                // We only calculate renewals for Associate Members
                if (data.memberType === "Associate Member") {
                    // Expiry is 1 year from createdAt
                    const createdDate = data.createdAt ? new Date(data.createdAt) : new Date();
                    const expiryDate = new Date(createdDate);
                    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

                    const now = new Date();
                    const diffTime = expiryDate.getTime() - now.getTime();
                    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let status = "Active";
                    let amountDue = "-";
                    if (daysRemaining <= 0) {
                        if (daysRemaining < -30) {
                            status = "Overdue";
                            amountDue = "₹1,200";
                        } else {
                            status = "Grace Period";
                            amountDue = "₹1,200";
                        }
                    }

                    list.push({
                        id: docSnap.id,
                        name: data.name,
                        email: data.email,
                        mobileNumber: data.mobileNumber,
                        createdAt: data.createdAt,
                        expiryDate: expiryDate.toLocaleDateString(),
                        daysRemaining,
                        amountDue,
                        status
                    });
                }
            });
            setMembers(list);
            setIsLoading(false);
        }, (error) => {
            console.error(error);
            toast.error("Failed to load members from database.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Listen to real-time transactions/renewals log
    useEffect(() => {
        const transRef = collection(db, "renewal_transactions");
        const unsubscribe = onSnapshot(transRef, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            // Sort by payment date desc
            list.sort((a, b) => new Date(b.date) - new Date(a.date));
            setRecentTransactions(list);
        });
        return () => unsubscribe();
    }, []);

    const filteredRenewals = members.filter(renew => {
        const matchesSearch = renew.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              renew.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === "All" || renew.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    // Dynamic metrics
    const totalAssociates = members.length;
    const overdueCount = members.filter(m => m.status === "Overdue").length;
    const activeCount = members.filter(m => m.status === "Active").length;
    
    // MTD Collected
    const mtdCollected = recentTransactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    // Record Offline Renewal
    const handleRecordAndRenew = async (memberId, name) => {
        const confirmRenewal = window.confirm(`Confirm offline renewal payment of ₹1,200 for ${name} (ID: ${memberId})?`);
        if (!confirmRenewal) return;

        try {
            const memberRef = doc(db, "members", memberId);
            const nowStr = new Date().toISOString();
            
            // Extend the createdAt timestamp by 1 year from now
            await updateDoc(memberRef, {
                createdAt: nowStr,
                status: "Active"
            });

            // Write transaction log
            const transRef = doc(collection(db, "renewal_transactions"));
            await setDoc(transRef, {
                memberId,
                name,
                amount: 1200,
                type: "Annual Renewal",
                date: nowStr
            });

            toast.success(`Membership for ${name} renewed successfully!`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to process renewal.");
        }
    };

    // Upgrade to Life Time Member
    const handleUpgradeToLife = async (memberId, name) => {
        const confirmUpgrade = window.confirm(`Are you sure you want to upgrade ${name} (ID: ${memberId}) to a Life Time Member? Expiry limits will be permanently removed.`);
        if (!confirmUpgrade) return;

        try {
            const memberRef = doc(db, "members", memberId);
            await updateDoc(memberRef, {
                memberType: "Life Time Member",
                status: "Active"
            });

            // Log the upgrade transaction
            const transRef = doc(collection(db, "renewal_transactions"));
            await setDoc(transRef, {
                memberId,
                name,
                amount: 0,
                type: "Upgraded to Life Time",
                date: new Date().toISOString()
            });

            toast.success(`${name} upgraded to Life Time Member successfully!`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to upgrade membership.");
        }
    };

    // Members in grace period alert list
    const graceAlerts = members.filter(m => m.status === "Grace Period");

    return (
        <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
                <FaSyncAlt className="text-xl md:text-2xl text-zinc-700 -mt-0.5" />
                <h1 className="text-2xl font-bold text-gray-800">Membership Renewals</h1>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Associate Members</h3>
                        <p className="text-2xl font-bold text-zinc-800 mt-1">{totalAssociates}</p>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded border border-zinc-100">
                        <FaSyncAlt className="text-zinc-500 text-lg" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Overdue Renewals</h3>
                        <p className="text-2xl font-bold text-red-600 mt-1">{overdueCount}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded border border-red-100">
                        <FiAlertTriangle className="text-red-500 text-lg" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Active Associates</h3>
                        <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded border border-green-100">
                        <FiCheck className="text-green-500 text-lg" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Fees Collected (MTD)</h3>
                        <p className="text-2xl font-bold text-blue-600 mt-1">₹{mtdCollected.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded border border-blue-100">
                        <FiDollarSign className="text-blue-500 text-lg" />
                    </div>
                </div>
            </div>

            {/* Renewals directory & right transactions panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
                        <div>
                            <h3 className="text-lg font-bold text-zinc-800">Renewals Directory</h3>
                            <p className="text-sm text-zinc-500 mt-1">Record offline payments, extend Associate accounts, or upgrade members.</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-48 w-full">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaSearch className="text-zinc-400 text-sm" />
                                </div>
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-3 py-2 border border-zinc-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 bg-zinc-50 text-zinc-800 placeholder-zinc-400"
                                    placeholder="Search ID, Name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="h-10 border border-zinc-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 bg-white text-zinc-700 px-2 font-semibold"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Grace Period">Grace Period</option>
                                <option value="Overdue">Overdue</option>
                            </select>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-16 text-center text-zinc-500 text-sm font-bold">
                            Fetching renewals database...
                        </div>
                    ) : filteredRenewals.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-zinc-200 rounded flex flex-col items-center justify-center">
                            <FaSyncAlt className="text-zinc-300 text-4xl mb-3 animate-spin" />
                            <p className="text-sm font-bold text-zinc-500">No associate members matching criteria.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] border-collapse border border-zinc-200">
                                <thead>
                                    <tr className="bg-zinc-100 border-b border-zinc-200">
                                        {["Member ID", "Name", "Expires On", "Amount Due", "Status", "Actions"].map((head) => (
                                            <th key={head} className="border border-zinc-200 py-3 px-3 text-left text-xs font-bold text-zinc-600 uppercase whitespace-nowrap">
                                                {head}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRenewals.map((renew) => (
                                        <tr key={renew.id} className="hover:bg-zinc-50 transition-colors">
                                            <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-blue-700">
                                                {renew.id}
                                            </td>
                                            <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-800">
                                                {renew.name}
                                            </td>
                                            <td className="border border-zinc-200 py-3 px-3 text-[12px] font-medium text-zinc-500">
                                                {renew.expiryDate}
                                            </td>
                                            <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-800">
                                                {renew.amountDue}
                                            </td>
                                            <td className="border border-zinc-200 py-3 px-3 w-28 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${renew.status === 'Active' ? 'bg-green-100 text-green-700' : renew.status === 'Grace Period' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                    {renew.status}
                                                </span>
                                            </td>
                                            <td className="border border-zinc-200 py-3 px-3 w-52">
                                                <div className="flex gap-2">
                                                    {renew.status !== "Active" && (
                                                        <CustomButton
                                                            label="Record & Renew"
                                                            bgColor="bg-green-600 hover:bg-green-700"
                                                            textColor="text-white"
                                                            className="py-1 px-2 text-xs font-semibold whitespace-nowrap"
                                                            onClick={() => handleRecordAndRenew(renew.id, renew.name)}
                                                        />
                                                    )}
                                                    <CustomButton
                                                        label="Upgrade to Life"
                                                        bgColor="bg-zinc-800 hover:bg-zinc-900"
                                                        textColor="text-white"
                                                        className="py-1 px-2 text-xs font-semibold whitespace-nowrap"
                                                        icon={FaUserGraduate}
                                                        onClick={() => handleUpgradeToLife(renew.id, renew.name)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right widgets log */}
                <div className="space-y-4">
                    {/* Live offline transaction list */}
                    <div className="border border-zinc-200 bg-white p-5 rounded-md shadow-sm">
                        <h3 className="text-sm font-bold text-zinc-800 mb-3 flex items-center gap-1.5 border-b border-zinc-100 pb-2">
                            <FiClock className="text-amber-500" />
                            <span>Recent Payments (Live)</span>
                        </h3>
                        {recentTransactions.length === 0 ? (
                            <div className="border border-dashed border-zinc-200 rounded-md py-8 px-4 text-center">
                                <FaRegCreditCard className="text-zinc-300 text-3xl mx-auto mb-2" />
                                <p className="text-xs font-semibold text-zinc-500">No payment logs in database.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                                {recentTransactions.slice(0, 5).map((tx) => (
                                    <div key={tx.id} className="text-xs p-2.5 bg-zinc-50 rounded border border-zinc-100 flex flex-col gap-1">
                                        <div className="flex justify-between font-bold text-zinc-800">
                                            <span>{tx.name}</span>
                                            <span className="text-green-600">₹{tx.amount}</span>
                                        </div>
                                        <div className="flex justify-between text-zinc-500 font-semibold text-[10px]">
                                            <span>{tx.type}</span>
                                            <span>{new Date(tx.date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Grace period alert widgets */}
                    <div className="border border-zinc-200 bg-white p-5 rounded-md shadow-sm">
                        <h3 className="text-sm font-bold text-zinc-800 mb-3 flex items-center gap-1.5 border-b border-zinc-100 pb-2">
                            <FiAlertTriangle className="text-red-500" />
                            <span>Grace Period Alerts</span>
                        </h3>
                        {graceAlerts.length === 0 ? (
                            <div className="border border-dashed border-zinc-200 rounded-md py-8 px-4 text-center">
                                <FiClock className="text-zinc-300 text-3xl mx-auto mb-2" />
                                <p className="text-xs font-semibold text-zinc-500">No members in grace period.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {graceAlerts.slice(0, 3).map((member) => (
                                    <div key={member.id} className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs flex justify-between items-center font-semibold">
                                        <div>
                                            <p className="font-extrabold">{member.name}</p>
                                            <p className="text-[10px] text-amber-600 mt-0.5">Expires: {member.expiryDate}</p>
                                        </div>
                                        <span className="text-[10px] font-bold bg-amber-100 px-2 py-0.5 rounded">
                                            {member.daysRemaining} days left
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
