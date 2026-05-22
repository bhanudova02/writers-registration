import React from 'react';

const Profile = ({ user }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4">User Profile</h2>
      {user ? (
        <div className="text-center">
          {user.photo ? (
            <img src={user.photo} alt={user.displayName} className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-gray-300" />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-blue-500 text-white flex items-center justify-center text-4xl font-bold border-2 border-gray-300">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <p className="text-lg font-semibold">Name: {user.displayName}</p>
          <p className="text-gray-600">Email: {user.email}</p>
        </div>
      ) : (
        <p className="text-gray-500">No user data available.</p>
      )}
    </div>
  );
};

export default Profile;
