import { useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { MdLogout } from 'react-icons/md';
import { LuCheck, LuMenu } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';

export function Header({ user, mobileNavOpen, setMobileNavOpen }) {
    const [profileOpen, setProfileOpen] = useState(false);

    const handleLogout = async () => {
        if (user?.isEmployee) {
            sessionStorage.removeItem('employee_admin');
        } else {
            await auth.signOut();
        }
        window.location.href = "/admin-login";
    };

    if (!user) {
        return null; // This is why the header was disappearing. It now gets a user object for both types.
    }

    return (
        <header className='bg-zinc-800 text-white px-4 pt-2 pb-1.5 flex items-center justify-between'>
            <div className='flex items-center gap-6'>
                {/* Mobile Menu Button - Hidden on desktop */}
                <button onClick={() => setMobileNavOpen(prev => !prev)} className={`md:hidden text-white px-2 py-1.5 rounded-lg transition-all duration-300 ease-in-out active:scale-95 ${mobileNavOpen ? "bg-[#111111cb] shadow-sm shadow-white/60 " : ""}`}>
                    <LuMenu className='text-[22px]' />
                </button>

                {/* Logo */}
                <Link to="/" className='flex items-center gap-3 font-semibold'>
                    <img src='/Logo.png' alt="TCWA logo" className='hidden md:block h-8 object-contain' />
                    <div className='hidden md:flex flex-col justify-center'>
                        <span className="text-sm font-bold text-white leading-tight">Telugu Cine Writers</span>
                        <span className="text-[10px] text-zinc-400 font-medium leading-none mt-0.5">Association</span>
                    </div>
                </Link>
            </div>

            {/* Profile Button - Right always */}
            <div className='flex justify-end'>
                <button
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-1.5 py-1 shadow-sm shadow-gray-700 border border-gray-800 hover:border-gray-600 transition-all duration-300 cursor-pointer rounded-md select-none active:scale-[0.97] active:bg-gray-700
                        ${profileOpen ? "border-zinc-600" : ""}
                    `}
                >
                    {user.avatar ? (
                        <img src={user.avatar} alt="User Avatar" className='w-6 h-6 rounded-full' />
                    ) : (
                        <div className='bg-blue-500 p-1.5 rounded-md'>
                            <FaUser className='w-3 h-3 text-white' />
                        </div>
                    )}
                    <h5 className='text-white text-[12px] font-semibold'>My Profile</h5>
                </button>
            </div>

            {profileOpen && (
                <div className='fixed inset-0 z-50' onClick={() => setProfileOpen(false)}>
                    <div
                        className='absolute w-[66%] md:w-[35%] lg:w-[25%] bg-white rounded-lg border border-gray-200 z-30 top-[8.5%] right-3'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className='flex justify-between items-center text-xs md:text-sm font-semibold text-gray-800 p-1.5 px-2 m-1.5 bg-gray-100 rounded-md'>
                            <div className='flex items-center gap-1'>
                                {user.avatar ? (
                                    <img src={user.avatar} alt="User Avatar" className='w-6 h-6 rounded-full' />
                                ) : (
                                    <div className='bg-blue-600 p-1.5 rounded-md'>
                                        <FaUser className='w-2.5 h-2.5 text-gray-50' />
                                    </div>
                                )}
                                <h2>{user.displayName}'s Profile</h2>
                            </div>
                            <LuCheck />
                        </div>

                        <div className='px-3 pt-1.5 pb-3 text-xs md:text-sm space-y-1.5 text-zinc-700'>
                            <h6>Name: <span className='font-semibold'>{user.displayName}</span></h6>
                            {user.email && <h6>Email: <span className='font-semibold'>{user.email}</span></h6>}
                        </div>

                        <div
                            onClick={handleLogout}
                            className='hover:bg-gray-100 p-1.5 cursor-pointer m-2 border-t border-gray-200 text-gray-600'
                        >
                            <div className='flex items-center gap-1 text-[13px] font-bold'>
                                <span className='p-1 rounded-md'>
                                    <MdLogout className='w-4 h-4' />
                                </span>
                                {'Logging out...'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
