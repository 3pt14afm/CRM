export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-gray-300 text-darkgreen shadow-sm focus:ring-darkgreen ' +
                className
            }
        />
    );
}
