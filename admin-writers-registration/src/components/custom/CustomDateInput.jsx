import { useRef } from "react";
import { FiCalendar } from "react-icons/fi";

export default function CustomDateInput({ 
    value, 
    onChange, 
    type = "datetime-local", 
    placeholder = "Select Date",
    className = "",
    error,
    label,
    ...props 
}) {
    const inputRef = useRef(null);

    const handleClick = () => {
        if (inputRef.current) {
            inputRef.current.showPicker?.();
        }
    };

    // Format the display value
    const getDisplayValue = () => {
        if (!value) return placeholder;
        try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return value;
            
            if (type === "date") {
                return date.toLocaleDateString([], { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                });
            }
            
            return date.toLocaleString([], { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return value;
        }
    };

    return (
        <div className="w-full">
            {label && <label className="custom-label mb-1 block">{label}</label>}
            <div 
                onClick={handleClick}
                className={`
                    relative flex items-center justify-between
                    bg-white border border-zinc-200 rounded-sm
                    px-3 h-[36px] cursor-pointer hover:border-zinc-400 
                    transition-all duration-200
                    ${className}
                `}
            >
                <span className={`text-[12px] font-medium ${!value ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {getDisplayValue()}
                </span>
                <FiCalendar className="text-zinc-400 text-sm flex-shrink-0 ml-2" />
                
                <input
                    ref={inputRef}
                    type={type}
                    value={value}
                    onChange={onChange}
                    className="absolute inset-0 opacity-0 w-0 h-0 overflow-hidden pointer-events-none"
                    {...props}
                />
            </div>
            {error && <p className="text-red-500 text-[10px] font-semibold mt-1">{error}</p>}
        </div>
    );
}
