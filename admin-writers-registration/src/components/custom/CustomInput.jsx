export default function CustomInput({ label, type = "text", placeholder = "", error, ...props }) {
    return (
        <div>
            {label && (
                <label className="custom-label">
                    {label}
                </label>
            )}
            <dd>
                <input
                    type={type}
                    placeholder={placeholder}
                    className="custom-input border-gray-200"
                    {...props}
                />
            </dd>
            {error && <p className="text-red-500 text-xs font-semibold mt-1">{error}</p>}
        </div>
    );
}
