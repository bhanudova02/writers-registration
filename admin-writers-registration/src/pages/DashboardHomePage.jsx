import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { FaUsers, FaFileAlt, FaSyncAlt, FaRupeeSign } from "react-icons/fa";
import { FiTrendingUp, FiCheckCircle, FiClock, FiActivity } from "react-icons/fi";

export default function DashboardHomePage() {
    const [stats, setStats] = useState({
        totalMembers: 0,
        totalScripts: 0,
        totalRevenue: 0,
        pendingRenewals: 0
    });
    const [recentRegs, setRecentRegs] = useState([]);
    const [recentMembers, setRecentMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);

        // 1. Listen to members
        const unsubMembers = onSnapshot(collection(db, "members"), (snapshot) => {
            let membersCount = 0;
            let pendingRenewalsCount = 0;
            const membersList = [];

            snapshot.forEach((docSnap) => {
                membersCount++;
                const data = docSnap.data();
                membersList.push({ id: docSnap.id, ...data });

                // Check pending renewals for associate members
                if (data.memberType === "Associate Member") {
                    const createdDate = data.createdAt ? new Date(data.createdAt) : new Date();
                    const expiryDate = new Date(createdDate);
                    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                    const now = new Date();
                    if (expiryDate.getTime() < now.getTime()) {
                        pendingRenewalsCount++;
                    }
                }
            });

            // Sort members by createdDate
            membersList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setRecentMembers(membersList.slice(0, 5));

            setStats(prev => ({
                ...prev,
                totalMembers: membersCount,
                pendingRenewals: pendingRenewalsCount
            }));
        });

        // 2. Listen to registrations
        const unsubRegs = onSnapshot(collection(db, "registrations"), (snapshot) => {
            let scriptsCount = 0;
            let regRevenue = 0;
            const regsList = [];

            snapshot.forEach((docSnap) => {
                scriptsCount++;
                const data = docSnap.data();
                regsList.push({ id: docSnap.id, ...data });
                if (data.status === "Approved" && data.amount) {
                    regRevenue += parseFloat(data.amount) || 0;
                }
            });

            regsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setRecentRegs(regsList.slice(0, 5));

            setStats(prev => ({
                ...prev,
                totalScripts: scriptsCount,
                totalRevenue: prev.totalRevenue + regRevenue
            }));
        });

        // 3. Listen to renewal transactions for revenue calculation
        const unsubTx = onSnapshot(collection(db, "renewal_transactions"), (snapshot) => {
            let txRevenue = 0;
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                txRevenue += parseFloat(data.amount) || 0;
            });
            
            setStats(prev => ({
                ...prev,
                totalRevenue: prev.totalRevenue + txRevenue
            }));
            setIsLoading(false);
        });

        return () => {
            unsubMembers();
            unsubRegs();
            unsubTx();
        };
    }, []);

    return (
        <div className="p-3 sm:p-6">
            <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                    <FiActivity className="text-lg md:text-xl text-zinc-600 animate-pulse -mt-0.5" />
                    <h1 className="text-base sm:text-xl font-bold text-gray-800">Dashboard Overview</h1>
                </div>
                <p className="text-sm text-zinc-500 mt-1">Real-time summaries and database logs for TCWA Writer Registry.</p>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {/* Total Members */}
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Members</h3>
                        <p className="text-xl sm:text-2xl font-bold text-zinc-800 mt-1">{stats.totalMembers}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-zinc-50 rounded border border-zinc-100">
                        <FaUsers className="text-zinc-500 text-base sm:text-lg" />
                    </div>
                </div>

                {/* Total Scripts */}
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Registered Scripts</h3>
                        <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">{stats.totalScripts}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-amber-50 rounded border border-amber-100">
                        <FaFileAlt className="text-amber-500 text-base sm:text-lg" />
                    </div>
                </div>

                {/* Pending Renewals */}
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Pending Renewals</h3>
                        <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{stats.pendingRenewals}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-red-50 rounded border border-red-100">
                        <FaSyncAlt className="text-red-500 text-base sm:text-lg" />
                    </div>
                </div>

                {/* Total Revenue */}
                <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Revenue</h3>
                        <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-50 rounded border border-green-100">
                        <FaRupeeSign className="text-green-500 text-base sm:text-lg" />
                    </div>
                </div>
            </div>

            {/* Dashboard tables section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Submissions */}
                <div className="border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                        <FiTrendingUp className="text-amber-500 text-lg" />
                        <div>
                            <h3 className="text-base font-bold text-zinc-800">Recent Script Registrations</h3>
                            <p className="text-xs text-zinc-500">Latest movie scripts verified via digital stamps.</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-8 text-center text-zinc-400 text-xs font-bold">
                            Loading activity logs...
                        </div>
                    ) : recentRegs.length === 0 ? (
                        <div className="py-8 text-center text-zinc-400 text-xs font-bold border border-dashed border-zinc-200 rounded">
                            No registered scripts in database yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentRegs.map((reg) => (
                                <div key={reg.id} className="flex justify-between items-center p-3 bg-zinc-50 rounded border border-zinc-100 text-xs">
                                    <div>
                                        <p className="font-extrabold text-zinc-800">{reg.title}</p>
                                        <p className="text-[10px] text-zinc-500 mt-0.5">By: {reg.writerName} (ID: {reg.membershipId})</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded text-[10px]">
                                            ₹{reg.amount}
                                        </span>
                                        <p className="text-[9px] text-zinc-400 mt-1 font-semibold">
                                            {new Date(reg.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Member Uploads */}
                <div className="border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                        <FiCheckCircle className="text-green-500 text-lg" />
                        <div>
                            <h3 className="text-base font-bold text-zinc-800">Newly Registered Members</h3>
                            <p className="text-xs text-zinc-500">Newly added writers to the database.</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-8 text-center text-zinc-400 text-xs font-bold">
                            Loading member directory...
                        </div>
                    ) : recentMembers.length === 0 ? (
                        <div className="py-8 text-center text-zinc-400 text-xs font-bold border border-dashed border-zinc-200 rounded">
                            No members found in directory.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentMembers.map((member) => (
                                <div key={member.id} className="flex justify-between items-center p-3 bg-zinc-50 rounded border border-zinc-100 text-xs">
                                    <div>
                                        <p className="font-extrabold text-zinc-800">{member.name}</p>
                                        <p className="text-[10px] text-zinc-500 mt-0.5">ID: {member.membershipId} • Type: {member.memberType}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${member.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                            {member.status}
                                        </span>
                                        <p className="text-[9px] text-zinc-400 mt-1 font-semibold">
                                            {new Date(member.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}