import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaAngleDown, FaCheck } from "react-icons/fa";

export function PortalSelect({
  label = "",
  dropdownData = [],
  value = "",
  onChange = () => { },
  onBlur,
  error,
  isUp = false,
  className = "",
  rounded = "rounded-sm",
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  const normalizedData = dropdownData.map((item) =>
    typeof item === "string" ? { label: item, value: item } : item
  );

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
        if (onBlur) onBlur();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onBlur]);

  useEffect(() => {
    if (open) {
      const index = normalizedData.findIndex((item) => item.value === value);
      setFocusedIndex(index >= 0 ? index : 0);
      setTimeout(() => {
        optionRefs.current[index]?.scrollIntoView({ block: "nearest" });
      }, 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      const enabledIndexes = normalizedData
        .map((item, idx) => (item.value !== "disabled" ? idx : -1))
        .filter((idx) => idx !== -1);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const currentPos = enabledIndexes.indexOf(prev);
          return enabledIndexes[currentPos < enabledIndexes.length - 1 ? currentPos + 1 : 0];
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const currentPos = enabledIndexes.indexOf(prev);
          return enabledIndexes[currentPos > 0 ? currentPos - 1 : enabledIndexes.length - 1];
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < normalizedData.length) {
          handleSelect(normalizedData[focusedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, focusedIndex, normalizedData]);

  const handleSelect = (item) => {
    if (item.value === "disabled") {
      onChange("");
      setOpen(false);
      return;
    }
    onChange(item.value);
    setOpen(false);
  };

  const selectedItem =
    value === ""
      ? normalizedData.find((i) => i.value === "disabled")
      : normalizedData.find((i) => i.value === value);

  const selectedLabel = selectedItem?.label || "Select";

  return (
    <div className={`w-full relative ${className}`} ref={triggerRef}>
      {label && <h5 className="text-[13px] font-bold text-zinc-700 mb-0.5 uppercase">{label}</h5>}
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className={`flex justify-between items-center border h-[36px] px-2 w-full text-[13px] focus:outline-zinc-400 bg-white
        ${disabled ? "opacity-50 cursor-not-allowed bg-zinc-50" : "cursor-pointer"}
        ${open ? "border-zinc-500 ring-1 ring-zinc-100" : "border-zinc-300"} ${rounded}`}
      >
        <span className="truncate text-zinc-700 capitalize font-bold">{selectedLabel}</span>
        <FaAngleDown size={12} className={`transition-transform text-zinc-400 ${open ? "rotate-180" : ""}`} />
      </button>
      {error && <p className="text-red-500 text-[10px] font-bold mt-1">{error}</p>}

      {open && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed bg-white border border-zinc-300 shadow-2xl z-[9999] ${rounded}`}
          style={{
            top: isUp ? "auto" : `${coords.top + 1}px`,
            bottom: isUp ? `${window.innerHeight - coords.top + 1}px` : "auto",
            left: `${coords.left}px`,
            width: `${coords.width}px`,
          }}
        >
          <div className="max-h-60 overflow-y-auto p-1">
            {normalizedData.length === 0 ? (
              <div className="px-3 py-10 text-[11px] text-zinc-400 text-center font-bold uppercase">No options</div>
            ) : (
              normalizedData.map((item, i) => {
                const isSelected = item.value === value;
                const isFocused = i === focusedIndex;
                const isDisabled = item.value === "disabled";
                return (
                  <div
                    key={item.value}
                    ref={(el) => (optionRefs.current[i] = el)}
                    onClick={() => !isDisabled && handleSelect(item)}
                    className={`flex justify-between items-center px-2 py-2 text-[12.5px] font-bold 
                      ${isDisabled 
                        ? "text-zinc-300 cursor-not-allowed" 
                        : isSelected 
                          ? "bg-zinc-900 text-zinc-50 cursor-pointer" 
                          : isFocused 
                            ? "bg-zinc-100 text-zinc-900 cursor-pointer" 
                            : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 cursor-pointer"
                      }
                      transition-colors ${rounded}`}
                  >
                    <span className="capitalize">{item.label}</span>
                    {isSelected && !isDisabled && <FaCheck size={10} className="text-zinc-50" />}
                  </div>

                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
