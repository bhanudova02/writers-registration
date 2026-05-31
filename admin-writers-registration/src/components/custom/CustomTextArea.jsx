export default function CustomTextArea({ label, placeholder = "", error, rows = 3, ...props }) {
    return (
        <div>
            {label && (
                <label className="custom-label">
                    {label}
                </label>
            )}
            <dd>
                <textarea
                    placeholder={placeholder}
                    rows={rows}
                    className="custom-input border-gray-200 resize-y"
                    {...props}
                />
            </dd>
            {error && <p className="text-red-500 text-xs font-semibold mt-1">{error}</p>}
        </div>
    );
}
