import { useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { toast } from 'sonner';

export default function FlashMessages() {
    const { flash } = usePage().props;
    const lastSuccess = useRef(null);
    const lastError = useRef(null);

    useEffect(() => {
        // Shared options for your toasts
        const toastOptions = { duration: 1000 };

        if (flash?.success && flash.success !== lastSuccess.current) {
            toast.dismiss(); // Remove existing toasts immediately
            toast.success(flash.success, toastOptions);
            lastSuccess.current = flash.success;

        }

        if (flash?.error && flash.error !== lastError.current) {
            toast.dismiss(); // Remove existing toasts immediately
            toast.error(flash.error, toastOptions);
            lastError.current = flash.error;

        }
    }, [flash]);

    return null;
}