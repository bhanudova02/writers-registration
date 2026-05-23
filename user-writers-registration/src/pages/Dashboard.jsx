import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { doc, updateDoc, collection, query, where, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as pdfjsLib from 'pdfjs-dist';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import { normalizeTitle, loadRazorpayCheckout } from '../lib/utils';

// Use locally hosted worker from the public directory.
// This bypasses Vite's bundler and avoids cross-origin/MIME type issues on mobile.
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

import DashboardHeader from '../components/dashboard/DashboardHeader';
import ProfileCard from '../components/dashboard/ProfileCard';
import RegistrationForm from '../components/dashboard/RegistrationForm';
import ReceiptSidebar from '../components/dashboard/ReceiptSidebar';
import RegistrationsTable from '../components/dashboard/RegistrationsTable';
import ReceiptModal from '../components/dashboard/ReceiptModal';
import Footer from '../components/Footer';

export default function Dashboard({ member, setMember, onLogout }) {
  const [scriptTitle, setScriptTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Story');
  const [pageCount, setPageCount] = useState(1);
  const [pdfFile, setPdfFile] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCalculatingPages, setIsCalculatingPages] = useState(false);
  const [successRegistration, setSuccessRegistration] = useState(null);
  const [receiptModal, setReceiptModal] = useState({ type: null, registration: null });
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [isLoadingMyRegs, setIsLoadingMyRegs] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;

  const calculatePdfPages = async (file) => {
    setIsCalculatingPages(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPageCount(pdf.numPages);
    } catch (error) {
      console.error("Error calculating PDF pages:", error);
      toast.error("Could not read PDF page count. Please ensure it is a valid PDF.");
      setPageCount(0);
    } finally {
      setIsCalculatingPages(false);
    }
  };

  const expiryDetails = useMemo(() => {
    if (!member) return { isExpired: false, daysRemaining: 365, expiryDateStr: '' };
    if (member.memberType === 'Life Time Member') {
      return { isExpired: false, daysRemaining: 9999, expiryDateStr: 'Never (Life Time)' };
    }
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

  useEffect(() => {
    if (!member?.membershipId) return;
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
  }, [member?.membershipId, setMember]);

  useEffect(() => {
    if (!member?.membershipId) return;
    setIsLoadingMyRegs(true);
    const regsRef = collection(db, 'registrations');
    const q = query(regsRef, where('membershipId', '==', member.membershipId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMyRegistrations(list);
      setIsLoadingMyRegs(false);
    });
    return () => unsubscribe();
  }, [member?.membershipId]);

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

  const handleRegisterScript = async (e) => {
    e.preventDefault();
    const normalizedScriptTitle = normalizeTitle(scriptTitle);

    if (!normalizedScriptTitle) {
      toast.error("Please enter script title.");
      return;
    }

    const alreadyRegistered = myRegistrations.some((reg) => (
      normalizeTitle(reg.title || '') === normalizedScriptTitle
      && reg.category === selectedCategory
    ));

    if (alreadyRegistered) {
      toast.error(`This ${selectedCategory} is already registered under the same title.`);
      return;
    }

    if (pageCount < 1) {
      toast.error("Page count must be 1 or more.");
      return;
    }
    if (!pdfFile) {
      toast.error("Please upload the script PDF before payment.");
      return;
    }
    if (!razorpayKeyId) {
      toast.error("Payment configuration is missing. Please contact support.");
      return;
    }

    setIsRegistering(true);

    try {
      if (!member) throw new Error("User session not found. Please log in again.");

      const regId = `REG-TCWA-${Math.floor(100000 + Math.random() * 900000)}`;
      const amount = pageCount * 10;
      await loadRazorpayCheckout();

      const paymentResult = await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: razorpayKeyId,
          amount: amount * 100,
          currency: 'INR',
          name: 'TCWA Writer Registry',
          description: `${selectedCategory} Registration - ${scriptTitle.trim()}`,
          prefill: {
            name: member.name || '',
            email: member.email || '',
            contact: String(member.mobileNumber || '').replace(/\D/g, '').slice(-10),
          },
          notes: {
            registrationId: regId,
            membershipId: member.membershipId,
            category: selectedCategory,
          },
          theme: { color: '#f59e0b' },
          handler: (response) => resolve(response),
          modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
        });

        checkout.on('payment.failed', (response) => reject(new Error(response.error?.description || 'Razorpay payment failed.')));
        checkout.open();
      });

      const regRef = doc(db, 'registrations', regId);
      const newRegData = {
        registrationId: regId,
        membershipId: member.membershipId,
        writerName: member.name,
        title: scriptTitle.trim(),
        category: selectedCategory,
        pageCount: pageCount,
        amount: amount,
        paymentId: paymentResult.razorpay_payment_id,
        paymentStatus: 'Success',
        pdfFileName: pdfFile.name,
        pdfFileSize: `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB`,
        status: 'Approved',
        downloadCount: 0,
        createdAt: new Date().toISOString()
      };

      await setDoc(regRef, newRegData);
      setSuccessRegistration(newRegData);
      setReceiptModal({ type: 'download', registration: newRegData, isPaymentSuccess: true });

      setScriptTitle('');
      setPageCount(1);
      setPdfFile(null);
      toast.success("Script Registered & Approved Successfully!");
    } catch (error) {
      console.error("Script submission failed:", error);
      toast.error(error.message || "Failed to submit script.");
    } finally {
      setIsRegistering(false);
    }
  };

  const closeReceiptModal = () => {
    if (!isDownloading) setReceiptModal({ type: null, registration: null });
  };

  const requestReceiptDownload = (reg) => {
    if (reg.downloadCount >= 1) {
      toast.error("This receipt is locked. Re-download requires a new payment.");
      setReceiptModal({ type: 'unlock', registration: reg });
      return;
    }
    setReceiptModal({ type: 'download', registration: reg });
  };

  const requestUnlockDownload = (reg) => setReceiptModal({ type: 'unlock', registration: reg });

  const handleDownloadReceipt = async (reg) => {
    setReceiptModal({ type: null, registration: null });
    setIsDownloading(true);
    try {
      const regRef = doc(db, 'registrations', reg.registrationId);
      await updateDoc(regRef, { downloadCount: 1 });

      const docPdf = new jsPDF();
      docPdf.setFontSize(16);
      docPdf.setFont("helvetica", "bold");
      docPdf.text("TELUGU CINE WRITERS ASSOCIATION", 105, 20, null, null, "center");
      docPdf.setFontSize(14);
      docPdf.text("OFFICIAL STAMPED RECEIPT", 105, 30, null, null, "center");
      
      docPdf.setLineWidth(0.5);
      docPdf.line(20, 35, 190, 35);
      
      try {
        const stampImg = new Image();
        stampImg.src = '/stamp.png';
        await new Promise((resolve, reject) => {
          stampImg.onload = resolve;
          stampImg.onerror = reject;
        });
        
        // Add stamp image to top right corner
        docPdf.addImage(stampImg, 'PNG', 145, 45, 45, 45);
      } catch (e) {
        console.error("Could not load stamp image", e);
      }
      
      docPdf.setFontSize(11);
      docPdf.setFont("helvetica", "normal");
      
      const startY = 45;
      const lineHeight = 8;
      
      docPdf.text(`Name of the Member:`, 20, startY);
      docPdf.setFont("helvetica", "bold");
      docPdf.text(`${reg.writerName}`, 70, startY);
      docPdf.setFont("helvetica", "normal");

      docPdf.text(`Working Title:`, 20, startY + lineHeight * 1);
      docPdf.setFont("helvetica", "bold");
      docPdf.text(`${reg.title}`, 70, startY + lineHeight * 1);
      docPdf.setFont("helvetica", "normal");
      
      docPdf.text(`Category:`, 20, startY + lineHeight * 2);
      docPdf.setFont("helvetica", "bold");
      docPdf.text(`${reg.category}`, 70, startY + lineHeight * 2);
      docPdf.setFont("helvetica", "normal");
      
      docPdf.text(`Total Pages:`, 20, startY + lineHeight * 3);
      docPdf.setFont("helvetica", "bold");
      docPdf.text(`${reg.pageCount}`, 70, startY + lineHeight * 3);
      docPdf.setFont("helvetica", "normal");
      
      docPdf.text(`Membership Id No.:`, 20, startY + lineHeight * 4);
      docPdf.setFont("helvetica", "bold");
      docPdf.text(`${reg.membershipId}`, 70, startY + lineHeight * 4);
      docPdf.setFont("helvetica", "normal");
      
      docPdf.text(`Receipt No.:`, 20, startY + lineHeight * 5);
      docPdf.setFont("helvetica", "bold");
      docPdf.text(`${reg.registrationId}`, 70, startY + lineHeight * 5);
      docPdf.setFont("helvetica", "normal");
      
      docPdf.text(`Time:`, 20, startY + lineHeight * 6);
      docPdf.setFont("helvetica", "bold");
      docPdf.text(`${new Date(reg.createdAt).toLocaleString()}`, 70, startY + lineHeight * 6);
      docPdf.setFont("helvetica", "normal");
      
      docPdf.text(`Amount:`, 20, startY + lineHeight * 7);
      docPdf.setFont("helvetica", "bold");
      docPdf.text(`Rs. ${reg.amount}`, 70, startY + lineHeight * 7);
      docPdf.setFont("helvetica", "normal");
      
      docPdf.text(`Payment Status:`, 20, startY + lineHeight * 8);
      docPdf.setFont("helvetica", "bold");
      docPdf.setTextColor(0, 150, 0); // Green color for success
      docPdf.text(`SUCCESSFUL`, 70, startY + lineHeight * 8);
      docPdf.setTextColor(0, 0, 0); // Reset to black
      docPdf.setFont("helvetica", "normal");

      docPdf.line(20, startY + lineHeight * 9, 190, startY + lineHeight * 9);
      
      docPdf.setFontSize(10);
      docPdf.setTextColor(100, 100, 100);
      docPdf.text(`VERIFICATION STATUS: APPROVED AUTOMATICALLY`, 20, startY + lineHeight * 10.5);
      docPdf.text(`SECURITY SHIELD: 100% WRITER PRIVACY ACTIVE`, 20, startY + lineHeight * 11.5);
      
      docPdf.setFontSize(9);
      docPdf.text(`* This is a computer generated stamped document.`, 20, startY + lineHeight * 13.5);
      docPdf.text(`* One-time download restriction policy is applied.`, 20, startY + lineHeight * 14.5);
      docPdf.text(`* Re-download requires fresh payment as per SOP.`, 20, startY + lineHeight * 15.5);
      
      try {
        const signImg = new Image();
        signImg.src = '/signature.png';
        await new Promise((resolve, reject) => {
          signImg.onload = resolve;
          signImg.onerror = reject;
        });
        
        // Add signature image to bottom right
        docPdf.addImage(signImg, 'PNG', 145, startY + lineHeight * 11, 40, 15);
        
        // Add bordered text container below the signature
        docPdf.setDrawColor(180, 180, 180); // gray border
        docPdf.rect(125, startY + lineHeight * 11 + 16, 80, 18);
        
        docPdf.setTextColor(1, 10, 80); // Dark blue text
        docPdf.setFontSize(10);
        docPdf.setFont("helvetica", "bold");
        docPdf.text("UMARJI ANURADHA", 165, startY + lineHeight * 11 + 21, null, null, "center");
        
        docPdf.setTextColor(1, 10, 80);
        docPdf.setFontSize(9);
        docPdf.setFont("helvetica", "bold");
        docPdf.text("General Secretary", 165, startY + lineHeight * 11 + 26, null, null, "center");
        docPdf.text("Telugu Cine Writers Association", 165, startY + lineHeight * 11 + 31, null, null, "center");
        
      } catch (e) {
        console.error("Could not load signature image", e);
      }
      
      docPdf.save(`TCWA_Receipt_${reg.registrationId}.pdf`);

      if (successRegistration?.registrationId === reg.registrationId) {
        setSuccessRegistration(prev => ({ ...prev, downloadCount: 1 }));
      }
    } catch (error) {
      console.error(error);
      toast.error("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUnlockDownload = async (reg) => {
    setReceiptModal({ type: null, registration: null });
    if (!razorpayKeyId) {
      toast.error("Payment configuration is missing.");
      return;
    }
    setIsDownloading(true);
    try {
      await loadRazorpayCheckout();
      const paymentResult = await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: razorpayKeyId,
          amount: reg.amount * 100,
          currency: 'INR',
          name: 'TCWA Writer Registry',
          description: `Receipt Re-download - ${reg.registrationId}`,
          prefill: {
            name: reg.writerName || member?.name || '',
            email: member?.email || '',
            contact: String(member?.mobileNumber || '').replace(/\D/g, '').slice(-10),
          },
          notes: {
            registrationId: reg.registrationId,
            membershipId: reg.membershipId,
            purpose: 'receipt_redownload',
          },
          theme: { color: '#f59e0b' },
          handler: (response) => resolve(response),
          modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
        });
        checkout.on('payment.failed', (response) => {
          reject(new Error(response.error?.description || 'Razorpay payment failed.'));
        });
        checkout.open();
      });

      const regRef = doc(db, 'registrations', reg.registrationId);
      await updateDoc(regRef, {
        downloadCount: 0,
        redownloadPaymentId: paymentResult.razorpay_payment_id,
        redownloadPaymentStatus: 'Success',
        redownloadUnlockedAt: new Date().toISOString(),
      });
      toast.success(`Payment successful. Receipt unlocked.`);
      if (successRegistration?.registrationId === reg.registrationId) {
        setSuccessRegistration(prev => ({ ...prev, downloadCount: 0 }));
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to unlock receipt download.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-50 text-zinc-900 flex flex-col font-sans relative">

      <DashboardHeader onLogout={onLogout} />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-28 pb-6 relative z-10 space-y-6">
        <ProfileCard member={member} expiryDetails={expiryDetails} />

        {expiryDetails.isExpired && (
          <section className="fixed inset-0 z-50 bg-black/95 overflow-y-auto py-12 px-4 flex items-start justify-center">
            <div className="bg-white border border-red-500/30 p-6 sm:p-8 rounded-lg shadow-2xl max-w-md w-full text-center space-y-5 my-auto">
              <div className="mx-auto size-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle size={36} />
              </div>
              <h2 className="text-xl font-extrabold text-zinc-900 uppercase tracking-wider">Membership Renewal Required</h2>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Dear <span className="text-zinc-900 font-bold">{member?.name}</span>, your Associate Membership has expired or renewals are overdue.
                Under the <span className="text-red-400 font-bold">Strict 5-Years Rule</span>, you must pay your annual renewal fee offline to the TCWA Admin to restore active status.
              </p>
              <div className="bg-zinc-50 p-4 border border-zinc-200 text-left rounded text-xs space-y-1.5 text-zinc-600">
                <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">Account Metrics</p>
                <p>• Membership ID: <span className="text-amber-600 font-bold">{member?.membershipId}</span></p>
                <p>• Status: <span className="text-red-500 font-extrabold">{member?.status || "Expired"}</span></p>
                <p>• Action: Contact TCWA Employee/Admin for payment registry.</p>
              </div>
              <p className="text-[10px] text-zinc-500 italic font-semibold">
                * This page is locked. Dashboard access will restore automatically once admin records your payment.
              </p>
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <RegistrationForm 
            handleRegisterScript={handleRegisterScript}
            scriptTitle={scriptTitle}
            setScriptTitle={setScriptTitle}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            pdfFile={pdfFile}
            setPdfFile={setPdfFile}
            calculatePdfPages={calculatePdfPages}
            pageCount={pageCount}
            isCalculatingPages={isCalculatingPages}
            isRegistering={isRegistering}
          />

          <ReceiptSidebar 
            selectedCategory={selectedCategory}
            pageCount={pageCount}
            successRegistration={successRegistration}
            requestUnlockDownload={requestUnlockDownload}
            requestReceiptDownload={requestReceiptDownload}
            isDownloading={isDownloading}
          />
        </div>

        <RegistrationsTable 
          isLoadingMyRegs={isLoadingMyRegs}
          myRegistrations={myRegistrations}
          requestUnlockDownload={requestUnlockDownload}
          requestReceiptDownload={requestReceiptDownload}
          isDownloading={isDownloading}
        />
      </div>

      <ReceiptModal 
        receiptModal={receiptModal}
        isDownloading={isDownloading}
        closeReceiptModal={closeReceiptModal}
        handleDownloadReceipt={handleDownloadReceipt}
        handleUnlockDownload={handleUnlockDownload}
      />
      <Footer />
    </main>
  );
}
