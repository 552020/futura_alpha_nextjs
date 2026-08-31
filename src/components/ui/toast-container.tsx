'use client';

import { useEffect, useState, useCallback } from 'react';
import { Toast, ToastProvider, ToastViewport } from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';

type ToastVariant = 'default' | 'destructive' | 'success';

type ToastEvent = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

export function ToastContainer() {
  const { toasts, removeToast, toast: showToast } = useToast();
  const [mounted, setMounted] = useState(false);

  const handleToastEvent = useCallback(
    (event: CustomEvent<ToastEvent>) => {
      const { title, description, variant } = event.detail;
      showToast({ title, description, variant });
    },
    [showToast]
  );

  useEffect(() => {
    setMounted(true);

    // @ts-expect-error - Custom event type
    window.addEventListener('show-toast', handleToastEvent);

    return () => {
      // @ts-expect-error - Custom event type
      window.removeEventListener('show-toast', handleToastEvent);
    };
  }, [handleToastEvent]);

  if (!mounted) return null;

  return (
    <ToastProvider>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          variant={
            t.variant === 'success'
              ? 'default'
              : (t.variant as 'default' | 'destructive' | undefined)
          }
          onOpenChange={(open) => {
            if (!open) {
              removeToast(t.id);
            }
          }}
          className="mb-2"
        >
          <div className="grid gap-1">
            {t.title && <div className="font-semibold">{t.title}</div>}
            {t.description && (
              <div className="text-sm opacity-90">{t.description}</div>
            )}
          </div>
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
