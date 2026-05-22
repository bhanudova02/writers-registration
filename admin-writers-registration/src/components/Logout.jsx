import React from 'react';

const Logout = () => {
  return (
    <div className="p-4">
      <a href={`${import.meta.env.VITE_API_URL}/api/auth/logout`} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
        Logout
      </a>
    </div>
  );
};

export default Logout;
