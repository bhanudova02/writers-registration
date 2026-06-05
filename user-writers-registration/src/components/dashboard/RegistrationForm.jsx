import { FileText, UploadCloud, RefreshCw, Loader2 } from 'lucide-react';
import { categories } from '../../data/constants';
import { CustomSelect } from '../custom/CustomSelect';
import { toast } from 'react-toastify';

export default function RegistrationForm({ 
  handleRegisterScript, 
  scriptTitle, 
  setScriptTitle, 
  selectedCategory, 
  setSelectedCategory, 
  pdfFile, 
  setPdfFile, 
  calculatePdfPages, 
  pageCount, 
  isCalculatingPages, 
  isRegistering,
  isAgreed,
  setIsAgreed,
  setShowAgreementModal,
  pageValidationError
}) {
  const validateFormBeforeAgreement = () => {
    if (!scriptTitle || !scriptTitle.trim()) {
      toast.error("Please enter Movie Script / Song Title first.");
      return false;
    }
    if (!selectedCategory) {
      toast.error("Please select a Registration Category first.");
      return false;
    }
    if (!pdfFile) {
      toast.error("Please upload the Movie Script PDF first.");
      return false;
    }
    if (isCalculatingPages || pageCount === 0) {
      toast.error("Please wait for the page count calculation to complete.");
      return false;
    }
    if (pageValidationError) {
      toast.error(pageValidationError);
      return false;
    }
    return true;
  };

  return (
    <form onSubmit={handleRegisterScript} className="bg-white border border-slate-200 p-5 sm:p-6 rounded-lg space-y-5">
      <div className="flex items-start gap-1.5 border-b border-zinc-200/60 pb-3">
        <FileText className="text-orange-500 mt-0.5 md:mt-1" />
        <div>
          <h3 className="text-base md:text-lg font-bold text-zinc-900">Register New Movie Script</h3>
          <p className="text-xs text-zinc-500">Calculate page count and generate digital stamped receipt instantly.</p>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-2">
          Movie Script / Song Title *
        </label>
        <input
          type="text"
          value={scriptTitle}
          onChange={(e) => setScriptTitle(e.target.value)}
          placeholder="Enter script or song title"
          className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-orange-500 transition-colors"
          required
        />
      </div>

      <div>
        <CustomSelect
          label="Registration Category *"
          dropdownData={categories}
          value={selectedCategory}
          onChange={setSelectedCategory}
          buttonClassName="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-orange-500 transition-colors h-auto min-h-[42px]"
          className="z-50"
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-2">
          Upload Movie Script PDF *
        </label>
        <label className="border border-dashed border-zinc-200 bg-zinc-50/50 hover:bg-white/60 hover:border-zinc-300 rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer transition relative group">
          <UploadCloud className="text-zinc-500 group-hover:text-orange-500 mb-2 transition-colors" size={28} />
          <span className="text-xs font-bold text-zinc-700">
            {pdfFile ? pdfFile.name : 'Select or Drop Script PDF'}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1">
            {pdfFile ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB` : 'PDF must remain private (100% Writer Privacy Shield)'}
          </span>
          <input
            type="file"
            accept="application/pdf"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (file) {
                if (file.type !== 'application/pdf') {
                  toast.error("Please upload a valid PDF file.");
                  return;
                }
                setPdfFile(file);
                await calculatePdfPages(file);
              }
            }}
            className="sr-only"
          />
        </label>
        {pageValidationError && (
          <p className="text-xs font-semibold text-red-500 mt-2 flex items-center gap-1.5 bg-red-50/50 border border-red-100 rounded px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
            <span>{pageValidationError}</span>
          </p>
        )}
      </div>

      <div className="max-w-xs">
        <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-2">
          Document Pages Count *
        </label>
        <div className="relative">
          <input
            type="number"
            min="0"
            readOnly
            value={pageCount}
            className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-orange-500 transition-colors font-bold cursor-not-allowed opacity-80"
            required
          />
          {isCalculatingPages && (
            <div className="absolute right-3 top-2.5">
              <Loader2 className="animate-spin text-orange-500" size={18} />
            </div>
          )}
        </div>
        <p className="text-[10px] text-zinc-500 mt-1.5 font-medium italic">
          * Pages are automatically calculated from the uploaded PDF.
        </p>
      </div>

      {/* Agreement Checkbox */}
      <div className="flex items-start gap-2.5 pt-1.5 pb-0.5">
        <input
          type="checkbox"
          id="agreeAgreement"
          checked={isAgreed}
          onChange={(e) => {
            if (e.target.checked) {
              if (validateFormBeforeAgreement()) {
                setShowAgreementModal(true);
              } else {
                setIsAgreed(false);
              }
            } else {
              setIsAgreed(false);
            }
          }}
          className="size-4.5 rounded border-zinc-300 text-orange-500 focus:ring-orange-500 cursor-pointer mt-0.5"
        />
        <label htmlFor="agreeAgreement" className="text-xs text-zinc-600 leading-normal cursor-pointer select-none font-medium">
          I read and agree to the{" "}
          <span 
            onClick={(e) => {
              e.preventDefault();
              if (validateFormBeforeAgreement()) {
                setShowAgreementModal(true);
              }
            }} 
            className="text-orange-500 font-bold hover:underline cursor-pointer"
          >
            TCWA Story Registration Agreement (హామీపత్రం)
          </span> *
        </label>
      </div>

      <button
        type="submit"
        disabled={isRegistering || isCalculatingPages || !!pageValidationError}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg text-sm transition shadow-[0_4px_14px_0_rgb(249,115,22,0.39)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.23)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        {isRegistering ? (
          <>
            <RefreshCw size={16} className="animate-spin" />
            <span>Initializing Secure Payment...</span>
          </>
        ) : isCalculatingPages ? (
          <>
            <RefreshCw size={16} className="animate-spin" />
            <span>Calculating Pages...</span>
          </>
        ) : (
          <span>Proceed to Payment (₹{pageCount * 10})</span>
        )}
      </button>
    </form>
  );
}
