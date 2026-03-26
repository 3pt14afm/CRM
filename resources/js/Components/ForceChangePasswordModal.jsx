import { useEffect, useMemo, useState } from "react";
import { useForm, usePage } from "@inertiajs/react";

export default function ForceChangePasswordModal() {
  const {
    mustChangePassword,
    defaultPasswordLoginCount,
    passwordExpired,
    isUsingDefaultPassword,
    requiresPasswordChange,
  } = usePage().props;

  const shouldShow =
    requiresPasswordChange ||
    mustChangePassword ||
    defaultPasswordLoginCount > 0 ||
    passwordExpired;

  const canDismiss = !mustChangePassword && defaultPasswordLoginCount < 3;

  const [open, setOpen] = useState(false);

  const { data, setData, post, processing, errors, reset } = useForm({
    password: "",
    password_confirmation: "",
  });

  const message = useMemo(() => {
    const forced = mustChangePassword || defaultPasswordLoginCount >= 3;

    if (passwordExpired && forced) {
      return "Your password has expired. You must change your password now to continue.";
    }

    if (passwordExpired) {
      if (defaultPasswordLoginCount === 1) {
        return "Your password has expired. Please change it soon.";
      }

      if (defaultPasswordLoginCount === 2) {
        return "Your password has expired. On your next login, you will be required to change it.";
      }

      return "Your password has expired. Please change your password.";
    }

    if ((isUsingDefaultPassword || defaultPasswordLoginCount > 0) && forced) {
      return "You have logged in 3 times using the default password. Please change your password to continue.";
    }

    if (defaultPasswordLoginCount === 1) {
      return "You are still using the default password. Please change it soon.";
    }

    if (defaultPasswordLoginCount === 2) {
      return "You are still using the default password. On your next login, you will be required to change it.";
    }

    return "Please change your password.";
  }, [
    mustChangePassword,
    defaultPasswordLoginCount,
    passwordExpired,
    isUsingDefaultPassword,
  ]);

  useEffect(() => {
    if (shouldShow) {
      setOpen(true);
      document.body.style.overflow = "hidden";
    } else {
      setOpen(false);
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [shouldShow]);

  const closeModal = () => {
    if (!canDismiss) return;
    setOpen(false);
    document.body.style.overflow = "";
  };

  const submit = (e) => {
    e.preventDefault();

    post(route("force-password.change"), {
      preserveScroll: true,
      onSuccess: () => {
        reset();
        setOpen(false);
        document.body.style.overflow = "";
      },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {canDismiss && (
          <button
            type="button"
            onClick={closeModal}
            className="absolute right-4 top-4 text-xl font-semibold text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            ×
          </button>
        )}

        <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>

        <p className="mt-2 text-sm text-gray-600">{message}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={data.password}
              onChange={(e) => setData("password", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password_confirmation"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm Password
            </label>
            <input
              id="password_confirmation"
              type="password"
              value={data.password_confirmation}
              onChange={(e) => setData("password_confirmation", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full rounded-lg bg-[#289800] px-4 py-2 font-medium text-white hover:bg-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}