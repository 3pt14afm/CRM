import { cardStyle } from './ProfileStyles';
import { LockIcon, ShieldIcon } from './ProfileIcons';

function SecurityRow({ icon, title, subtitle, action, onAction, disabled = false }) {
    return (
        <div className="flex items-center justify-between gap-3 sm:gap-4 rounded-xl pb-3">
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500 ring-1 ring-gray-300">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{title}</p>
                    <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>
                </div>
            </div>
            <button
                type="button"
                onClick={onAction}
                disabled={disabled}
                className={
                    disabled
                        ? 'shrink-0 cursor-not-allowed text-xs font-medium text-gray-300'
                        : 'shrink-0 text-xs font-medium text-darkgreen transition hover:text-[#2a9e00]'
                }
            >
                {action} <span aria-hidden="true">›</span>
            </button>
        </div>
    );
}

export default function SecurityCard({ onChangePassword }) {
    return (
        <div className={cardStyle}>
            <div className="p-4 sm:p-6">
                <div className="flex items-center gap-2 pb-4">
                    <LockIcon className="h-4 w-4 text-gray-500" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Security & Access
                    </h4>
                </div>
                <div className="mt-2 space-y-1">
                    <SecurityRow
                        icon={<LockIcon />}
                        title="Account Password"
                        subtitle="Update your password to keep your account secure."
                        action="Change Password"
                        onAction={onChangePassword}
                    />
                    <SecurityRow
                        icon={<ShieldIcon />}
                        title="Two-Factor Authentication"
                        subtitle="Not yet available"
                        action="Manage"
                        disabled
                    />
                </div>
            </div>
        </div>
    );
}