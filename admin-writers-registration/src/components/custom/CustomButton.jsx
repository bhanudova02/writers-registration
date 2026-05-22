export default function CustomButton({
    label = "Button",
    onClick,
    bgColor = "bg-zinc-700",
    textColor = "text-white",
    className = "",
    type = "button",
    disabled = false,
    icon: Icon = null
}) {
    return (
        <button type={type} onClick={onClick} disabled={disabled}
            className={`
                flex items-center justify-center gap-2
                py-2 text-[13.5px] font-semibold px-3 rounded-md
                border border-gray-50
                ${bgColor} ${textColor}
                ${disabled ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98] cursor-pointer"}
                transition-all duration-300
                ${className}
            `}
        >
            {Icon && <Icon className="text-[14px]" />}
            {label}
        </button>
    );
}
