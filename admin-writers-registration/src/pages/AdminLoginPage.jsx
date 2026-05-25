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
  const [error, setError] = useState('')

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const allowed = await isAllowedAdmin(result.user)

      if (!allowed) {
        await signOut(auth)
        navigate('/unauthorized')
        return
      }

      onLogin(result.user)
      await logAdminActivity(result.user.email, "Login", "User logged into admin dashboard via Google SSO")
      navigate('/')
    } catch (loginError) {
      setError(loginError.message || 'Google login failed.')
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

        {error && <p className="mt-5 text-center text-sm font-semibold text-red-600">{error}</p>}
        {bootstrapAdminEmails.length === 0 && <p className="mt-5 text-center text-xs font-semibold text-amber-700">Add VITE_ADMIN_EMAILS in .env to allow first admin login.</p>}
      </div>
    </div>
  )
}
