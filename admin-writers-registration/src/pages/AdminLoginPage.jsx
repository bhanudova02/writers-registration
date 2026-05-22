import { useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { signInWithPopup, signOut } from 'firebase/auth'
import { auth, db, googleProvider } from '../firebase'
import { FcGoogle } from "react-icons/fc"
import CustomButton from '../components/custom/CustomButton'
import CustomInput from '../components/custom/CustomInput'
import { isAllowedAdmin } from '../App'
import { useNavigate } from 'react-router-dom'

const bootstrapAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export default function AdminLoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('google')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  async function handleEmployeeLogin(event) {
    event.preventDefault()
    if (!username || !password) {
      setError('Please enter both username and password.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const adminsQuery = query(
        collection(db, 'admins'),
        where('username', '==', username.trim()),
        where('active', '==', true),
      )
      const snapshot = await getDocs(adminsQuery)
      const adminDoc = snapshot.docs.find((item) => item.data().password === password)

      if (!adminDoc) {
        setError('Invalid username or password.')
        return
      }

      const employee = {
        uid: adminDoc.id,
        isEmployee: true,
        displayName: adminDoc.data().displayName || adminDoc.data().username,
        email: adminDoc.data().email,
        permissions: adminDoc.data().permissions || ['Dashboard'],
      }
      sessionStorage.setItem('employee_admin', JSON.stringify(employee))
      onLogin(employee)
      navigate('/')
    } catch (loginError) {
      setError(loginError.message || 'Employee login failed.')
    } finally {
      setLoading(false)
    }
  }

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
      navigate('/')
    } catch (loginError) {
      setError(loginError.message || 'Google login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center h-screen p-4 bg-linear-to-r from-indigo-900 to-zinc-900">
      <div className="w-full md:w-[60%] lg:max-w-md bg-white border border-gray-300 rounded-md p-8">
        {mode === 'google' ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800">
                Welcome Back 👋
              </h1>
              <p className="text-gray-500 mt-2">
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

            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="px-3 text-sm text-gray-400">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="text-center">
              <button onClick={() => { setMode('employee'); setError('') }} className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                Login as User
              </button>
            </div>

            <p className="text-xs text-center text-gray-500 mt-6">
              Secure login powered by Google
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center text-gray-800">Admin Login</h1>
            <form className="space-y-6 mt-8" onSubmit={handleEmployeeLogin}>
                <CustomInput
                    label="Username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    disabled={loading}
                />
                <CustomInput
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={loading}
                />
                <div>
                    <CustomButton
                        type="submit"
                        label={loading ? 'Logging in...' : 'Login'}
                        className="w-full"
                        disabled={loading}
                    />
                </div>
            </form>
            <div className="text-center mt-6">
                <button 
                  type="button" 
                  onClick={() => { setMode('google'); setError('') }} 
                  className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer"
                  disabled={loading}
                >
                    Login with Google
                </button>
            </div>
          </>
        )}
        {error && <p className="mt-5 text-center text-sm font-semibold text-red-600">{error}</p>}
        {bootstrapAdminEmails.length === 0 && <p className="mt-5 text-center text-xs font-semibold text-amber-700">Add VITE_ADMIN_EMAILS in .env to allow first admin login.</p>}
      </div>
    </div>
  )
}
