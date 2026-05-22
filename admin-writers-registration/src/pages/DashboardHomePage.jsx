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
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FiActivity className="text-zinc-600 animate-pulse" />
                    <span>Dashboard Overview</span>
                </h1>
                <p className="text-sm text-zinc-500 mt-1">Real-time summaries and database logs for TCWA Writer Registry.</p>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Members */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Members</h3>
                            <p className="text-3xl font-black text-zinc-800 mt-2">{stats.totalMembers}</p>
                        </div>
                        <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-100 group-hover:bg-zinc-100 transition-colors">
                            <FaUsers className="text-zinc-500 text-xl" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-400" />
                </div>

                {/* Total Scripts */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Registered Scripts</h3>
                            <p className="text-3xl font-black text-amber-600 mt-2">{stats.totalScripts}</p>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 group-hover:bg-amber-100 transition-colors">
                            <FaFileAlt className="text-amber-500 text-xl" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400" />
                </div>

                {/* Pending Renewals */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Pending Renewals</h3>
                            <p className="text-3xl font-black text-red-600 mt-2">{stats.pendingRenewals}</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-100 group-hover:bg-red-100 transition-colors">
                            <FaSyncAlt className="text-red-500 text-xl" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-400" />
                </div>

                {/* Total Revenue */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Revenue</h3>
                            <p className="text-3xl font-black text-green-600 mt-2">₹{stats.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-100 group-hover:bg-green-100 transition-colors">
                            <FaRupeeSign className="text-green-500 text-xl" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-400" />
                </div>
            </div>

            {/* Dashboard tables section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Submissions */}
                <div className="border border-zinc-200 bg-white p-5 rounded-lg shadow-sm space-y-4">
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
                <div className="border border-zinc-200 bg-white p-5 rounded-lg shadow-sm space-y-4">
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