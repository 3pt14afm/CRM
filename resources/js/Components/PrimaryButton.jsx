export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center rounded-md border border-transparent bg-darkgreen px-4 py-2 text-sm font-bold uppercase tracking-widest text-white transition duration-150 ease-in-out hover:bg-[#4DB228]  ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
