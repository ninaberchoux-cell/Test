'use client';

import { useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`rounded-lg px-4 py-3 shadow-lg text-sm font-medium max-w-sm ${
            toast.variant === 'destructive'
              ? 'bg-red-600 text-white'
              : 'bg-gray-900 text-white'
          }`}
        >
          {toast.title && <p className="font-semibold">{toast.title}</p>}
          {toast.description && <p className="text-xs opacity-80 mt-0.5">{toast.description}</p>}
        </div>
      ))}
    </div>
  );
}
