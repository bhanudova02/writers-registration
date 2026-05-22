import React from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertTriangle, FiHome } from "react-icons/fi";

export default function InvalidPage() {
    const navigate = useNavigate();
    const handleGoHome = () => {
        navigate("/");
    };

    return (
        <div className="w-full p-20 bg-white/50 rounded-lg">
            <div>
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-red-500 mb-2">Oops!</h1>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">404 ERROR</h2>
                    <button onClick={handleGoHome} className="bg-gray-400 hover:bg-gray-700 cursor-pointer text-white py-2 px-4 rounded-sm transition-colors duration-200 font-semibold">
                        Go Home
                    </button>
                </div>
            </div>
        </div>
    )
}