import { X, Mail, MessageCircle, PhoneCall } from 'lucide-react';

export default function SupportModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Contact Support</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div className="flex flex-col">
          <a 
            href="mailto:support@tcwa.in" 
            className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100 group"
          >
            <Mail size={20} className="text-slate-400 group-hover:text-orange-500 transition-colors" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold text-slate-900">Email Address</p>
              <p className="text-xs text-slate-500">support@tcwa.in</p>
            </div>
          </a>
          <a 
            href="https://wa.me/919876543210" 
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100 group"
          >
            <MessageCircle size={20} className="text-slate-400 group-hover:text-green-500 transition-colors" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold text-slate-900">WhatsApp Chat</p>
              <p className="text-xs text-slate-500">+91 98765 43210</p>
            </div>
          </a>
          <a 
            href="tel:+919876543210" 
            className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
          >
            <PhoneCall size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold text-slate-900">Call Admin</p>
              <p className="text-xs text-slate-500">+91 98765 43210</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
