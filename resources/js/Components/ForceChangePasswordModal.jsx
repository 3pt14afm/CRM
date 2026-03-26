import { useEffect, useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';

export default function ForceChangePasswordModal() {
  const { mustChangePassword } = usePage().props;
  const [open, setOpen] = useState(false);

  const { data, setData, post, processing, errors, reset } = useForm({
    password: '',
    password_confirmation: '',
  });

  useEffect(() => {
    if (mustChangePassword) {
      setOpen(true);
      document.body.style.overflow = 'hidden';
    } else {
      setOpen(false);
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mustChangePassword]);

  const submit = (e) => {
    e.preventDefault();

    post(route('force-password.change'), {
      preserveScroll: true,
      onSuccess: () => {
        reset();
        setOpen(false);
      },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>

        <p className="mt-2 text-sm text-gray-600">
          You have logged in 3 times using the default password. Please change your
          password to continue.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={data.password}
              onChange={(e) => setData('password', e.target.value)}
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
              onChange={(e) => setData('password_confirmation', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full rounded-lg bg-[#289800] px-4 py-2 font-medium text-white hover:bg-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}