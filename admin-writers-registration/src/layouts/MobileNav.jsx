import { useEffect, useState } from 'react';
import { NavLink } from "react-router-dom";
import { FaHome, FaUserPlus, FaUsers, FaFileInvoice, FaSync, FaBell } from "react-icons/fa";

const allNavLinks = [
    { path: "/", label: "Dashboard", icon: FaHome, permission: null },
    { path: "/members", label: "Members", icon: FaUsers, permission: "Members" },
    { path: "/registrations", label: "Registrations", icon: FaFileInvoice, permission: "Registrations" },
    { path: "/renewals", label: "Renewals", icon: FaSync, permission: "Renewals" },
    { path: "/notifications", label: "Notifications", icon: FaBell, permission: "Notifications" },
    { path: "/create-admin", label: "Create Admin", icon: FaUserPlus, permission: "Create Admin" },
];

export function MobileNav({ user, onClose, open }) {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (open) {
            setIsAnimating(true);
        }
    }, [open]);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
        }, 300); // Match this with transition duration
    };

    const navClass = ({ isActive }) => `focus:outline-gray-50/10 w-full flex items-center gap-1 text-sm font-semibold px-2.5 py-1.5 rounded-md transition ${isActive ? "bg-white text-[#303030]" : "text-[#303030] hover:bg-gray-100"} active:scale-[0.97] active:bg-white`;

    const getVisibleLinks = () => {
        if (!user || !user.isAdmin) {
            return allNavLinks; // Super admins see all links
        }
        const userPermissions = user.permissions || [];
        return allNavLinks.filter(link => {
            const hasPermission = !link.permission || userPermissions.includes(link.permission);

            // Special case for transition from 'Create Admin' to 'Add User'
            if (!hasPermission && link.permission === 'Add User' && userPermissions.includes('Create Admin')) {
                return true;
            }

            return hasPermission;
        });
    };

    const visibleLinks = getVisibleLinks();

    return (
        <div
            className={`block md:hidden w-full h-screen bg-black/40 fixed z-40 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleClose}
        >
            <div
                className={`w-60 bg-[#ebebeb] h-full rounded-t-xl flex flex-col transition-transform duration-300 ease-out ${isAnimating ? 'translate-x-0' : '-translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4">
                    <div className='flex flex-col gap-1.5'>
                        {visibleLinks.map((link) => (
                            <NavLink key={link.path} to={link.path} end={link.path === "/"} className={navClass} onClick={handleClose}>
                                <link.icon className="text-lg" />
                                <span className="mt-px">{link.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
