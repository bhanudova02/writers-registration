import { useState, useEffect } from 'react';
import { User, ShieldAlert, RefreshCw, Key, Loader2, Users, Shield, ArrowRight, Smartphone, Mail, Lock, PhoneCall, MessageCircle, X } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db, setupRecaptcha, sendOtp } from '../firebase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SupportModal from '../components/SupportModal';

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
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [recaptchaKey, setRecaptchaKey] = useState(0);

  const handleVerifyDetails = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsValidating(true);

    if (!membershipId.trim() || !phone.trim()) {
      setLoginError('Both Membership ID and Mobile Number are required.');
      setIsValidating(false);
      return;
    }

    // Developer Bypass for Local Testing
    if (import.meta.env.DEV && membershipId.trim().toUpperCase() === 'TEST') {
      setMember({
        membershipId: 'TEST1001',
        name: 'Test Developer',
        memberType: 'Writer',
        status: 'Active',
        mobileNumber: phone,
        email: 'test@tcwa.in',
        createdAt: new Date().toISOString()
      });
      setIsLoggedIn(true);
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
        window.recaptchaVerifier = setupRecaptcha(`recaptcha-container-${recaptchaKey}`);
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
      
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.error("Error clearing recaptcha", e);
        }
        window.recaptchaVerifier = null;
      }
      setRecaptchaKey(prev => prev + 1);
      
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

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.error("Error clearing recaptcha on unmount", e);
        }
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const handleResendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!canResend) return;
    
    setOtpCode('');
    setOtpError('');
    setResendTimer(60);
    setCanResend(false);
    
    // Clear old recaptcha to force a fresh one for resend and avoid errors
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (err) {}
      window.recaptchaVerifier = null;
    }
    setRecaptchaKey(prev => prev + 1);
    
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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-zinc-900">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden bg-gradient-to-br from-slate-200 via-slate-100 to-slate-50">
        <div className="w-full max-w-[1000px] grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10 mx-auto">
          <div className="space-y-5 text-left">
            {/* SECURE WRITER PORTAL Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-full text-orange-500 text-[10px] font-bold uppercase tracking-widest">
              <ShieldAlert size={12} />
              <span>Secure Writer Portal</span>
            </div>

            {/* Main Heading */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-slate-900">
                Telugu Cine Writers<br />
                <span className="text-orange-500">Association Portal</span>
              </h1>
              {/* Orange Line */}
              <div className="w-16 h-1 bg-orange-500 mt-4 rounded-full"></div>
            </div>

            {/* Paragraph */}
            <p className="text-slate-600 text-sm max-w-md leading-relaxed pt-1">
              A secure and dedicated platform for our writers to register, protect, and manage their scripts with complete confidentiality.
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 max-w-[420px] pt-2">
              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm text-center flex flex-col items-center">
                <div className="size-11 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-3">
                  <Users size={22} />
                </div>
                <p className="text-orange-500 font-bold text-xl">2,600+</p>
                <p className="text-slate-900 text-[11px] font-bold mt-1">Active Members</p>
                <p className="text-slate-500 text-[10px] font-medium mt-1.5 leading-relaxed">Growing community of<br />creative writers</p>
              </div>
              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm text-center flex flex-col items-center">
                <div className="size-11 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mb-3">
                  <Shield size={22} />
                </div>
                <p className="text-purple-600 font-bold text-xl">100%</p>
                <p className="text-slate-900 text-[11px] font-bold mt-1">Script Privacy</p>
                <p className="text-slate-500 text-[10px] font-medium mt-1.5 leading-relaxed">End-to-end encryption<br />for total protection</p>
              </div>
            </div>

            {/* Alert Box */}
            <div className="flex items-center gap-4 p-4 bg-[#eff6ff] border border-blue-100/50 rounded-xl max-w-[420px] mt-2">
              <div className="shrink-0 size-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <Shield size={14} />
              </div>
              <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                Your data is protected with industry-standard encryption. We never share your information with anyone.
              </p>
            </div>
          </div>
          <div className="w-full max-w-[480px] justify-self-end">
            <div id={`recaptcha-container-${recaptchaKey}`} key={recaptchaKey}></div>
            {!showOtpScreen ? (
              <form onSubmit={handleVerifyDetails} className="bg-white border-2 border-slate-100 px-10 py-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm">
                    <User size={26} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Member Verification</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Strict Database Validation</p>
                    <div className="w-10 h-0.5 bg-orange-500 mt-2 rounded-full"></div>
                  </div>
                </div>
                {loginError && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-medium">
                    {loginError}
                  </div>
                )}
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-2">
                      Membership ID
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="text-slate-400" size={18} strokeWidth={1.5} />
                      </div>
                      <input
                        type="text"
                        value={membershipId}
                        onChange={(e) => setMembershipId(e.target.value)}
                        placeholder="e.g. TCWA1001"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-2">
                      Registered Mobile Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Smartphone className="text-slate-400" size={18} strokeWidth={1.5} />
                      </div>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => {
                          const onlyNums = e.target.value.replace(/\D/g, '');
                          if (onlyNums.length <= 10) setPhone(onlyNums);
                        }}
                        placeholder="e.g. 9876543210"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100/50">
                  <Lock className="text-orange-500 mt-0.5 shrink-0" size={16} strokeWidth={1.5} />
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    We will send a one-time password (OTP) to your registered mobile number.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  <button
                    type="submit"
                    disabled={isValidating}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-[0_4px_14px_0_rgb(249,115,22,0.39)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.23)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isValidating ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Validating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Send OTP</span>
                        <ArrowRight size={18} className="ml-1" strokeWidth={2} />
                      </>
                    )}
                  </button>

                  <div className="relative flex items-center">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium">or</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSupportModal(true)}
                    className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Mail size={16} strokeWidth={1.5} />
                    <span>Contact Admin for Support</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="bg-white border-2 border-slate-100 px-10 py-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm">
                    <Key size={26} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Enter OTP Code</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Code sent to: {phone}</p>
                    <div className="w-10 h-0.5 bg-orange-500 mt-2 rounded-full"></div>
                  </div>
                </div>
                {otpError && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-medium">
                    {otpError}
                  </div>
                )}
                <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100/50">
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    OTP sent via SMS to <span className="font-extrabold text-slate-900">{phone}</span>.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-2">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-Digit OTP"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 tracking-[0.3em] text-center font-bold transition-all"
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
                      className="text-xs font-bold text-orange-500 hover:text-orange-600 underline transition disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  ) : (
                    <p className="text-xs text-slate-500 font-semibold">
                      Resend OTP in <span className="text-orange-600">{resendTimer}s</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowOtpScreen(false)}
                    className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-4 rounded-xl text-sm transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isValidating}
                    className="flex-[2] flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition shadow-[0_4px_14px_0_rgb(249,115,22,0.39)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.23)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isValidating ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} strokeWidth={2} />}
                    <span>Confirm Login</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Support Modal */}
        {showSupportModal && <SupportModal onClose={() => setShowSupportModal(false)} />}
      </main>
      <Footer />
    </div>
  );
}
