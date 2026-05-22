import { useEffect, useMemo, useRef, useState } from "react";
import { FaAngleDown, FaCheck } from "react-icons/fa";

export function CustomSelectSearch({
  label = "Select",
  dropdownData = [],
  value = "",
  onChange = () => { },
  onBlur,
  error,
  searchPlaceholder = "Search...",
  emptyMessage = "No data available",
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionRefs = useRef([]);

  const normalizedData = useMemo(() => dropdownData.map((item) =>
    typeof item === "string"
      ? { label: item, value: item }
      : item
  ), [dropdownData]);

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return normalizedData;
    return normalizedData.filter((item) =>
      item.label.toLowerCase().includes(query)
    );
  }, [normalizedData, searchQuery]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setSearchQuery("");
        if (onBlur) {
          onBlur();
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onBlur]);

  useEffect(() => {
    if (open) {
      const index = filteredData.findIndex((item) => item.value === value);
      setFocusedIndex(index >= 0 ? index : 0);
      setTimeout(() => searchInputRef.current?.focus(), 0);
      optionRefs.current[index]?.scrollIntoView({ block: "nearest" });
    } else {
      setFocusedIndex(-1);
    }
  }, [filteredData, open, value]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      const enabledIndexes = filteredData.map((item, idx) =>
        item.value !== "disabled" ? idx : -1
      ).filter((idx) => idx !== -1);

      if (enabledIndexes.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const currentPos = enabledIndexes.indexOf(prev);
          const nextPos = currentPos < enabledIndexes.length - 1 ? currentPos + 1 : 0;
          const nextIndex = enabledIndexes[nextPos];
          optionRefs.current[nextIndex]?.scrollIntoView({ block: "nearest" });
          return nextIndex;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const currentPos = enabledIndexes.indexOf(prev);
          const prevPos = currentPos > 0 ? currentPos - 1 : enabledIndexes.length - 1;
          const prevIndex = enabledIndexes[prevPos];
          optionRefs.current[prevIndex]?.scrollIntoView({ block: "nearest" });
          return prevIndex;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredData.length) {
          handleSelect(filteredData[focusedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setSearchQuery("");
        if (onBlur) {
          onBlur();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredData, focusedIndex, onBlur, open]);

  const handleSelect = (item) => {
    if (item.value === "disabled") {
      onChange("");
      setOpen(false);
      setSearchQuery("");
      return;
    }

    onChange(item.value);
    setOpen(false);
    setSearchQuery("");
  };

  const selectedItem =
    value === ""
      ? normalizedData.find((i) => i.value === "disabled")
      : normalizedData.find((i) => i.value === value);

  const selectedLabel = selectedItem?.label || "Select";

  return (
    <div className="w-full relative" ref={dropdownRef}>
      {label && (
        <h5 className="text-[13.5px] font-semibold text-zinc-800/90 mb-0.5">
          {label}
        </h5>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex justify-between items-center border rounded-md py-1.5 px-2 w-full text-[13px] md:text-[14px] focus:outline-gray-400
        ${open ? "border-gray-400 ring-1 ring-gray-300" : "border-gray-300"}`}
      >
        <span className="truncate text-gray-600 capitalize font-semibold text-[14px]">
          {selectedLabel}
        </span>
        <FaAngleDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {error && <p className="text-red-500 text-xs font-semibold mt-1">{error}</p>}

      {open && (
        <div className="absolute left-0 mt-2 w-full bg-white border border-gray-300 rounded-md z-20 shadow-sm">
          {normalizedData.length > 0 && (
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={searchPlaceholder}
                className="w-full rounded-sm border border-gray-200 px-2 py-1.5 text-[13px] font-semibold text-zinc-700 outline-none focus:border-gray-300"
              />
            </div>
          )}

          <div className="max-h-50 overflow-y-auto p-1">
            {normalizedData.length === 0 || filteredData.length === 0 ? (
              <div className="px-3 py-12 text-xs md:text-sm text-gray-400 text-center cursor-default">
                {emptyMessage}
              </div>
            ) : (
              filteredData.map((item, i) => {
                const isSelected = item.value === value;
                const isFocused = i === focusedIndex;
                const isDisabled = item.value === "disabled";

                return (
                  <div
                    key={item.value}
                    ref={(el) => (optionRefs.current[i] = el)}
                    onClick={() => !isDisabled && handleSelect(item)}
                    className={`flex justify-between items-center px-2 py-1.5 rounded-md text-[13px] md:text-[13.5px] font-semibold text-gray-700
                      ${isDisabled
                        ? "text-gray-400 cursor-not-allowed"
                        : isSelected
                          ? "bg-gray-200 font-medium cursor-pointer"
                          : isFocused
                            ? "bg-gray-100 cursor-pointer"
                            : "hover:bg-gray-100 cursor-pointer"
                      }`}
                  >
                    <span className="capitalize">{item.label}</span>
                    {isSelected && !isDisabled && <FaCheck size={14} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
