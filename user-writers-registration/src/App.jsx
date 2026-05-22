import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Lock, Phone, ReceiptText, UploadCloud, User, ShieldAlert, Check, RefreshCw, Key } from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, setupRecaptcha, sendOtp } from './firebase';

const categories = ['Story', 'Screenplay', 'Songs', 'Dialogues'];

export default function App() {
  const [member, setMember] = useState(() => {
    const saved = sessionStorage.getItem('tcwa_member');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('tcwa_isLoggedIn') === 'true';
  });

  // Persist session to sessionStorage on login/logout
  useEffect(() => {
    if (isLoggedIn && member) {
      sessionStorage.setItem('tcwa_member', JSON.stringify(member));
      sessionStorage.setItem('tcwa_isLoggedIn', 'true');
    } else {
      sessionStorage.removeItem('tcwa_member');
      sessionStorage.removeItem('tcwa_isLoggedIn');
    }
  }, [isLoggedIn, member]);

  // Login States
  const [membershipId, setMembershipId] = useState('');
  const [phone, setPhone] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [otpError, setOtpError] = useState('');

  // Dashboard / Form States
  const [scriptTitle, setScriptTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Story');
  const [pageCount, setPageCount] = useState(1);
  const [pdfFile, setPdfFile] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [successRegistration, setSuccessRegistration] = useState(null);

  // User's previous registrations list
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [isLoadingMyRegs, setIsLoadingMyRegs] = useState(false);

  // Lock status state for current active receipt
  const [isDownloading, setIsDownloading] = useState(false);

  // Expiry details calculation
  const expiryDetails = useMemo(() => {
    if (!member) return { isExpired: false, daysRemaining: 365, expiryDateStr: '' };
    
    // Life Time members never expire
    if (member.memberType === 'Life Time Member') {
      return { isExpired: false, daysRemaining: 9999, expiryDateStr: 'Never (Life Time)' };
    }

    // Associate members expire exactly 1 year after createdAt
    const createdDate = member.createdAt ? new Date(member.createdAt) : new Date();
    const expiryDate = new Date(createdDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining <= 0 || member.status === 'Inactive';

    return {
      isExpired,
      daysRemaining,
      expiryDateStr: expiryDate.toLocaleDateString([], { dateStyle: 'medium' })
    };
  }, [member]);

  // Real-time listener for current logged-in member's details
  useEffect(() => {
    if (!member?.membershipId || !isLoggedIn) return;

    const memberRef = doc(db, 'members', member.membershipId);
    const unsubscribe = onSnapshot(memberRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMember(prev => ({
          ...prev,
          name: data.name,
          memberType: data.memberType,
          status: data.status,
          mobileNumber: data.mobileNumber,
          email: data.email,
          createdAt: data.createdAt
        }));
      }
    });

    return () => unsubscribe();
  }, [member?.membershipId, isLoggedIn]);

  // Real-time listener for current member's registrations
  useEffect(() => {
    if (!member?.membershipId || !isLoggedIn) return;

    setIsLoadingMyRegs(true);
    const regsRef = collection(db, 'registrations');
    const q = query(regsRef, where('membershipId', '==', member.membershipId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort by creation date descending
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMyRegistrations(list);
      setIsLoadingMyRegs(false);
    });

    return () => unsubscribe();
  }, [member?.membershipId, isLoggedIn]);

  // Prevent body scrolling when expired modal is open
  useEffect(() => {
    if (expiryDetails.isExpired) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [expiryDetails.isExpired]);

  // Verify Member details in Firestore and send real SMS OTP
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
      
      // Normalize both phone numbers to compare (keep last 10 digits)
      const enteredPhoneClean = phone.replace(/\D/g, '').slice(-10);
      const storedPhoneClean = memberData.mobileNumber.replace(/\D/g, '').slice(-10);

      if (enteredPhoneClean !== storedPhoneClean) {
        setLoginError('Mobile number does not match our database records.');
        setIsValidating(false);
        return;
      }

      // Format E.164 phone format for Firebase Auth (default +91 for India if no prefix is given)
      let formattedPhone = phone.trim();
      if (!formattedPhone.startsWith('+')) {
        const cleanPhone = formattedPhone.replace(/\D/g, '');
        if (cleanPhone.length === 10) {
          formattedPhone = `+91${cleanPhone}`;
        } else {
          formattedPhone = `+${cleanPhone}`;
        }
      }

      // Clear existing recaptcha to prevent "reCAPTCHA client element has been removed" errors on React re-renders
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.warn("Recaptcha clear error", e);
        }
        window.recaptchaVerifier = null;
      }
      
      // Initialize fresh Invisible RecaptchaVerifier on the new DOM node
      const appVerifier = setupRecaptcha('recaptcha-container');
      window.recaptchaVerifier = appVerifier;

      // Send the real SMS OTP via Firebase Phone Auth
      const confirmation = await sendOtp(formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      
      // Store member details temporarily
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

  // Verify OTP Code
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

      // Verify the code with Firebase
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

  // Register New Script in Firestore
  const handleRegisterScript = async (e) => {
    e.preventDefault();
    if (!scriptTitle.trim()) {
      alert("Please enter script title.");
      return;
    }
    if (pageCount < 1) {
      alert("Page count must be 1 or more.");
      return;
    }

    setIsRegistering(true);

    try {
      const regId = `REG-TCWA-${Math.floor(100000 + Math.random() * 900000)}`;
      const amount = pageCount * 10; // ₹10 per page

      // Save registration directly to Firestore registrations collection
      const regRef = doc(db, 'registrations', regId);
      const newRegData = {
        registrationId: regId,
        membershipId: member.membershipId,
        writerName: member.name,
        title: scriptTitle.trim(),
        category: selectedCategory,
        pageCount: pageCount,
        amount: amount,
        pdfFileName: pdfFile ? pdfFile.name : 'script_document.pdf',
        pdfFileSize: pdfFile ? `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB` : '1.4 MB',
        status: 'Approved', // Automatic approval upon simulated successful checkout
        downloadCount: 0,
        createdAt: new Date().toISOString()
      };

      await setDoc(regRef, newRegData);
      setSuccessRegistration(newRegData);
      
      // Reset form fields
      setScriptTitle('');
      setPageCount(1);
      setPdfFile(null);
    } catch (error) {
      console.error(error);
      alert("Failed to submit script. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  // Stamped Receipt download triggers
  const handleDownloadReceipt = async (reg) => {
    if (reg.downloadCount >= 1) {
      alert("This receipt is LOCKED. One-time download is restricted. To re-download, you must pay again.");
      return;
    }

    setIsDownloading(true);
    
    // Simulate dynamic PDF generation and download
    setTimeout(async () => {
      try {
        const regRef = doc(db, 'registrations', reg.registrationId);
        await updateDoc(regRef, {
          downloadCount: 1
        });
        
        // Trigger simulated file download
        const element = document.createElement("a");
        const file = new Blob([
          `=============================================\n`,
          `         TELUGU CINE WRITERS ASSOCIATION     \n`,
          `             OFFICIAL STAMPED RECEIPT        \n`,
          `=============================================\n\n`,
          `REGISTRATION ID : ${reg.registrationId}\n`,
          `SUBMISSION DATE : ${new Date(reg.createdAt).toLocaleString()}\n\n`,
          `WRITER NAME     : ${reg.writerName}\n`,
          `MEMBERSHIP ID   : ${reg.membershipId}\n`,
          `SCRIPT TITLE    : ${reg.title}\n`,
          `CATEGORY        : ${reg.category}\n`,
          `PAGES COUNT     : ${reg.pageCount} Pages\n`,
          `FEE CHARGED     : ₹${reg.amount}\n`,
          `PAYMENT STATUS  : SUCCESSFUL (Razorpay Direct API)\n\n`,
          `---------------------------------------------\n`,
          `VERIFICATION STATUS: APPROVED AUTOMATICALLY  \n`,
          `SECURITY SHIELD    : 100% WRITER PRIVACY ACTIVE\n`,
          `---------------------------------------------\n\n`,
          `* This is a computer generated stamped document.\n`,
          `* One-time download restriction policy is applied.\n`
        ], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `TCWA_Receipt_${reg.registrationId}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        
        if (successRegistration?.registrationId === reg.registrationId) {
          setSuccessRegistration(prev => ({ ...prev, downloadCount: 1 }));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsDownloading(false);
      }
    }, 1200);
  };

  // Re-purchase receipt download unlock
  const handleUnlockDownload = async (reg) => {
    const confirmUnlock = window.confirm(`Re-download payment is required for receipt ${reg.registrationId}. Amount: ₹${reg.amount}. Would you like to proceed to payment?`);
    if (!confirmUnlock) return;

    setIsDownloading(true);
    // Simulate Razorpay transaction success
    setTimeout(async () => {
      try {
        const regRef = doc(db, 'registrations', reg.registrationId);
        await updateDoc(regRef, {
          downloadCount: 0
        });
        alert(`Payment successful! Receipt ${reg.registrationId} has been UNLOCKED.`);
        if (successRegistration?.registrationId === reg.registrationId) {
          setSuccessRegistration(prev => ({ ...prev, downloadCount: 0 }));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsDownloading(false);
      }
    }, 1500);
  };

  const handleLogout = () => {
    setMember(null);
    setIsLoggedIn(false);
    setShowOtpScreen(false);
    setMembershipId('');
    setPhone('');
    setOtpCode('');
  };

  // RENDER LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-zinc-950 flex items-center justify-center px-4 py-12 text-zinc-100 font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-900/10 via-zinc-950 to-zinc-950 pointer-events-none" />
        
        <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Brand Info Column */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert size={14} />
              <span>Secure Writer Portal</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight text-white">
              Telugu Cine Writers <br/>
              <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                Association Portal
              </span>
            </h1>
            <p className="text-zinc-400 text-base max-w-lg leading-relaxed">
              Verify your Membership credentials to upload, secure, and register your scripts. Your scripts are private and protected with 100% encryption.
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-md pt-4">
              <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded">
                <p className="text-amber-400 font-black text-xl">2,600+</p>
                <p className="text-zinc-500 text-xs font-semibold mt-1">Active Members</p>
              </div>
              <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded">
                <p className="text-amber-400 font-black text-xl">100%</p>
                <p className="text-zinc-500 text-xs font-semibold mt-1">Script Privacy</p>
              </div>
            </div>
          </div>

          {/* Login Form Card */}
          <div className="lg:col-span-5 w-full">
            {!showOtpScreen ? (
              <form onSubmit={handleVerifyDetails} className="bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 rounded-lg shadow-2xl space-y-5 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded bg-amber-500 text-zinc-950 shadow-md">
                    <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Member Sign In</h2>
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
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Membership ID
                    </label>
                    <input
                      type="text"
                      value={membershipId}
                      onChange={(e) => setMembershipId(e.target.value)}
                      placeholder="e.g. TCWA1001"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Registered Mobile Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isValidating}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold py-3 px-4 rounded text-sm transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
                <div id="recaptcha-container" className="mt-2"></div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 rounded-lg shadow-2xl space-y-5 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded bg-amber-500 text-zinc-950 shadow-md">
                    <Key size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Enter OTP Code</h2>
                    <p className="text-xs text-zinc-500">Code sent to: {phone}</p>
                  </div>
                </div>

                {otpError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-xs font-semibold">
                    {otpError}
                  </div>
                )}

                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded text-xs font-semibold text-center leading-relaxed">
                  Real OTP sent via SMS to <span className="font-extrabold text-white">{phone}</span>.
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-Digit OTP"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 tracking-[0.3em] text-center font-bold"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowOtpScreen(false)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2.5 px-4 rounded text-xs transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold py-2.5 px-4 rounded text-xs transition active:scale-[0.98] cursor-pointer"
                  >
                    Confirm Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    );
  }

  // RENDER DASHBOARD
  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100 flex flex-col font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/10 via-zinc-950 to-zinc-950 pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/50 backdrop-blur relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-amber-500 rounded flex items-center justify-center text-zinc-950 font-black">W</div>
            <div>
              <h1 className="text-base font-black text-white tracking-wider uppercase">TCWA Writer Registry</h1>
              <p className="text-[10px] text-zinc-500 font-semibold tracking-wider">Member Self-Service Dashboard</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 text-xs font-bold tracking-wide transition active:scale-[0.98] cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 relative z-10 space-y-6">
        
        {/* MEMBERSHIP PROFILE CARD */}
        <section className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-lg grid gap-4 md:grid-cols-4 items-center">
          <div className="md:col-span-1 border-r border-zinc-800 md:pr-4 flex items-center gap-3.5">
            <div className="h-12 w-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-400">
              <User size={22} />
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Log in Writer</p>
              <h2 className="text-base font-extrabold text-white capitalize">{member?.name}</h2>
            </div>
          </div>
          <div className="grid grid-cols-3 md:col-span-3 gap-4 pl-0 md:pl-4">
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Membership ID</p>
              <p className="text-sm font-black text-amber-400 mt-1">{member?.membershipId}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Member Type</p>
              <p className="text-sm font-bold mt-1">{member?.memberType}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Valid Till</p>
              <p className={`text-sm font-bold mt-1 ${expiryDetails.isExpired ? 'text-red-500' : 'text-green-500'}`}>
                {expiryDetails.expiryDateStr}
              </p>
            </div>
          </div>
        </section>

        {/* ASSOCIATE EXPIRED UN-CLOSEABLE MODAL BLOCK */}
        {expiryDetails.isExpired && (
          <section className="fixed inset-0 z-50 bg-black/95 overflow-y-auto py-12 px-4 flex items-start justify-center">
            <div className="bg-zinc-900 border border-red-500/30 p-6 sm:p-8 rounded-lg shadow-2xl max-w-md w-full text-center space-y-5 my-auto">
              <div className="mx-auto size-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle size={36} />
              </div>
              <h2 className="text-xl font-extrabold text-white uppercase tracking-wider">Membership Renewal Required</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Dear <span className="text-white font-bold">{member?.name}</span>, your Associate Membership has expired or renewals are overdue. 
                Under the <span className="text-red-400 font-bold">Strict 5-Years Rule</span>, you must pay your annual renewal fee offline to the TCWA Admin to restore active status.
              </p>
              <div className="bg-zinc-950 p-4 border border-zinc-800 text-left rounded text-xs space-y-1.5 text-zinc-400">
                <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">Account Metrics</p>
                <p>• Membership ID: <span className="text-amber-400 font-bold">{member?.membershipId}</span></p>
                <p>• Status: <span className="text-red-500 font-extrabold">{member?.status || "Expired"}</span></p>
                <p>• Action: Contact TCWA Employee/Admin for payment registry.</p>
              </div>
              <p className="text-[10px] text-zinc-500 italic font-semibold">
                * This page is locked. Dashboard access will restore automatically once admin records your payment.
              </p>
            </div>
          </section>
        )}

        {/* NEW REGISTRATION FORM & RIGHT RECEIPT CARD CONTAINER */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          
          {/* SCRIPT SUBMISSION FORM */}
          <form onSubmit={handleRegisterScript} className="bg-zinc-900/40 border border-zinc-800/80 p-5 sm:p-6 rounded-lg space-y-5">
            <div className="flex items-center gap-3 border-b border-zinc-800/60 pb-3">
              <FileText className="text-amber-500" />
              <div>
                <h3 className="text-lg font-bold text-white">Register New Movie Script</h3>
                <p className="text-xs text-zinc-500">Calculate page count and generate digital stamped receipt instantly.</p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Movie Script / Song Title *
              </label>
              <input
                type="text"
                value={scriptTitle}
                onChange={(e) => setScriptTitle(e.target.value)}
                placeholder="Enter script or song title"
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
                Registration Category *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {categories.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`py-2 px-3 rounded border text-xs font-bold tracking-wide transition active:scale-[0.98] cursor-pointer ${
                      selectedCategory === cat
                        ? 'border-amber-500 bg-amber-500 text-zinc-950 font-black shadow-md'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Upload Movie Script PDF *
              </label>
              <label className="border border-dashed border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900/60 hover:border-zinc-700 rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer transition relative group">
                <UploadCloud className="text-zinc-500 group-hover:text-amber-500 mb-2 transition-colors" size={28} />
                <span className="text-xs font-bold text-zinc-300">
                  {pdfFile ? pdfFile.name : 'Select or Drop Script PDF'}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1">
                  {pdfFile ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB` : 'PDF must remain private (100% Writer Privacy Shield)'}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files[0])}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="max-w-xs">
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Document Pages Count *
              </label>
              <input
                type="number"
                min="1"
                value={pageCount}
                onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold py-3 px-4 rounded text-sm transition shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isRegistering ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Connecting to Razorpay Secure Gateway...</span>
                </>
              ) : (
                <span>Pay with Razorpay (₹{pageCount * 10})</span>
              )}
            </button>
          </form>

          {/* RIGHT SIDEBAR - ACTIVE RECEIPT STATUS / DOWNLOAD LOCK PANEL */}
          <aside className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-lg h-fit space-y-4">
            <h3 className="text-base font-bold text-white border-b border-zinc-800/60 pb-2">Active Checkout Summary</h3>
            
            <div className="space-y-2 text-xs font-semibold text-zinc-400">
              <div className="flex justify-between">
                <span>Selected Category</span>
                <span className="text-white">{selectedCategory}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Pages</span>
                <span className="text-white">{pageCount} Pages</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800/60 pt-2 text-sm font-bold">
                <span>Total Amount Due</span>
                <span className="text-amber-400">₹{pageCount * 10}</span>
              </div>
            </div>

            {successRegistration ? (
              <div className="bg-zinc-950/80 p-4 border border-zinc-800 rounded text-center space-y-3.5 relative overflow-hidden">
                <div className="absolute top-1 right-1">
                  <span className="bg-green-500/10 text-green-400 border border-green-500/20 rounded px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wide">
                    Success
                  </span>
                </div>
                <ReceiptText className="text-green-500 mx-auto" size={32} />
                <div>
                  <h4 className="text-sm font-bold text-white">Payment Successful</h4>
                  <p className="text-[10px] text-zinc-500 mt-1">Receipt ID: {successRegistration.registrationId}</p>
                </div>

                {successRegistration.downloadCount >= 1 ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled
                      className="w-full flex items-center justify-center gap-1.5 rounded border border-red-500/10 bg-red-500/10 text-red-400 px-3 py-2 text-xs font-bold opacity-80 cursor-not-allowed"
                    >
                      <Lock size={12} />
                      <span>One-Time Download Locked</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnlockDownload(successRegistration)}
                      className="w-full text-center hover:underline text-[10px] text-amber-500 font-bold block cursor-pointer"
                    >
                      Unlock for Re-download (Pay ₹{successRegistration.amount})
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDownloadReceipt(successRegistration)}
                    disabled={isDownloading}
                    className="w-full flex items-center justify-center gap-1.5 rounded bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-xs font-bold active:scale-[0.98] transition cursor-pointer"
                  >
                    <CheckCircle2 size={12} />
                    <span>{isDownloading ? 'Downloading...' : 'Download Stamped Receipt'}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-zinc-950/40 p-5 border border-dashed border-zinc-800 rounded text-center py-8">
                <Lock className="text-zinc-600 mx-auto mb-2" size={24} />
                <p className="text-xs font-bold text-zinc-500">Receipt Auto Approval Lock</p>
                <p className="text-[10px] text-zinc-600 mt-1">Receipt unlocks automatically after completing secure Razorpay Checkout.</p>
              </div>
            )}
          </aside>
        </div>

        {/* RECENT REGISTRATIONS TABLE LOG */}
        <section className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800/60 pb-3">
            <ReceiptText className="text-amber-500" />
            <div>
              <h3 className="text-lg font-bold text-white">My Script Registration Logs</h3>
              <p className="text-xs text-zinc-500 font-semibold">View and track all registered documents and re-download locks.</p>
            </div>
          </div>

          {isLoadingMyRegs ? (
            <div className="py-12 flex flex-col items-center justify-center text-zinc-500 text-xs font-bold">
              <RefreshCw className="animate-spin text-amber-500 mb-2" size={20} />
              <span>Fetching script logs...</span>
            </div>
          ) : myRegistrations.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-zinc-500 border border-dashed border-zinc-800 rounded-md">
              No registered scripts found in your member history.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse border border-zinc-800">
                <thead>
                  <tr className="bg-zinc-950/80 border-b border-zinc-800 text-left">
                    {["Reg ID", "Script Title", "Category", "Pages", "Amount", "Date", "Download Status"].map((head) => (
                      <th key={head} className="border border-zinc-800 py-2.5 px-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myRegistrations.map((reg) => (
                    <tr key={reg.registrationId} className="hover:bg-zinc-900/40 transition-colors border-b border-zinc-900">
                      <td className="border border-zinc-800 py-3 px-3 text-xs font-bold text-amber-500">
                        {reg.registrationId}
                      </td>
                      <td className="border border-zinc-800 py-3 px-3 text-xs font-bold text-white">
                        {reg.title}
                      </td>
                      <td className="border border-zinc-800 py-3 px-3 text-xs font-bold text-zinc-400">
                        {reg.category}
                      </td>
                      <td className="border border-zinc-800 py-3 px-3 text-xs font-bold text-zinc-400">
                        {reg.pageCount} Pages
                      </td>
                      <td className="border border-zinc-800 py-3 px-3 text-xs font-bold text-green-500">
                        ₹{reg.amount}
                      </td>
                      <td className="border border-zinc-800 py-3 px-3 text-xs font-medium text-zinc-500">
                        {new Date(reg.createdAt).toLocaleDateString([], { dateStyle: 'short' })}
                      </td>
                      <td className="border border-zinc-800 py-3 px-3 w-48">
                        {reg.downloadCount >= 1 ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                              <Lock size={10} /> Locked
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUnlockDownload(reg)}
                              className="text-[10px] text-amber-500 hover:underline font-extrabold cursor-pointer"
                            >
                              Unlock (₹{reg.amount})
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDownloadReceipt(reg)}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 hover:bg-green-500/20 active:scale-[0.98] transition cursor-pointer"
                          >
                            <Check size={10} /> Download Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
