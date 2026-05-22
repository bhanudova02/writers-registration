import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
// Removed unused imports
import { Header } from '../components/Header';
import { AsideLayout } from './AsideLayout';
import { MobileNav } from './MobileNav';

const DashboardLayout = ({ user }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <div className='bg-zinc-800 h-screen flex flex-col relative'>
      <Header
        user={user}
        mobileNavOpen={mobileNavOpen}
        setMobileNavOpen={setMobileNavOpen}
      />
      <div className='flex flex-1 overflow-hidden rounded-t-xl'>
        <AsideLayout user={user} />

        <div>
          {mobileNavOpen && (
            <MobileNav user={user} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
          )}
        </div>

        <div className='bg-gray-100 h-full flex flex-1 overflow-y-auto only-scroll-width px-2 md:px-4 lg:px-6 pt-4'>
          <div className='w-full'>
            <Outlet />
            {/* bottom white space */}
            <div className='pt-4' />
          </div>
        </div>
      </div>


    </div>
  );
};

export default DashboardLayout;
