import { FaHome, FaUserPlus, FaUsers, FaFileInvoice, FaSync, FaBell, FaSms, FaPrint } from "react-icons/fa";
import { NavLink } from "react-router-dom";

const allNavLinks = [
    { path: "/", label: "Dashboard", icon: FaHome, permission: null },
    { path: "/members", label: "Members", icon: FaUsers, permission: "Members" },
    { path: "/registrations", label: "Registrations", icon: FaFileInvoice, permission: "Registrations" },
    { path: "/renewals", label: "Renewals", icon: FaSync, permission: "Renewals" },
    { path: "/communication-logs", label: "Comm. Logs", icon: FaSms, permission: "Notifications" },
    { path: "/notifications", label: "Notifications", icon: FaBell, permission: "Notifications" },
    { path: "/reports", label: "Reports", icon: FaPrint, permission: "Members" },
];

export function AsideLayout({ user }) {
    const navClass = ({ isActive }) => `focus:outline-gray-50/10 w-full flex items-center gap-1 text-[13px] font-semibold px-2.5 py-1 rounded-md transition ${isActive ? "bg-white text-[#303030]" : "text-[#303030] hover:bg-gray-100"} active:scale-[0.97] active:bg-white`;

    const getVisibleLinks = () => {
        if (!user || !user.isAdmin) {
            return allNavLinks; // Super admins see all links
        }
        const userPermissions = user.permissions || [];
        return allNavLinks.filter(link => {
            // The dashboard link is always visible, and other links are checked against permissions
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
        <div className='bg-[#ebebeb] hidden md:block w-48 xl:w-60 h-full overflow-y-auto px-2.5 pt-4 pb-1'>
            <div className="flex flex-col justify-between gap-4 h-full">
                <div className='flex flex-col gap-0.75'>
                    {visibleLinks.map((link) => (
                        <NavLink key={link.path} to={link.path} end={link.path === "/"} className={navClass}>
                            <link.icon className="text-lg" />
                            <span className="mt-px">{link.label}</span>
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    )
}
