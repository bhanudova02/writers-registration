import { useState, useEffect } from 'react';
import { User, ShieldAlert, RefreshCw, Key, Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db, setupRecaptcha, sendOtp } from '../firebase';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Login({ setMember, setIsLoggedIn }) {
  const [membershipId, setMembershipId] = useState('');
  const [phone, setPhone] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const handleVerifyDetails = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsValidating(true);

    if (!membershipId.trim() || !phone.trim()) {
      setLoginError('Both Membership ID and Mobile Number are required.');
      setIsValidating(false);
      return;
    }

    try {
      const docId = membershipId.trim().toUpperCase();
      const memberRef = doc(db, 'members', docId);
      const docSnap = await getDoc(memberRef);

      if (!docSnap.exists()) {
        setLoginError('Membership ID not found in database. Please contact Admin.');
        setIsValidating(false);
        return;
      }

      const memberData = docSnap.data();
      const enteredPhoneDigits = phone.replace(/\D/g, '').slice(-10);
      const registeredPhoneDigits = String(memberData.mobileNumber || '').replace(/\D/g, '').slice(-10);

      if (!enteredPhoneDigits || enteredPhoneDigits !== registeredPhoneDigits) {
        setLoginError('Mobile number does not match this Membership ID.');
        setIsValidating(false);
        return;
      }

      const formattedPhone = `+91${enteredPhoneDigits}`;

      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = setupRecaptcha('recaptcha-container');
      }
      const appVerifier = window.recaptchaVerifier;

      const confirmation = await sendOtp(formattedPhone, appVerifier);
      setConfirmationResult(confirmation);

      setMember({
        membershipId: docId,
        name: memberData.name,
        memberType: memberData.memberType,
        status: memberData.status,
        mobileNumber: memberData.mobileNumber,
        email: memberData.email,
        createdAt: memberData.createdAt
      });

      setShowOtpScreen(true);
      setOtpError('');
      setResendTimer(60);
      setCanResend(false);
    } catch (error) {
      console.error("Firebase sendOtp failed:", error);
      const errorCode = error.code || '';
      const errorMessage = error.message || String(error);

      if (errorCode === 'auth/too-many-requests' || errorMessage.includes('too-many-requests')) {
        setLoginError('Security Alert: You have requested too many OTPs. Please wait 15-30 minutes before trying again.');
      } else if (errorCode === 'auth/invalid-phone-number' || errorMessage.includes('invalid-phone-number')) {
        setLoginError('Invalid mobile number format. Please check your number.');
      } else {
        setLoginError(`Failed to send SMS OTP. Please try again later.`);
      }
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    let interval;
    if (showOtpScreen && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [showOtpScreen, resendTimer]);

  const handleResendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!canResend) return;
    setResendTimer(60);
    setCanResend(false);
    setOtpError('');
    await handleVerifyDetails(e || new Event('submit'));
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    setIsValidating(true);

    try {
      if (!confirmationResult) {
        setOtpError('Authentication session expired. Please request a new OTP.');
        setIsValidating(false);
        return;
      }
      const result = await confirmationResult.confirm(otpCode);
      console.log("Firebase Phone Auth verified user:", result.user);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Firebase code verification failed:", error);
      setOtpError('Invalid OTP Code. Please check the code and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-zinc-900">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-50/50 via-white to-white pointer-events-none" />
        <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-600 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert size={14} />
              <span>Secure Writer Portal</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight text-zinc-900">
              Telugu Cine Writers <br/>
              <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                Association Portal
              </span>
            </h1>
            <p className="text-zinc-600 text-base max-w-lg leading-relaxed">
              Verify your Membership credentials to upload, secure, and register your scripts. Your scripts are private and protected with 100% encryption.
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-md pt-4">
              <div className="p-4 bg-white/40 border border-zinc-200 rounded">
                <p className="text-amber-600 font-black text-xl">2,600+</p>
                <p className="text-zinc-500 text-xs font-semibold mt-1">Active Members</p>
              </div>
              <div className="p-4 bg-white/40 border border-zinc-200 rounded">
                <p className="text-amber-600 font-black text-xl">100%</p>
                <p className="text-zinc-500 text-xs font-semibold mt-1">Script Privacy</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 w-full">
            <div id="recaptcha-container"></div>
            {!showOtpScreen ? (
              <form onSubmit={handleVerifyDetails} className="bg-white/90 border border-zinc-200 p-6 sm:p-8 rounded-lg shadow-2xl space-y-5 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded bg-amber-500 text-white shadow-md">
                    <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">Member Sign In</h2>
                    <p className="text-xs text-zinc-500">Strict Database Validation</p>
                  </div>
                </div>
                {loginError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-xs font-semibold">
                    {loginError}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-2">
                      Membership ID
                    </label>
                    <input
                      type="text"
                      value={membershipId}
                      onChange={(e) => setMembershipId(e.target.value)}
                      placeholder="e.g. TCWA1001"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-2">
                      Registered Mobile Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isValidating}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3 px-4 rounded text-sm transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Validating Account...</span>
                    </>
                  ) : (
                    <span>Request OTP Code</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="bg-white/90 border border-zinc-200 p-6 sm:p-8 rounded-lg shadow-2xl space-y-5 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded bg-amber-500 text-white shadow-md">
                    <Key size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">Enter OTP Code</h2>
                    <p className="text-xs text-zinc-500">Code sent to: {phone}</p>
                  </div>
                </div>
                {otpError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-xs font-semibold">
                    {otpError}
                  </div>
                )}
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 p-3 rounded text-xs font-semibold text-center leading-relaxed">
                  Real OTP sent via SMS to <span className="font-extrabold text-zinc-900">{phone}</span>.
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-2">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-Digit OTP"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-amber-500 tracking-[0.3em] text-center font-bold"
                    maxLength={6}
                    required
                  />
                </div>
                <div className="text-center pb-2">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isValidating}
                      className="text-xs font-bold text-amber-500 hover:text-amber-600 underline transition disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  ) : (
                    <p className="text-xs text-zinc-500 font-semibold">
                      Resend OTP in <span className="text-amber-600">{resendTimer}s</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowOtpScreen(false)}
                    className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-2.5 px-4 rounded text-xs transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isValidating}
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded text-xs transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isValidating && <Loader2 size={14} className="animate-spin" />}
                    Confirm Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
