import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRWF(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  return `RWF ${num.toLocaleString('en-RW', { maximumFractionDigits: 0 })}`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-RW', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-RW', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export const STATUS_COLORS: Record<string, string> = {
  // Client statuses
  new:      'bg-blue-100 text-blue-800',
  quoted:   'bg-amber-100 text-amber-800',
  followup: 'bg-purple-100 text-purple-800',
  won:      'bg-green-100 text-green-800',
  lost:     'bg-red-100 text-red-800',
  // Quote statuses
  draft:    'bg-gray-100 text-gray-800',
  sent:     'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired:  'bg-orange-100 text-orange-800',
}

export const CLIENT_TYPE_ICONS: Record<string, string> = {
  residential: '🏠',
  school:      '🏫',
  clinic:      '🏥',
  business:    '🏢',
  community:   '🌍',
}
