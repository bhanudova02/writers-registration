import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { doc, updateDoc, collection, query, where, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as pdfjsLib from 'pdfjs-dist';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import { PDFDocument, rgb } from 'pdf-lib';
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
import SupportModal from '../components/SupportModal';

export default function Dashboard({ member, setMember, onLogout }) {
  const [scriptTitle, setScriptTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [pageCount, setPageCount] = useState(1);
  const [pdfFile, setPdfFile] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCalculatingPages, setIsCalculatingPages] = useState(false);
  const [successRegistration, setSuccessRegistration] = useState(null);
  const [receiptModal, setReceiptModal] = useState({ type: null, registration: null });
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [isLoadingMyRegs, setIsLoadingMyRegs] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

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
    
    if (member.status === 'Inactive') {
      return { isExpired: true, daysRemaining: 0, expiryDateStr: 'Inactive Account' };
    }

    if (member.memberType === 'Life Time Member') {
      return { isExpired: false, daysRemaining: 9999, expiryDateStr: 'Never (Life Time)' };
    }
    const createdDate = member.createdAt ? new Date(member.createdAt) : new Date();
    const expiryDate = new Date(createdDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining <= 0;
    return {
      isExpired,
      daysRemaining,
      expiryDateStr: expiryDate.toLocaleDateString([], { dateStyle: 'medium' })
    };
  }, [member]);

  useEffect(() => {
    if (expiryDetails.isExpired && member?.status === 'Active' && member?.membershipId) {
      // Automatically update the status to 'Inactive' in Firestore when their validity expires
      const autoDeactivate = async () => {
        try {
          const memberRef = doc(db, 'members', member.membershipId);
          await updateDoc(memberRef, { status: 'Inactive' });
        } catch (err) {
          console.error("Failed to auto-update status to inactive:", err);
        }
      };
      autoDeactivate();
    }
  }, [expiryDetails.isExpired, member?.status, member?.membershipId]);

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

  useEffect(() => {
    const handlePopState = (e) => {
      if (receiptModal?.isPaymentSuccess) {
        // user clicked back button
        if (!isDownloading) {
          setReceiptModal({ type: null, registration: null });
          setSuccessRegistration(null);
        } else {
          // If downloading, prevent going back by pushing state again
          window.history.pushState({ successPage: true }, '', '/success');
          toast.warning("Please wait until the download finishes.");
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [receiptModal, isDownloading]);

  const handleRegisterScript = async (e) => {
    e.preventDefault();
    const normalizedScriptTitle = normalizeTitle(scriptTitle);

    if (!normalizedScriptTitle) {
      toast.error("Please enter script title.");
      return;
    }

    if (!selectedCategory) {
      toast.error("Please select a registration category.");
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
      
      // Strict Security Check: Verify member still exists in DB before taking payment
      const memberDocSnap = await getDoc(doc(db, 'members', member.membershipId));
      if (!memberDocSnap.exists()) {
        toast.error("Your account no longer exists in the database. Logging out...");
        setTimeout(() => onLogout(), 2000);
        return;
      }

      const regId = `REG-TCWA-${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;
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
      setReceiptModal({ type: 'download', registration: newRegData, isPaymentSuccess: true, originalFile: pdfFile });
      window.history.pushState({ successPage: true }, '', '/success');

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
    if (!isDownloading) {
      setReceiptModal({ type: null, registration: null });
      setSuccessRegistration(null);
      if (window.location.pathname === '/success') {
        window.history.replaceState(null, '', '/');
      }
    }
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

  const handleDownloadStampedScript = async () => {
    if (!receiptModal.originalFile) {
      toast.error("Original script file not found.");
      return;
    }
    setIsDownloading(true);
    try {
      const arrayBuffer = await receiptModal.originalFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      const regId = receiptModal.registration.registrationId;
      const dateObj = new Date(receiptModal.registration.createdAt);
      const dateStr = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      // Load stamp and signature images
      let stampImage = null;
      let signImage = null;
      try {
        const [stampBytes, signBytes] = await Promise.all([
          fetch('/stamp.png').then(res => res.arrayBuffer()),
          fetch('/signature.png').then(res => res.arrayBuffer())
        ]);
        stampImage = await pdfDoc.embedPng(stampBytes);
        signImage = await pdfDoc.embedPng(signBytes);
      } catch (err) {
        console.warn("Could not load stamp/signature images:", err);
      }

      pages.forEach((page) => {
        const { width, height } = page.getSize();
        
        // Draw light border around the page
        page.drawRectangle({
          x: 25,
          y: 52,
          width: width - 50,
          height: height - 77,
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 1.5,
        });

        // Add stamp text at the top of the page (in the 25pt top margin)
        page.drawText(`Registered with TCWA | ID: ${regId} | Date: ${dateStr}`, {
          x: width / 2 - 160,
          y: height - 20,
          size: 10,
          color: rgb(0.4, 0.4, 0.4),
        });

        // Draw seal (increased size) at the bottom left
        if (stampImage) {
          page.drawImage(stampImage, {
            x: 35,
            y: 5,
            width: 45,
            height: 45,
          });
        }

        // Draw signature at the bottom right
        if (signImage) {
          page.drawImage(signImage, {
            x: width - 85,
            y: 10,
            width: 50,
            height: 22,
          });
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Stamped_Script_${regId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Stamped script downloaded successfully!");
    } catch (error) {
      console.error("Error stamping script:", error);
      toast.error("Failed to stamp and download the script.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadReceipt = async (reg) => {
    setIsDownloading(true);
    try {
      const regRef = doc(db, 'registrations', reg.registrationId);
      await updateDoc(regRef, { downloadCount: 1 });

      const docPdf = new jsPDF('p', 'mm', 'a4');
      
      // Draw border (Blue)
      docPdf.setDrawColor(0, 0, 150);
      docPdf.setLineWidth(0.5);
      docPdf.rect(10, 10, 190, 195);
      
      try {
        const logoImg = new Image();
        logoImg.src = '/Logo.png';
        const stampImg = new Image();
        stampImg.src = '/stamp.png';
        
        await Promise.all([
          new Promise((resolve, reject) => {
            logoImg.onload = resolve;
            logoImg.onerror = reject;
          }),
          new Promise((resolve, reject) => {
            stampImg.onload = resolve;
            stampImg.onerror = reject;
          })
        ]);
        
        // Draw only logo on the left (moved slightly higher and wider)
        docPdf.addImage(logoImg, 'PNG', 15, 11, 20, 30);
        
        // Draw rounded stamp/seal at the bottom center (replacing the logo)
        docPdf.addImage(stampImg, 'PNG', 95, 180, 20, 20);
      } catch (e) {
        console.error("Could not load logo/stamp images", e);
      }

      // Header Text
      docPdf.setTextColor(0, 0, 150); // Dark Blue
      docPdf.setFontSize(15);
      docPdf.setFont("helvetica", "bold");
      docPdf.text("TELUGU CINE WRITERS' ASSOCIATION", 38, 20);
      
      docPdf.setFontSize(7.5);
      docPdf.setFont("helvetica", "normal");
      docPdf.text("(Regd. No. A741, Registered under Trade Union Act, 1926, Affiliated to T.S.F.I.E.F.)", 38, 27);
      
      // Address Block (Right aligned)
      docPdf.setFontSize(8);
      docPdf.setFont("helvetica", "bold");
      const addressLines = [
        "H.No.8-3-720/9/2, Shalivahana Nagar",
        "Yellareddy Guda, Srinagar Colony",
        "Hyderabad - 500 073",
        "Cell: 9989990229",
        "e-mail: apcwa93@yahoo.co.in",
        "tcwa93@gmail.com"
      ];
      addressLines.forEach((line, i) => {
        const w = docPdf.getTextWidth(line);
        docPdf.text(line, 195 - w, 15 + (i * 4));
      });

      // Horizontal line
      docPdf.setDrawColor(0, 0, 150);
      docPdf.line(10, 42, 200, 42);

      // Receipt Title
      const receiptTitle = `${reg.category || 'Story'} Registration Receipt`;
      docPdf.setFontSize(14);
      docPdf.setTextColor(0, 0, 150);
      docPdf.text(receiptTitle, 105, 52, { align: "center" });
      const titleWidth = docPdf.getTextWidth(receiptTitle);
      docPdf.line(105 - (titleWidth/2), 53, 105 + (titleWidth/2), 53);

      // No. & Date
      docPdf.setFontSize(11);
      docPdf.setTextColor(0, 0, 150); // Text color blue for labels
      docPdf.text("No.", 15, 65);
      
      docPdf.setTextColor(200, 0, 0); // Red color for ID
      docPdf.setFontSize(14);
      docPdf.text(reg.registrationId, 25, 65);
      
      docPdf.setTextColor(0, 0, 150);
      docPdf.setFontSize(11);
      docPdf.text("Date: ....................................", 140, 65);
      docPdf.setTextColor(0, 0, 0); // Date in black
      docPdf.text(new Date(reg.createdAt).toLocaleDateString(), 152, 64);

      // Dynamic Fields Helper
      const lineStartY = 80;
      const lineGap = 15;
      
      const drawField = (label, value, y, dotStart) => {
        docPdf.setTextColor(0, 0, 150);
        docPdf.setFont("helvetica", "bold");
        docPdf.text(label, 15, y);
        
        // Draw dotted line
        docPdf.setDrawColor(0, 0, 150);
        docPdf.setLineDash([1, 1], 0);
        docPdf.line(dotStart, y, 195, y);
        docPdf.setLineDash([], 0);
        
        // Write value above dotted line
        docPdf.setTextColor(0, 0, 0);
        docPdf.setFont("helvetica", "normal");
        docPdf.text(String(value || ''), dotStart + 5, y - 2);
      };

      drawField("Name of the Writer", reg.writerName, lineStartY, 55);
      drawField("TCWA Membership No.", reg.membershipId, lineStartY + lineGap, 65);
      drawField("Title of the Story:", reg.title, lineStartY + lineGap * 2, 50);
      
      // Extra dotted line for story title
      docPdf.setDrawColor(0, 0, 150);
      docPdf.setLineDash([1, 1], 0);
      docPdf.line(15, lineStartY + lineGap * 2 + 10, 195, lineStartY + lineGap * 2 + 10);
      docPdf.setLineDash([], 0);

      drawField("Pages:", reg.pageCount, lineStartY + lineGap * 3 + 5, 30);
      drawField("Received the Sum of Rupees", reg.amount + " (Online Payment)", lineStartY + lineGap * 4 + 5, 75);
      
      // Extra dotted line for amount
      docPdf.setDrawColor(0, 0, 150);
      docPdf.setLineDash([1, 1], 0);
      docPdf.line(15, lineStartY + lineGap * 4 + 15, 195, lineStartY + lineGap * 4 + 15);
      docPdf.setLineDash([], 0);

      docPdf.setTextColor(0, 0, 150);
      docPdf.setFont("helvetica", "bold");
      docPdf.text("Cash / Card Swipe", 15, lineStartY + lineGap * 5 + 10);
      
      // Rs Box
      docPdf.setDrawColor(0, 0, 150);
      docPdf.rect(15, lineStartY + lineGap * 5 + 15, 35, 12);
      docPdf.text("Rs.", 18, lineStartY + lineGap * 5 + 23);
      docPdf.setTextColor(0, 0, 0);
      docPdf.text(String(reg.amount), 28, lineStartY + lineGap * 5 + 23);

      // Footer Signatures
      docPdf.setTextColor(0, 0, 150);
      docPdf.setFontSize(10);
      docPdf.setFont("helvetica", "bold");
      docPdf.text("GENERAL SECRETARY", 165, 185, { align: "center" });

      // Try signature if available
      try {
        const signImg = new Image();
        signImg.src = '/signature.png';
        await new Promise((resolve, reject) => {
          signImg.onload = resolve;
          signImg.onerror = reject;
        });
        docPdf.addImage(signImg, 'PNG', 145, 165, 40, 15);
      } catch (e) {}


      
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
    if (!razorpayKeyId) {
      toast.error("Payment configuration is missing.");
      return;
    }
    
    // Strict Security Check: Verify member still exists in DB before taking payment
    const memberDocSnap = await getDoc(doc(db, 'members', member.membershipId));
    if (!memberDocSnap.exists()) {
      toast.error("Your account no longer exists in the database. Logging out...");
      setTimeout(() => onLogout(), 2000);
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
      setReceiptModal({ type: null, registration: null });
    }
  };

  if (expiryDetails.isExpired) {
    return (
      <main className="min-h-screen bg-[#111111] overflow-y-auto py-12 px-4 flex items-center justify-center font-sans">
        <div className="bg-white border border-red-500/30 p-6 sm:p-8 rounded-lg shadow-2xl max-w-md w-full text-center space-y-5">
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
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
            <button 
              onClick={() => setShowSupportModal(true)}
              className="text-xs font-bold text-orange-500 hover:text-orange-600 transition"
            >
              Contact Admin
            </button>
            <button 
              onClick={onLogout}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-800 transition"
            >
              Logout from account
            </button>
          </div>
        </div>

        {showSupportModal && <SupportModal onClose={() => setShowSupportModal(false)} />}
      </main>
    );
  }

  if (receiptModal?.type === 'download' && receiptModal?.isPaymentSuccess) {
    return (
      <ReceiptModal 
        receiptModal={receiptModal}
        isDownloading={isDownloading}
        closeReceiptModal={closeReceiptModal}
        handleDownloadReceipt={handleDownloadReceipt}
        handleUnlockDownload={handleUnlockDownload}
        handleDownloadStampedScript={handleDownloadStampedScript}
        isFullScreen={true}
      />
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-50 text-zinc-900 flex flex-col font-sans relative">

      <DashboardHeader onLogout={onLogout} />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-28 pb-6 relative z-10 space-y-6">
        <ProfileCard member={member} expiryDetails={expiryDetails} />



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

      {receiptModal?.type && !receiptModal?.isPaymentSuccess && (
        <ReceiptModal 
          receiptModal={receiptModal}
          isDownloading={isDownloading}
          closeReceiptModal={closeReceiptModal}
          handleDownloadReceipt={handleDownloadReceipt}
          handleUnlockDownload={handleUnlockDownload}
          handleDownloadStampedScript={handleDownloadStampedScript}
          isFullScreen={false}
        />
      )}
      <Footer />
    </main>
  );
}
