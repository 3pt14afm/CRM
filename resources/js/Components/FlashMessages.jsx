import { useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { toast } from 'react-hot-toast';

export default function FlashMessages() {
    const { flash } = usePage().props;
    const lastSuccess = useRef(null);
    const lastError = useRef(null);

    useEffect(() => {
        if (flash?.success && flash.success !== lastSuccess.current) {
            toast.success(flash.success);
            lastSuccess.current = flash.success;
        }

        if (flash?.error && flash.error !== lastError.current) {
            toast.error(flash.error);
            lastError.current = flash.error;
        }
    }, [flash]);

    return null;
}