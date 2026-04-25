'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { installationsApi, downloadCsv } from '@/lib/api'
import { Installation, InstallationStatus } from '@/types'
import { formatDateTime, cn } from '@/lib/utils'
import {
  ArrowLeft, Loader2, CheckCircle, Clock,
  AlertCircle, PauseCircle, XCircle, Plus, Download, Pencil, Trash2, X, Check,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const STATUSES: { value: InstallationStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'scheduled',   label: 'Scheduled',   icon: <Clock size={14} />,        color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'In Progress',  icon: <AlertCircle size={14} />,  color: 'bg-amber-100 text-amber-700' },
  { value: 'on_hold',     label: 'On Hold',      icon: <PauseCircle size={14} />,  color: 'bg-gray-100 text-gray-600' },
  { value: 'completed',   label: 'Completed',    icon: <CheckCircle size={14} />,  color: 'bg-green-100 text-green-700' },
  { value: 'cancelled',   label: 'Cancelled',    icon: <XCircle size={14} />,      color: 'bg-red-100 text-red-600' },
]

export default function InstallationDetailPage({ params }: { readonly params: { id: string } }) {
  const qc = useQueryClient()
  const id = Number.parseInt(params.id)
  const [logNote, setLogNote] = useState('')
  const [logDate, setLogDate] = useState('')  // datetime-local string, empty = now
  const [editingLogId, setEditingLogId] = useState<number | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editDate, setEditDate] = useState('')

  const { data: inst, isLoading } = useQuery<Installation>({
    queryKey: ['installation', id],
    queryFn: async () => (await installationsApi.get(id)).data,
  })

  const statusMutation = useMutation({
    mutationFn: (status: InstallationStatus) => installationsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installation', id] })
      qc.invalidateQueries({ queryKey: ['installations'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const logMutation = useMutation({
    mutationFn: ({ note, created_at }: { note: string; created_at?: string }) =>
      installationsApi.addLog(id, note, created_at),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installation', id] })
      setLogNote('')
      setLogDate('')
      toast.success('Log added')
    },
    onError: () => toast.error('Failed to add log'),
  })

  const editLogMutation = useMutation({
    mutationFn: ({ logId, note, created_at }: { logId: number; note: string; created_at?: string }) =>
      installationsApi.updateLog(id, logId, { note, ...(created_at ? { created_at } : {}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installation', id] })
      setEditingLogId(null)
      toast.success('Log updated')
    },
    onError: () => toast.error('Failed to update log'),
  })

  const deleteLogMutation = useMutation({
    mutationFn: (logId: number) => installationsApi.deleteLog(id, logId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installation', id] })
      toast.success('Log deleted')
    },
    onError: () => toast.error('Failed to delete log'),
  })

  const patchMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => installationsApi.patch(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['installation', id] })
      toast.success('Saved')
    },
    onError: () => toast.error('Failed to save'),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-gray-400" />
    </div>
  )
  if (!inst) return <div className="text-center py-20 text-gray-400">Installation not found</div>

  const currentStatus = STATUSES.find(s => s.value === inst.status)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/installations" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 w-fit">
        <ArrowLeft size={16} /> Back to Installations
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{inst.client_name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
              <span>Quote: <Link href={`/quotes/${inst.quote}`} className="font-mono font-medium text-gray-800 hover:text-[#EA9D13]">{inst.quote_ref}</Link></span>
              <span className="hidden sm:inline">·</span>
              <span>{Number(inst.total_price_rwf).toLocaleString()} RWF</span>
            </div>
            {currentStatus && (
              <span className={cn('badge mt-2 inline-flex', currentStatus.color)}>
                {currentStatus.icon}
                <span className="ml-1">{currentStatus.label}</span>
              </span>
            )}
          </div>
          <button
            onClick={() =>
              downloadCsv(
                installationsApi.reportUrl(id),
                `Installation-Report-${inst.client_name}.pdf`,
              ).catch(() => toast.error('Failed to download report'))
            }
            className="btn-amber text-sm shrink-0"
            title="Download installation report PDF"
          >
            <Download size={15} /> Report
          </button>
        </div>

        {/* Status buttons */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => statusMutation.mutate(s.value)}
              disabled={statusMutation.isPending}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                inst.status === s.value ? 'bg-[#091928] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="space-y-4">
          {/* Dates */}
          <div className="card p-5">
            <p className="section-title">Timeline</p>
            <div className="space-y-3 mt-2">
              <div>
                <label htmlFor="scheduled-date" className="label">Scheduled Date</label>
                <input
                  id="scheduled-date"
                  type="date"
                  defaultValue={inst.scheduled_date ?? ''}
                  onBlur={e => patchMutation.mutate({ scheduled_date: e.target.value || null })}
                  className="input"
                />
              </div>
              {inst.started_at && (
                <div>
                  <p className="label">Started</p>
                  <p className="text-sm text-gray-700">{formatDateTime(inst.started_at)}</p>
                </div>
              )}
              {inst.completed_at && (
                <div>
                  <p className="label">Completed</p>
                  <p className="text-sm text-gray-700">{formatDateTime(inst.completed_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="card p-5">
            <p className="section-title">Completion Checklist</p>
            <div className="space-y-2 mt-2">
              {[
                { key: 'commissioning_done', label: 'Commissioning Done', value: inst.commissioning_done },
                { key: 'client_training_done', label: 'Client Training Done', value: inst.client_training_done },
              ].map(({ key, label, value }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={value}
                    onChange={e => patchMutation.mutate({ [key]: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#EA9D13]"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          {(inst.handover_notes || inst.issues_noted) && (
            <div className="card p-5 space-y-3">
              {inst.handover_notes && (
                <div>
                  <p className="section-title">Handover Notes</p>
                  <p className="text-sm text-gray-700 mt-1">{inst.handover_notes}</p>
                </div>
              )}
              {inst.issues_noted && (
                <div>
                  <p className="section-title text-red-600">Issues Noted</p>
                  <p className="text-sm text-gray-700 mt-1">{inst.issues_noted}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Activity log */}
        <div className="lg:col-span-2 card flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold">Activity Log ({inst.logs.length})</h3>
          </div>
          <div className="flex-1 divide-y divide-gray-50 overflow-y-auto max-h-96">
            {inst.logs.length === 0 && (
              <p className="text-sm text-gray-400 p-6 text-center">No logs yet</p>
            )}
            {inst.logs.map(log => (
              <div key={log.id} className="px-5 py-4 group">
                {editingLogId === log.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editNote}
                      onChange={e => setEditNote(e.target.value)}
                      className="input resize-none text-sm w-full"
                      rows={2}
                      autoFocus
                    />
                    <input
                      type="datetime-local"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="input text-sm w-full"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => editLogMutation.mutate({ logId: log.id, note: editNote, created_at: editDate || undefined })}
                        disabled={!editNote.trim() || editLogMutation.isPending}
                        className="btn-primary text-xs py-1 px-3"
                      >
                        {editLogMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Save
                      </button>
                      <button onClick={() => setEditingLogId(null)} className="btn-secondary text-xs py-1 px-3">
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{log.logged_by_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{formatDateTime(log.created_at)}</span>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={() => { setEditingLogId(log.id); setEditNote(log.note); setEditDate('') }}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => deleteLogMutation.mutate(log.id)}
                            disabled={deleteLogMutation.isPending}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{log.note}</p>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="p-5 border-t border-gray-100 space-y-2">
            <textarea
              value={logNote}
              onChange={e => setLogNote(e.target.value)}
              placeholder="Add a log entry..."
              className="input resize-none text-sm"
              rows={2}
            />
            <div>
              <label htmlFor="log-date" className="label">Date &amp; Time <span className="text-gray-400 font-normal">(leave blank for now)</span></label>
              <input
                id="log-date"
                type="datetime-local"
                value={logDate}
                onChange={e => setLogDate(e.target.value)}
                className="input text-sm"
              />
            </div>
            <button
              onClick={() => logNote.trim() && logMutation.mutate({ note: logNote, created_at: logDate || undefined })}
              disabled={!logNote.trim() || logMutation.isPending}
              className="btn-primary w-full justify-center text-sm"
            >
              {logMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add Log Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
