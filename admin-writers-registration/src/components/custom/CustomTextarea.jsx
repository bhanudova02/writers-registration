export default function CustomTextarea({
    label,
    placeholder = "",
    error,
    rows = 8,
    className = "",
    style,
    ...props
}) {
    return (
        <div>
            {label && (
                <label className="custom-label">
                    {label}
                </label>
            )}
            <dd>
                <textarea
                    rows={rows}
                    placeholder={placeholder}
                    className={`custom-input border-gray-200 resize-y py-2 leading-5 h-auto ${className}`}
                    style={{ minHeight: `${rows * 1.5}rem`, ...style }}
                    {...props}
                />
            </dd>
            {error && <p className="text-red-500 text-xs font-semibold mt-1">{error}</p>}
        </div>
    );
}
