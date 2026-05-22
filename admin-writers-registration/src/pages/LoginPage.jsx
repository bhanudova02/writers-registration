import { FcGoogle } from "react-icons/fc";
import { Link } from "react-router-dom";

const LoginPage = () => {
  return (
    <div className="flex justify-center items-center h-screen p-4 bg-linear-to-r from-indigo-900 to-zinc-900">
      <div className="w-full md:w-[60%] lg:max-w-md bg-white border border-gray-300 rounded-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome Back 👋
          </h1>
          <p className="text-gray-500 mt-2">
            Sign in to continue
          </p>
        </div>

        <a
          href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google`}
          className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded-lg py-3 font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <FcGoogle size={22} />
          Continue with Google
        </a>

        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="px-3 text-sm text-gray-400">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="text-center">
          <Link to="/admin-login" className="font-medium text-blue-600 hover:text-blue-500">
            Login as User
          </Link>
        </div>

        <p className="text-xs text-center text-gray-500 mt-6">
          Secure login powered by Google
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

