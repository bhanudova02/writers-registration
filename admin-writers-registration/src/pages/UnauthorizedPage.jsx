import { Link } from "react-router-dom";
import { FiLock, FiHome, FiLogIn } from "react-icons/fi";

const UnauthorizedPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-r from-slate-900 to-slate-700 px-4">
      <div className="max-w-md w-full bg-white rounded-sm p-8 text-center">
        
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 text-red-600 p-4 rounded-full">
            <FiLock size={32} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">
          Access Denied
        </h1>

        {/* Message */}
        <p className="text-gray-600 text-sm sm:text-base mb-3">
          Your email address is not authorized to access this application.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          If you believe this is a mistake, please contact the administrator.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-md bg-gray-200 text-gray-700 font-medium hover:bg-gray-200 transition"
          >
            <FiHome />
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
