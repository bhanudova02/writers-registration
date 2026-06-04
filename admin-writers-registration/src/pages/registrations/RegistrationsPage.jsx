import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
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

        const dateStr = reg.agreedAt ? new Date(reg.agreedAt).toLocaleString() : new Date().toLocaleString();

        // Build the HTML content with XML escaping on injected variables to prevent SVG parsing errors
        const htmlContent = `
            <div style="font-family: 'Outfit', 'Noto Sans Telugu', sans-serif; padding: 40px; color: #1f2937; line-height: 1.8; font-size: 14px; background: white;">
                <div style="text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
                    <div style="font-size: 26px; font-weight: 900; color: #f97316; margin-bottom: 5px; letter-spacing: 0.05em;">TCWA</div>
                    <div style="font-size: 20px; font-weight: 900; color: #1e3a8a;">TELUGU CINE WRITERS' ASSOCIATION</div>
                    <div style="font-size: 10px; color: #4b5563; font-weight: bold; margin-top: 5px;">(Regd. No. A741, Registered under Trade Union Act, 1926)</div>
                </div>

                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 18px; border-radius: 8px; font-size: 13px; margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div><strong>Registration ID:</strong> ${escapeXml(reg.registrationId || reg.id)}</div>
                    <div><strong>Writer Name:</strong> ${escapeXml(reg.writerName || "N/A")}</div>
                    <div><strong>Membership ID:</strong> ${escapeXml(reg.membershipId || "N/A")}</div>
                    <div><strong>Date Signed:</strong> ${escapeXml(dateStr)}</div>
                </div>

                <div style="font-size: 18px; font-weight: 900; text-align: center; margin-top: 25px; margin-bottom: 25px; color: #111827; text-decoration: underline;">
                    ${reg.category && reg.category.toLowerCase().includes('song') ? 'పాటల రిజిస్ట్రేషన్ హామీపత్రం' : 'స్టోరీ రిజిస్ట్రేషన్ హామీపత్రం'}
                </div>

                <div style="white-space: pre-line; text-align: justify; margin-bottom: 35px; font-size: 13px;">
                    ${escapeXml(reg.agreementText)}
                </div>
            </div>
        `;

        // Create a temporary container element to let the browser compute the layout height
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '800px';
        tempDiv.innerHTML = htmlContent;
        document.body.appendChild(tempDiv);

        // Wait a small moment for layout calculation
        setTimeout(async () => {
            const contentHeight = tempDiv.offsetHeight;
            document.body.removeChild(tempDiv);

            // Construct SVG
            const svgString = `
                <svg xmlns="http://www.w3.org/2000/svg" width="800" height="${contentHeight}">
                    <foreignObject width="100%" height="100%">
                        <div xmlns="http://www.w3.org/1999/xhtml">
                            ${htmlContent}
                        </div>
                    </foreignObject>
                </svg>
            `;

            const img = new Image();
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const URL = window.URL || window.webkitURL || window;
            const blobURL = URL.createObjectURL(svgBlob);

            img.onload = async () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 800;
                    canvas.height = contentHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);

                    // Clean up URL
                    URL.revokeObjectURL(blobURL);

                    // A4 size: 595.28 x 841.89 points
                    // Scale factor: 595.28 / 800 = 0.7441
                    const scaleFactor = 595.28 / 800;
                    const pdfPageHeight = 841.89;

                    const pdf = new jsPDF('p', 'pt', 'a4');
                    
                    let yOffset = 0;
                    while (yOffset < contentHeight) {
                        if (yOffset > 0) {
                            pdf.addPage();
                        }
                        
                        // Create a temporary canvas for this page segment
                        const pageCanvas = document.createElement('canvas');
                        pageCanvas.width = 800;
                        // Limit height to one A4 page equivalent in pixels (841.89 / scaleFactor)
                        const pageSegmentHeight = Math.min(contentHeight - yOffset, pdfPageHeight / scaleFactor);
                        pageCanvas.height = pageSegmentHeight;
                        
                        const pageCtx = pageCanvas.getContext('2d');
                        pageCtx.fillStyle = '#ffffff';
                        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                        pageCtx.drawImage(canvas, 0, yOffset, 800, pageSegmentHeight, 0, 0, 800, pageSegmentHeight);
                        
                        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
                        pdf.addImage(pageImgData, 'JPEG', 0, 0, 595.28, pageSegmentHeight * scaleFactor);
                        
                        yOffset += pageSegmentHeight;
                    }

                    pdf.save(`TCWA_Agreement_${reg.registrationId || reg.id}.pdf`);
                    toast.update(toastId, { render: "Agreement PDF downloaded successfully!", type: "success", isLoading: false, autoClose: 3000 });
                } catch (error) {
                    console.error("PDF generation failed:", error);
                    toast.update(toastId, { render: "Failed to generate PDF. Please try again.", type: "error", isLoading: false, autoClose: 3000 });
                }
            };

            img.onerror = (e) => {
                console.error("Failed to load SVG into Image", e);
                toast.update(toastId, { render: "Failed to load layout image. Please verify if the content has invalid characters.", type: "error", isLoading: false, autoClose: 3000 });
            };

            img.src = blobURL;
        }, 100);
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
                                        onClick={() => setShowAgreementViewer(viewReceipt.agreementText)}
                                        className="px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold rounded transition cursor-pointer"
                                    >
                                        View Agreement Text
                                    </button>
                                </div>
                            </div>
                        )}

                        </div>
                        <div className="border-t border-zinc-200 px-5 py-3 bg-zinc-50 rounded-b-lg flex justify-end">
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
                                {showAgreementViewer}
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
