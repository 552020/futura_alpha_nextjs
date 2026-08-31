import { useState } from 'react';

type ToastVariant = 'default' | 'destructive' | 'success';

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({ title, description, variant = 'default' }: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((currentToasts) => [
      ...currentToasts,
      { id, title, description, variant },
    ]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id)
    );
  };

  return { toast, toasts, removeToast };
}

export const toast = (options: ToastOptions) => {
  if (typeof window === 'undefined') return '';

  const event = new CustomEvent('show-toast', {
    detail: options,
  });
  window.dispatchEvent(event);
  return '';
};
