'use client';

import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

let toastCount = 0;

const listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function emitChange() {
  listeners.forEach(l => l([...toasts]));
}

export function toast(options: Omit<Toast, 'id'>) {
  const id = String(++toastCount);
  toasts = [...toasts, { id, ...options }];
  emitChange();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    emitChange();
  }, 4000);
}

export function useToast() {
  const [state, setState] = useState<Toast[]>(toasts);

  const subscribe = useCallback((listener: (toasts: Toast[]) => void) => {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  useState(() => {
    const unsub = subscribe(setState);
    return unsub;
  });

  return { toasts: state, toast };
}
