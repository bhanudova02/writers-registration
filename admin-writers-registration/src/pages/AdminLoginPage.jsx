import { useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { signInWithPopup, signOut } from 'firebase/auth'
import { auth, db, googleProvider } from '../firebase'
import { FcGoogle } from "react-icons/fc"
import CustomButton from '../components/custom/CustomButton'
import CustomInput from '../components/custom/CustomInput'
import { isAllowedAdmin } from '../App'
import { useNavigate } from 'react-router-dom'
import { logAdminActivity } from '../lib/logger'

const bootstrapAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export default function AdminLoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  // Modal state
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleGoogleLogin() {
    setLoading(true)
    setErrorModalOpen(false)
    setErrorMessage('')
    
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const allowed = await isAllowedAdmin(result.user)

      if (!allowed) {
        await signOut(auth)
        setErrorMessage('The email you used is not authorized to access the admin dashboard.')
        setErrorModalOpen(true)
        return
      }

      onLogin(result.user)
      await logAdminActivity(result.user.email, "Login", "User logged into admin dashboard via Google SSO")
      navigate('/')
    } catch (loginError) {
      await signOut(auth).catch(() => {}) // Ensure signed out on error
      
      let msg = loginError.message || 'Google login failed.'
      if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
        msg = 'The email you used is not authorized to access the admin dashboard.'
      } else if (msg.includes('auth/popup-blocked')) {
        msg = 'Login popup was blocked by your browser. Please allow popups for this site and try again.'
      } else if (msg.includes('auth/popup-closed-by-user')) {
        msg = 'Login was cancelled. Please complete the Google sign-in process to continue.'
      } else if (msg.includes('auth/cancelled-popup-request')) {
        msg = 'Another login request is already pending. Please close it and try again.'
      }
      
      setErrorMessage(msg)
      setErrorModalOpen(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center h-screen p-4 bg-linear-to-r from-indigo-900 to-zinc-900">
      <div className="w-full md:w-[60%] lg:max-w-md bg-white border border-gray-300 rounded-xl px-8 py-10 shadow-2xl flex flex-col justify-center">
        <div className="flex flex-col items-center mb-6">
          <img src="/Logo.png" alt="TCWA Logo" className="h-16 object-contain mb-3" />
          <h2 className="text-lg font-bold text-gray-800 text-center leading-tight">Telugu Cine Writers Association</h2>
          <span className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider mt-1 bg-indigo-50 px-2 py-0.5 rounded-full">Admin Dashboard</span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-800">
            Welcome Back 👋
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Sign in to continue
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded-lg py-3 font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
        >
          <FcGoogle size={22} />
          {loading ? 'Checking...' : 'Continue with Google'}
        </button>

        <p className="text-xs text-center text-gray-500 mt-6">
          Secure login powered by Google
        </p>
        {/* Removed the VITE_ADMIN_EMAILS warning message as the database admins collection is now fully configured */}
      </div>

      {/* Error Modal */}
      {errorModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-sm shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-sm text-gray-600 mb-2">
                {errorMessage}
              </p>
              <p className="text-sm text-gray-500 mb-6 font-medium">
                Please contact the admin if you want to access.
              </p>
              <button
                onClick={() => setErrorModalOpen(false)}
                className="w-full bg-red-600 text-white font-semibold py-2.5 rounded-sm hover:bg-red-700 transition shadow-md shadow-red-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
