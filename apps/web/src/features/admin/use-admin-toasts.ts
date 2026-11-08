'use client';

import { useCallback, useState } from 'react';
import type { ToastMessage, ToastType } from '@/components/ui';

/** Local toast queue rendered with the shared design-system ToastContainer. */
export function useAdminToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success', title?: string) => {
    setToasts((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, type, title, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
