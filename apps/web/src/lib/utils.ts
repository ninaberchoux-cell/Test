import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date) {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'just now';
}

export const priorityColors: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  NORMAL: 'bg-blue-100 text-blue-800 border-blue-200',
  LOW: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  DELEGATED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  ESCALATED: 'bg-red-100 text-red-800',
  IGNORED: 'bg-gray-100 text-gray-600',
};

export const categoryLabels: Record<string, string> = {
  CUSTOMER_SUPPORT: 'Customer Support',
  SALES: 'Sales',
  INTERNAL: 'Internal',
  FINANCE: 'Finance',
  HR: 'HR',
  OTHER: 'Other',
};
