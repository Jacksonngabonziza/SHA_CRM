'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { installationsApi } from '@/lib/api'
import { Installation, InstallationStatus } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { Wrench, Loader2, ExternalLink, Calendar, List, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const STATUSES: { value: InstallationStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_COLORS: Record<InstallationStatus, string> = {
  scheduled:   'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  on_hold:     'bg-gray-100 text-gray-600',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
}

const CAL_DOT: Record<InstallationStatus, string> = {
  scheduled:   'bg-blue-500',
  in_progress: 'bg-amber-500',
  on_hold:     'bg-gray-400',
  completed:   'bg-green-500',
  cancelled:   'bg-red-400',
}

export default function InstallationsPage() {
  const [status, setStatus] = useState<InstallationStatus | ''>('')
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const { data, isLoading } = useQuery({
    queryKey: ['installations', status],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (status) params.status = status
      return (await installationsApi.list(params)).data
    },
  })

  const installations: Installation[] = data?.results ?? data ?? []

  // Group by scheduled_date for calendar view
  const byDate = installations.reduce<Record<string, Installation[]>>((acc, inst) => {
    if (inst.scheduled_date) {
      const key = inst.scheduled_date.slice(0, 10)
      acc[key] = [...(acc[key] ?? []), inst]
    }
    return acc
  }, {})

  const prevMonth = () => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  // Build calendar grid
  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()
  const firstDow = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date().toISOString().slice(0, 10)
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1>Installations</h1>
          <p className="text-sm text-gray-500 mt-1">{installations.length} total</p>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('list')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            <List size={15} /> List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            <Calendar size={15} /> Calendar
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
        {STATUSES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0',
              status === value
                ? 'bg-[#091928] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : view === 'list' ? (
        /* ── List view ───────────────────────────────────────────────── */
        <div className="card overflow-hidden">
          {installations.length === 0 ? (
            <div className="text-center py-16">
              <Wrench size={32} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400">No installations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Client', 'Quote Ref', 'System Value', 'Status', 'Scheduled', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {installations.map(inst => (
                    <tr key={inst.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-gray-900">{inst.client_name}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/quotes/${inst.quote}`} className="font-mono text-sm text-[#091928] hover:text-[#EA9D13]">
                          {inst.quote_ref}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">
                        {Number(inst.total_price_rwf).toLocaleString()} RWF
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('badge', STATUS_COLORS[inst.status])}>
                          {inst.status_display}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {inst.scheduled_date ? (
                          <span className="flex items-center gap-1">
                            <Calendar size={13} /> {formatDate(inst.scheduled_date)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/installations/${inst.id}`}
                          className="p-1.5 text-gray-400 hover:text-[#091928] hover:bg-gray-100 rounded transition-colors inline-flex"
                          title="View details"
                        >
                          <ExternalLink size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ── Calendar view ───────────────────────────────────────────── */
        <div className="card p-4 sm:p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronLeft size={18} />
            </button>
            <h3 className="font-semibold text-gray-900">
              {calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Scrollable grid on small screens */}
          <div className="overflow-x-auto">
          <div className="min-w-[520px]">

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />
              const dateKey = `${monthStr}-${String(day).padStart(2, '0')}`
              const dayInsts = byDate[dateKey] ?? []
              const isToday = dateKey === today
              return (
                <div
                  key={dateKey}
                  className={cn(
                    'min-h-[72px] rounded-lg p-1.5 border transition-colors',
                    isToday ? 'border-[#EA9D13] bg-amber-50' : 'border-gray-100 hover:border-gray-200',
                    dayInsts.length > 0 ? 'bg-white' : ''
                  )}
                >
                  <p className={cn(
                    'text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full',
                    isToday ? 'bg-[#EA9D13] text-white' : 'text-gray-500'
                  )}>
                    {day}
                  </p>
                  <div className="space-y-0.5">
                    {dayInsts.slice(0, 3).map(inst => (
                      <Link
                        key={inst.id}
                        href={`/installations/${inst.id}`}
                        className="flex items-center gap-1 group"
                        title={inst.client_name}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', CAL_DOT[inst.status])} />
                        <span className="text-xs text-gray-700 truncate group-hover:text-[#EA9D13] transition-colors leading-tight">
                          {inst.client_name}
                        </span>
                      </Link>
                    ))}
                    {dayInsts.length > 3 && (
                      <p className="text-xs text-gray-400">+{dayInsts.length - 3} more</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          </div>{/* min-w wrapper */}
          </div>{/* overflow-x-auto */}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
            {(Object.entries(CAL_DOT) as [InstallationStatus, string][]).map(([s, dot]) => (
              <div key={s} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={cn('w-2 h-2 rounded-full', dot)} />
                {STATUS_COLORS[s].replace(/.*text-/, '').replace('-700', '').replace('-600', '')}
                {s.replace('_', ' ')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
