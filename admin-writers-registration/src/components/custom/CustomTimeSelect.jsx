import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from "react-dom";
import { FaAngleDown, FaCheck } from "react-icons/fa";

const CustomTimeSelect = ({ value, onChange, className = "", isUp = false }) => {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);
    const optionRefs = useRef([]);

    const timeOptions = useMemo(() => {
        const options = [];
        const now = new Date();
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const format12h = (date) => {
            let hours = date.getHours();
            const minutes = date.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const strMinutes = minutes < 10 ? '0' + minutes : minutes;
            return `${hours}:${strMinutes} ${ampm}`;
        };

        const startTime = new Date(now);
        startTime.setHours(startTime.getHours() + 1);
        startTime.setMinutes(0, 0, 0);
        startTime.setSeconds(0, 0);

        for (let i = 0; i < 24; i++) {
            const slotDate = new Date(startTime);
            slotDate.setHours(startTime.getHours() + i);
            const monthDayLabel = `${months[slotDate.getMonth()]}-${slotDate.getDate()}`;
            options.push({
                label: `(${monthDayLabel}) ${format12h(slotDate)}`,
                value: slotDate.toISOString()
            });
        }
        return options;
    }, []);

    const updateCoords = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: isUp ? rect.top : rect.bottom,
                left: rect.left,
                width: rect.width,
            });
        }
    };

    useEffect(() => {
        if (open) {
            updateCoords();
            window.addEventListener("scroll", updateCoords, true);
            window.addEventListener("resize", updateCoords);
        }
        return () => {
            window.removeEventListener("scroll", updateCoords, true);
            window.removeEventListener("resize", updateCoords);
        };
    }, [open, isUp]);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const selectedItem = timeOptions.find(opt => opt.value === value);
    const selectedLabel = selectedItem ? selectedItem.label : "Select Time";

    return (
        <div className={`w-full relative ${className}`} ref={triggerRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`flex justify-between items-center border h-[36px] px-2 w-full text-[13px] focus:outline-zinc-400 bg-white cursor-pointer
                ${open ? "border-zinc-500 ring-1 ring-zinc-100" : "border-zinc-300"} rounded-sm`}
            >
                <span className="truncate text-zinc-700 font-bold">{selectedLabel}</span>
                <FaAngleDown size={12} className={`transition-transform text-zinc-400 ${open ? "rotate-180" : ""}`} />
            </button>

            {open && createPortal(
                <div
                    ref={dropdownRef}
                    className={`fixed bg-white border border-zinc-300 shadow-2xl z-[9999] rounded-sm`}
                    style={{
                        top: isUp ? "auto" : `${coords.top + 1}px`,
                        bottom: isUp ? `${window.innerHeight - coords.top + 1}px` : "auto",
                        left: `${coords.left}px`,
                        width: `${coords.width}px`,
                    }}
                >
                    <div className="max-h-60 overflow-y-auto p-1">
                        {timeOptions.map((item, i) => {
                            const isSelected = item.value === value;
                            return (
                                <div
                                    key={item.value}
                                    ref={(el) => (optionRefs.current[i] = el)}
                                    onClick={() => {
                                        onChange(item.value);
                                        setOpen(false);
                                    }}
                                    className={`flex justify-between items-center px-2 py-2 text-[12.5px] font-bold 
                                        ${isSelected 
                                            ? "bg-zinc-900 text-zinc-50 cursor-pointer" 
                                            : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                                        }
                                        transition-colors rounded-sm`}
                                >
                                    <span>{item.label}</span>
                                    {isSelected && <FaCheck size={10} className="text-zinc-50" />}
                                </div>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default CustomTimeSelect;
