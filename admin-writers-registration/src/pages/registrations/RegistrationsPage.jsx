import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { FaFileSignature, FaSearch } from "react-icons/fa";
import { FiCheckCircle, FiXCircle, FiEye, FiTrendingUp } from "react-icons/fi";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db, auth } from "../../firebase";
import CustomButton from "../../components/custom/CustomButton";
import { CustomSelect } from "../../components/custom/CustomSelect";
import { toast } from "react-toastify";
import { logAdminActivity } from "../../lib/logger";
import { TableSkeleton } from "../../components/Skeletons";


const escapeXml = (str) => {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
};

export default function RegistrationsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [registrations, setRegistrations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewReceipt, setViewReceipt] = useState(null);
    const [showAgreementViewer, setShowAgreementViewer] = useState(null);

    const handleDownloadAgreementDoc = async (reg) => {
        if (!reg.agreementText) {
            toast.error("No agreement text found for this registration.");
            return;
        }

        const toastId = toast.loading("Generating PDF, please wait...");

        try {
            // Split the agreement text by newlines into paragraphs
            const paragraphsList = reg.agreementText.split('\n');

            // Preload stamp image
            const sealImg = new Image();
            sealImg.src = '/stamp.png';
            await new Promise((resolve) => {
                sealImg.onload = resolve;
                sealImg.onerror = resolve;
            });

            // Create a temporary hidden container to measure paragraph heights
            const tempMeasureDiv = document.createElement('div');
            tempMeasureDiv.style.position = 'fixed';
            tempMeasureDiv.style.left = '0';
            tempMeasureDiv.style.top = '0';
            tempMeasureDiv.style.transform = 'translate(-200%, -200%)';
            tempMeasureDiv.style.width = '800px';
            tempMeasureDiv.style.boxSizing = 'border-box';
            tempMeasureDiv.style.padding = '50px 60px'; // Matching page padding
            tempMeasureDiv.style.zIndex = '-9999';

            // Add Header with Agreement ID and Seal
            const headerDiv = document.createElement('div');
            headerDiv.style.display = 'flex';
            headerDiv.style.justifyContent = 'space-between';
            headerDiv.style.alignItems = 'flex-start';
            headerDiv.style.marginBottom = '24px';
            headerDiv.style.borderBottom = '1px solid #e4e4e7';
            headerDiv.style.paddingBottom = '16px';
            headerDiv.style.fontFamily = "'Outfit', 'Noto Sans Telugu', sans-serif";

            const idContainer = document.createElement('div');
            const label = document.createElement('h4');
            label.textContent = 'హామీపత్రం నంబర్:';
            label.style.fontSize = '12px';
            label.style.fontWeight = 'bold';
            label.style.color = '#71717a';
            label.style.textTransform = 'uppercase';
            label.style.letterSpacing = '0.05em';
            label.style.marginBottom = '4px';

            const idSpan = document.createElement('span');
            idSpan.textContent = reg.agreementId || 'N/A';
            idSpan.style.color = '#dc2626';
            idSpan.style.fontWeight = '800';
            idSpan.style.fontSize = '16px';
            idSpan.style.letterSpacing = '0.025em';
            idSpan.style.backgroundColor = '#fef2f2';
            idSpan.style.padding = '4px 10px';
            idSpan.style.borderRadius = '6px';
            idSpan.style.border = '1px solid #fee2e2';

            idContainer.appendChild(label);
            idContainer.appendChild(idSpan);

            const imgContainer = document.createElement('div');
            const sealImgElement = document.createElement('img');
            sealImgElement.src = sealImg.src;
            sealImgElement.style.width = '64px';
            sealImgElement.style.height = '64px';
            sealImgElement.style.opacity = '0.95';
            imgContainer.appendChild(sealImgElement);

            headerDiv.appendChild(idContainer);
            headerDiv.appendChild(imgContainer);

            tempMeasureDiv.appendChild(headerDiv);

            // Insert each paragraph inside its own div to measure offsetHeight
            paragraphsList.forEach((para) => {
                const pDiv = document.createElement('div');
                pDiv.style.fontFamily = "'Outfit', 'Noto Sans Telugu', sans-serif";
                pDiv.style.fontSize = '14px';
                pDiv.style.lineHeight = '1.8';
                pDiv.style.color = '#111827';
                pDiv.style.textAlign = 'justify';
                pDiv.style.whiteSpace = 'pre-wrap';
                pDiv.style.marginBottom = '12px';
                pDiv.style.minHeight = '18px';
                pDiv.textContent = para;
                tempMeasureDiv.appendChild(pDiv);
            });

            document.body.appendChild(tempMeasureDiv);

            // Wait for fonts to load so height calculations are accurate
            if (document.fonts) {
                await document.fonts.ready;
            }

            const pElements = Array.from(tempMeasureDiv.children);

            // A4 page height in pixels at 800px width:
            // A4 width: 595.28pt, A4 height: 841.89pt
            // scaleFactor: 595.28 / 800 = 0.7441
            // Max height in pixels = 841.89 / 0.7441 = 1131.4px
            // Available height for text = Max height - top padding (50px) - bottom padding (50px) = 1031px
            const usablePageHeight = 1031;

            const pages = [];
            let currentPageParas = [];
            let currentPageHeight = 0;

            pElements.forEach((pEl) => {
                const elHeight = pEl.offsetHeight + 12; // Height + margin-bottom
                if (currentPageHeight + elHeight > usablePageHeight && currentPageParas.length > 0) {
                    // Push current page and start a new page
                    pages.push(currentPageParas);
                    currentPageParas = [pEl];
                    currentPageHeight = elHeight;
                } else {
                    currentPageParas.push(pEl);
                    currentPageHeight += elHeight;
                }
            });

            if (currentPageParas.length > 0) {
                pages.push(currentPageParas);
            }

            // Remove the measurement div
            document.body.removeChild(tempMeasureDiv);

            const pdf = new jsPDF('p', 'pt', 'a4');
            const scaleFactor = 595.28 / 800;

            for (let i = 0; i < pages.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }

                // Create a temporary container for this specific page
                const pageContainer = document.createElement('div');
                pageContainer.style.position = 'fixed';
                pageContainer.style.left = '0';
                pageContainer.style.top = '0';
                pageContainer.style.transform = 'translate(-200%, -200%)';
                pageContainer.style.width = '800px';
                pageContainer.style.boxSizing = 'border-box';
                pageContainer.style.padding = '50px 60px';
                pageContainer.style.background = 'white';
                pageContainer.style.zIndex = '-9999';

                // Clone paragraphs belonging to this page
                pages[i].forEach((pEl) => {
                    pageContainer.appendChild(pEl.cloneNode(true));
                });

                document.body.appendChild(pageContainer);

                const canvas = await html2canvas(pageContainer, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false
                });

                document.body.removeChild(pageContainer);

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const pageHeightPoints = (canvas.height / 2) * scaleFactor;

                pdf.addImage(imgData, 'JPEG', 0, 0, 595.28, pageHeightPoints);
            }

            pdf.save(`TCWA_Agreement_${reg.registrationId || reg.id}.pdf`);
            toast.update(toastId, { render: "Agreement PDF downloaded successfully!", type: "success", isLoading: false, autoClose: 3000 });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.update(toastId, { render: "Failed to generate PDF. Please try again.", type: "error", isLoading: false, autoClose: 3000 });
        }
    };

    const handleDownloadReceipt = async (reg) => {
        const toastId = toast.loading("Downloading Receipt...");
        try {
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

                // Draw only logo on the left
                docPdf.addImage(logoImg, 'PNG', 15, 11, 20, 30);
                // Draw rounded stamp/seal at the bottom center
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
            docPdf.line(105 - (titleWidth / 2), 53, 105 + (titleWidth / 2), 53);

            // No. & Date
            docPdf.setFontSize(11);
            docPdf.setTextColor(0, 0, 150);
            docPdf.text("Registration ID:", 15, 65);

            docPdf.setTextColor(200, 0, 0); // Red color for ID
            docPdf.setFontSize(14);
            docPdf.text(reg.registrationId || reg.id, 48, 65);

            docPdf.setTextColor(0, 0, 150);
            docPdf.setFontSize(11);
            docPdf.text("Date: ....................................", 140, 65);
            docPdf.setTextColor(0, 0, 0);
            docPdf.text(new Date(reg.createdAt).toLocaleDateString(), 152, 64);

            // Dynamic Fields Helper
            const lineStartY = 80;
            const lineGap = 15;

            const drawField = (label, value, y, dotStart) => {
                docPdf.setTextColor(0, 0, 150);
                docPdf.setFont("helvetica", "bold");
                docPdf.text(label, 15, y);

                docPdf.setDrawColor(0, 0, 150);
                docPdf.setLineDash([1, 1], 0);
                docPdf.line(dotStart, y, 195, y);
                docPdf.setLineDash([], 0);

                docPdf.setTextColor(0, 0, 0);
                docPdf.setFont("helvetica", "normal");
                docPdf.text(String(value || ''), dotStart + 5, y - 2);
            };

            drawField("Name of the Writer", reg.writerName, lineStartY, 55);
            drawField("TCWA Membership No.", reg.membershipId, lineStartY + lineGap, 65);
            drawField("Title:", reg.title, lineStartY + lineGap * 2, 25);

            docPdf.setDrawColor(0, 0, 150);
            docPdf.setLineDash([1, 1], 0);
            docPdf.line(15, lineStartY + lineGap * 2 + 10, 195, lineStartY + lineGap * 2 + 10);
            docPdf.setLineDash([], 0);

            drawField("Pages:", reg.pageCount, lineStartY + lineGap * 3 + 5, 30);
            drawField("Received the Sum of Rupees", reg.amount + " (Online Payment)", lineStartY + lineGap * 4 + 5, 75);

            docPdf.setDrawColor(0, 0, 150);
            docPdf.setLineDash([1, 1], 0);
            docPdf.line(15, lineStartY + lineGap * 4 + 15, 195, lineStartY + lineGap * 4 + 15);
            docPdf.setLineDash([], 0);

            docPdf.setTextColor(0, 0, 150);
            docPdf.setFont("helvetica", "bold");
            docPdf.text("Cash / Card Swipe", 15, lineStartY + lineGap * 5 + 10);

            docPdf.setDrawColor(0, 0, 150);
            docPdf.rect(15, lineStartY + lineGap * 5 + 15, 35, 12);
            docPdf.text("Rs.", 18, lineStartY + lineGap * 5 + 23);
            docPdf.setTextColor(0, 0, 0);
            docPdf.text(String(reg.amount), 28, lineStartY + lineGap * 5 + 23);

            docPdf.setTextColor(0, 0, 150);
            docPdf.setFontSize(10);
            docPdf.setFont("helvetica", "bold");
            docPdf.text("GENERAL SECRETARY", 165, 185, { align: "center" });

            try {
                const signImg = new Image();
                signImg.src = '/signature.png';
                await new Promise((resolve, reject) => {
                    signImg.onload = resolve;
                    signImg.onerror = reject;
                });
                docPdf.addImage(signImg, 'PNG', 145, 165, 40, 15);
            } catch (e) { }

            docPdf.save(`TCWA_Receipt_${reg.registrationId || reg.id}.pdf`);
            toast.update(toastId, { render: "Receipt PDF downloaded successfully!", type: "success", isLoading: false, autoClose: 3000 });
        } catch (error) {
            console.error(error);
            toast.update(toastId, { render: "Failed to download receipt. Please try again.", type: "error", isLoading: false, autoClose: 3000 });
        }
    };

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const pageSizeOptions = [10, 20, 50, 100];

    // Reset page to 1 on search filter
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Fetch registrations in real-time from Firestore
    useEffect(() => {
        const regsRef = collection(db, "registrations");
        const q = query(regsRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                list.push({
                    id: docSnap.id,
                    ...data
                });
            });
            setRegistrations(list);
            setIsLoading(false);
        }, (error) => {
            console.error(error);
            toast.error("Failed to load registrations from database.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Filter registrations
    const filteredRegs = registrations.filter(reg => {
        const title = reg.title || "";
        const writer = reg.writerName || "";
        const regId = reg.registrationId || "";

        const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              writer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              regId.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesSearch;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredRegs.length / pageSize) || 1;
    const paginatedRegs = filteredRegs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const fromIndex = (currentPage - 1) * pageSize + 1;
    const toIndex = Math.min(currentPage * pageSize, filteredRegs.length);

    return (
        <div className="p-3 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <FaFileSignature className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                <h1 className="text-base sm:text-xl font-bold text-gray-800">Movie Script Registrations</h1>
            </div>

            {/* Main Action Card */}
            <div className="border border-zinc-200 bg-white px-4 md:px-6 pt-5 pb-6 rounded-md shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-zinc-800">Script Registration Receipts</h3>
                        <p className="text-sm text-zinc-500 mt-1">Track and manage real member movie script registration receipts.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 sm:w-64 w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaSearch className="text-zinc-400 text-sm" />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-10 pr-3 py-1.5 border border-zinc-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 bg-zinc-50 text-zinc-800 placeholder-zinc-400"
                                placeholder="Search script, writer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <TableSkeleton rowCount={5} colCount={8} />
                ) : filteredRegs.length === 0 ? (
                    <div className="py-16 text-center border border-dashed border-zinc-200 rounded flex flex-col items-center justify-center">
                        <FaFileSignature className="text-zinc-300 text-4xl mb-3" />
                        <p className="text-sm font-bold text-zinc-500">No script registrations match your filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse border border-zinc-200">
                            <thead>
                                <tr className="bg-zinc-100 border-b border-zinc-200">
                                    {["Reg ID", "Script Title", "Writer Name", "Category", "Pages Count", "Fee Paid", "Status", "Actions"].map((head) => (
                                        <th key={head} className={`border border-zinc-200 py-3 px-3 text-xs font-bold text-zinc-600 uppercase whitespace-nowrap ${head === 'Actions' || head === 'Status' ? 'text-center' : 'text-left'}`}>
                                            {head}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRegs.map((reg) => (
                                    <tr key={reg.id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-700 w-44 whitespace-nowrap">
                                            {reg.registrationId || reg.id}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-zinc-800">
                                            {reg.title}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-semibold text-zinc-700 capitalize w-56 min-w-[180px]">
                                            {reg.writerName || "N/A"} (ID: {reg.membershipId})
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[12px] font-semibold text-zinc-600">
                                            {reg.category}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[12px] font-medium text-zinc-500">
                                            {reg.pageCount} Pages
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 text-[13px] font-bold text-green-700">
                                            ₹{reg.amount}
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 w-28 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${reg.status === 'Approved' ? 'bg-green-100 text-green-700' : reg.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {reg.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="border border-zinc-200 py-3 px-3 w-32 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => setViewReceipt(reg)}
                                                    className="flex items-center gap-1.5 py-1 px-2.5 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 transition cursor-pointer text-[11px] font-bold"
                                                    title="View Receipt Details"
                                                >
                                                    <FiEye size={13} />
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {filteredRegs.length > 0 && (
                            <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm md:flex md:items-center md:justify-between md:gap-3">
                                <div className="flex items-center justify-between gap-2 md:flex-1">
                                    <p className="font-semibold text-zinc-600">
                                        <span className="hidden xl:inline">Showing </span>{fromIndex}-{toIndex} Of {filteredRegs.length}
                                    </p>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <label className="text-xs font-bold uppercase text-zinc-500">
                                                Rows
                                            </label>
                                            <CustomSelect
                                                dropdownData={pageSizeOptions.map(size => ({ value: size, label: size }))}
                                                value={pageSize}
                                                onChange={(value) => {
                                                    setPageSize(Number(value));
                                                    setCurrentPage(1);
                                                }}
                                                buttonClassName="h-8 py-0 min-w-16 bg-white !text-xs"
                                                label={null}
                                            />
                                        </div>
                                        <span className="rounded-sm bg-white px-2 py-1.5 text-xs font-bold text-zinc-700 border border-zinc-200 sm:text-sm">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-col gap-3 md:mt-0 md:flex-row md:items-center md:justify-end">
                                    <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                            disabled={currentPage === 1}
                                            className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 hover:bg-zinc-100 transition"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                            disabled={currentPage === totalPages}
                                            className="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 hover:bg-zinc-100 transition"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* View Receipt Modal */}
            {viewReceipt && (
                <div className="fixed inset-0 z-[60] bg-black/60 px-4 py-8 flex items-center justify-center">
                    <div className="w-full max-w-3xl rounded-lg border border-zinc-200 bg-white shadow-2xl my-auto flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 bg-zinc-50 rounded-t-lg shrink-0">
                            <h3 className="text-base font-bold text-zinc-800">Registration Details</h3>
                            <button
                                onClick={() => setViewReceipt(null)}
                                className="text-zinc-500 hover:text-zinc-800 transition cursor-pointer"
                            >
                                <FiXCircle size={20} />
                            </button>
                        </div>
                        {/* Scrollable Body Container */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 text-sm font-medium text-zinc-700">
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500">Member Name:</span> 
                                <span className="font-bold text-zinc-900 text-right">{viewReceipt.writerName || "N/A"}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500">Membership Id:</span> 
                                <span className="font-bold text-zinc-900 text-right">{viewReceipt.membershipId || "N/A"}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500">Title:</span> 
                                <span className="font-bold text-zinc-900 text-right">{viewReceipt.title || "N/A"}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500">Script Type / Category:</span> 
                                <span className="font-bold text-zinc-900 text-right">{viewReceipt.category || "N/A"}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500">Total Pages:</span> 
                                <span className="font-bold text-zinc-900 text-right">{viewReceipt.pageCount || 0}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500">Registration Id:</span> 
                                <span className="font-bold text-zinc-900 text-right">{viewReceipt.registrationId || viewReceipt.id}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500">Payment ID:</span> 
                                <span className="font-bold text-zinc-900 text-right break-all ml-4">{viewReceipt.paymentId || "N/A"}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500">Payment Status:</span> 
                                <span className={`font-bold text-right ${viewReceipt.paymentStatus === 'Success' ? 'text-green-600' : 'text-zinc-900'}`}>{viewReceipt.paymentStatus || "N/A"}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500">PDF File:</span> 
                                <span className="font-bold text-zinc-900 text-right truncate ml-4" title={viewReceipt.pdfFileName}>{viewReceipt.pdfFileName || "N/A"}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500">Date & Time:</span> 
                                <span className="font-bold text-zinc-900 text-right">{viewReceipt.createdAt ? new Date(viewReceipt.createdAt).toLocaleString() : "N/A"}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500">Status:</span> 
                                <span className={`font-bold text-right ${viewReceipt.status === 'Approved' ? 'text-green-600' : viewReceipt.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'}`}>
                                    {viewReceipt.status || 'Pending'}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500">Amount Paid:</span> 
                                <span className="font-bold text-green-600 text-right text-base">₹{viewReceipt.amount || 0}</span>
                            </div>
                        </div>

                        {viewReceipt.agreementSigned && (
                            <div className="mx-5 mb-5 p-4 border border-orange-200 bg-orange-50/50 rounded-md">
                                <h4 className="text-xs font-extrabold text-orange-850 uppercase tracking-wider mb-2">TCWA Registration Agreement (హామీపత్రం)</h4>
                                <p className="text-xs text-zinc-600 mb-3">
                                    This script was registered with a digitally signed agreement.
                                    Agreed on: <span className="font-semibold text-zinc-900">{viewReceipt.agreedAt ? new Date(viewReceipt.agreedAt).toLocaleString() : "N/A"}</span>
                                </p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleDownloadAgreementDoc(viewReceipt)}
                                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded transition shadow-sm hover:shadow-orange-600/10 flex items-center gap-1 cursor-pointer"
                                    >
                                        Download Agreement PDF
                                    </button>
                                    <button 
                                        onClick={() => setShowAgreementViewer(viewReceipt)}
                                        className="px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold rounded transition cursor-pointer"
                                    >
                                        View Agreement Text
                                    </button>
                                </div>
                            </div>
                        )}

                        </div>
                        <div className="border-t border-zinc-200 px-5 py-3 bg-zinc-50 rounded-b-lg flex justify-between items-center">
                            <button onClick={() => handleDownloadReceipt(viewReceipt)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition cursor-pointer flex items-center gap-1.5"><FaFileSignature className="text-white" /> Download Receipt</button>
                            <button onClick={() => setViewReceipt(null)} className="px-4 py-2 bg-zinc-800 text-white rounded text-sm font-semibold hover:bg-zinc-700 transition cursor-pointer">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {showAgreementViewer && (
                <div className="fixed inset-0 z-[70] bg-black/60 px-4 py-8 overflow-y-auto flex items-center justify-center">
                    <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white shadow-2xl flex flex-col max-h-[80vh] my-auto">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 bg-zinc-50 rounded-t-lg">
                            <h3 className="text-sm sm:text-base font-extrabold text-zinc-800">TCWA Signed Agreement Viewer</h3>
                            <button
                                onClick={() => setShowAgreementViewer(null)}
                                className="text-zinc-500 hover:text-zinc-855 transition cursor-pointer"
                            >
                                <FiXCircle size={20} />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1 text-xs sm:text-sm text-zinc-700 whitespace-pre-line leading-relaxed font-sans">
                            <div className="bg-zinc-50 p-4 border border-zinc-200 rounded font-sans leading-relaxed text-justify">
                                <div className="flex justify-between items-start mb-6 border-b border-zinc-200 pb-4">
                                  <div>
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">హామీపత్రం నంబర్:</h4>
                                    <span className="text-red-600 font-extrabold text-base tracking-wide bg-red-50 px-2.5 py-1 rounded-md border border-red-100">{showAgreementViewer.agreementId || 'N/A'}</span>
                                  </div>
                                  <div className="relative">
                                    <img src="/stamp.png" alt="TCWA Seal" className="w-16 h-16 opacity-95 drop-shadow-sm mix-blend-multiply" />
                                  </div>
                                </div>
                                {showAgreementViewer.agreementText}
                            </div>
                        </div>
                        <div className="border-t border-zinc-200 px-5 py-3 bg-zinc-50 rounded-b-lg flex justify-end">
                            <button onClick={() => setShowAgreementViewer(null)} className="px-4 py-2 bg-zinc-800 text-white rounded text-sm font-semibold hover:bg-zinc-700 transition cursor-pointer">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
