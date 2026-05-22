import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaFilter, FaCheck } from "react-icons/fa";

export function CustomFilterInput({
  dropdownData = [],
  value = "",
  onChange = () => { },
  isUp = false,
  className = "",
  rounded = "rounded-sm"
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const normalizedData = dropdownData.map((item) =>
    typeof item === "string" ? { label: item, value: item } : item
  );

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: isUp ? rect.top : rect.bottom,
        left: rect.left,
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

  const handleSelect = (item) => {
    onChange(item.value);
    setOpen(false);
  };

  const isActive = value && value !== 'all';

  return (
    <div className={`relative ${className}`} ref={triggerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center justify-center border h-[30px] w-[30px] transition-colors
        ${open ? "border-zinc-500 bg-zinc-100" : "border-zinc-300 bg-white hover:bg-zinc-50"} ${rounded}
        ${isActive ? "ring-2 ring-blue-100 border-blue-400" : ""}`}
        title="Filter"
      >
        <FaFilter size={12} className={isActive ? "text-blue-600" : "text-zinc-500"} />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed bg-white border border-zinc-300 shadow-2xl z-[9999] min-w-[200px] ${rounded}`}
          style={{
            top: isUp ? "auto" : `${coords.top + 5}px`,
            bottom: isUp ? `${window.innerHeight - coords.top + 5}px` : "auto",
            left: `${coords.left}px`,
          }}
        >
          <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Filter Options
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {normalizedData.map((item) => {
              const isSelected = item.value === value;
              return (
                <div
                  key={item.value}
                  onClick={() => handleSelect(item)}
                  className={`flex justify-between items-center px-3 py-2 text-[12.5px] font-bold cursor-pointer
                    ${isSelected 
                        ? "bg-zinc-900 text-zinc-50" 
                        : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                    }
                    transition-colors ${rounded}`}
                >
                  <span className="capitalize">{item.label}</span>
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
}
