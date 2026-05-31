import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, widthClass = "md:max-w-md", overflowVisible = false }) {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-[90%] ${widthClass} p-6 relative flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4 shrink-0">
          <h4 className="text-lg font-semibold text-zinc-800">{title}</h4>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className={overflowVisible ? "overflow-visible" : "overflow-y-auto only-scroll-width pr-1"}>
          {children}
        </div>
      </div>
    </div>
  );
}
