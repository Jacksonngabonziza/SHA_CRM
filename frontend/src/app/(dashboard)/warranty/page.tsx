'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { warrantyApi, installationsApi } from '@/lib/api'
import { WarrantyClaim, WarrantyClaimStatus, Installation } from '@/types'
import { cn, formatDate } from '@/lib/utils'
import {
  ShieldCheck, Plus, X, Loader2, CheckCircle,
  AlertCircle, Clock, XCircle, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_OPTS: { value: WarrantyClaimStatus | ''; label: string }[] = [
  { value: '',           label: 'All' },
  { value: 'open',       label: 'Open' },
  { value: 'in_review',  label: 'In Review' },
  { value: 'resolved',   label: 'Resolved' },
  { value: 'rejected',   label: 'Rejected' },
]

const STATUS_COLORS: Record<WarrantyClaimStatus, string> = {
  open:      'bg-amber-100 text-amber-700',
  in_review: 'bg-blue-100 text-blue-700',
  resolved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-600',
}

const STATUS_ICON: Record<WarrantyClaimStatus, React.ReactNode> = {
  open:      <Clock size={13} />,
  in_review: <AlertCircle size={13} />,
  resolved:  <CheckCircle size={13} />,
  rejected:  <XCircle size={13} />,
}

const PRIORITY_COLORS = {
  low:    'bg-gray-100 text-gray-600',
  medium: 'bg-amber-100 text-amber-700',
  high:   'bg-red-100 text-red-600',
}

export default function WarrantyPage() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<WarrantyClaimStatus | ''>('')
  const [showForm, setShowForm] = useState(false)
  const [resolving, setResolving] = useState<number | null>(null)
  const [resolveNotes, setResolveNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['warranty', filterStatus],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filterStatus) params.status = filterStatus
      return (await warrantyApi.list(params)).data
    },
  })

  const claims: WarrantyClaim[] = data?.results ?? data ?? []

  const resolveMutation = useMutation({
    mutationFn: (id: number) => warrantyApi.resolve(id, resolveNotes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warranty'] })
      toast.success('Claim resolved')
      setResolving(null)
      setResolveNotes('')
    },
    onError: () => toast.error('Failed to resolve claim'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      warrantyApi.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warranty'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Failed to update status'),
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1>Warranty & After-Sales</h1>
          <p className="text-sm text-gray-500 mt-1">
            {claims.filter(c => c.status === 'open').length} open · {claims.length} total
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> New Claim
        </button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
        {STATUS_OPTS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilterStatus(value)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0',
              filterStatus === value
                ? 'bg-[#091928] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Claims list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : claims.length === 0 ? (
        <div className="text-center py-16 card">
          <ShieldCheck size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">No warranty claims found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map(claim => (
            <div key={claim.id} className="card p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn('badge flex items-center gap-1', STATUS_COLORS[claim.status])}>
                      {STATUS_ICON[claim.status]} {claim.status_display}
                    </span>
                    <span className={cn('badge', PRIORITY_COLORS[claim.priority])}>
                      {claim.priority_display} priority
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">{claim.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {claim.client_name} · {claim.installation_ref}
                  </p>
                  {claim.description && (
                    <p className="text-sm text-gray-600 mt-2">{claim.description}</p>
                  )}
                  {claim.status === 'resolved' && claim.resolution_notes && (
                    <div className="mt-2 px-3 py-2 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800">
                      <span className="font-medium">Resolution:</span> {claim.resolution_notes}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Raised by {claim.raised_by_name} · {formatDate(claim.created_at)}
                    {claim.resolved_at && ` · Resolved ${formatDate(claim.resolved_at)}`}
                  </p>
                </div>

                {/* Actions */}
                {claim.status !== 'resolved' && claim.status !== 'rejected' && (
                  <div className="flex items-center gap-2 shrink-0 self-start">
                    {/* Status quick-change */}
                    <div className="relative">
                      <select
                        value={claim.status}
                        onChange={e => updateMutation.mutate({ id: claim.id, status: e.target.value })}
                        className="input text-sm py-1.5 pr-8 appearance-none"
                      >
                        <option value="open">Open</option>
                        <option value="in_review">In Review</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <button
                      onClick={() => { setResolving(claim.id); setResolveNotes('') }}
                      className="btn-outline text-sm py-1.5 text-green-700 border-green-200 hover:bg-green-50"
                    >
                      <CheckCircle size={14} /> Resolve
                    </button>
                  </div>
                )}
              </div>

              {/* Resolve inline panel */}
              {resolving === claim.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <label className="label">Resolution notes</label>
                  <textarea
                    value={resolveNotes}
                    onChange={e => setResolveNotes(e.target.value)}
                    className="input resize-none"
                    rows={3}
                    placeholder="Describe what was done to resolve this claim..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolveMutation.mutate(claim.id)}
                      disabled={resolveMutation.isPending}
                      className="btn-primary text-sm py-2"
                    >
                      {resolveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                      Confirm Resolved
                    </button>
                    <button
                      onClick={() => setResolving(null)}
                      className="btn-outline text-sm py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New claim modal */}
      {showForm && (
        <NewClaimModal
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            qc.invalidateQueries({ queryKey: ['warranty'] })
          }}
        />
      )}
    </div>
  )
}

function NewClaimModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    installation: '',
    title: '',
    description: '',
    priority: 'medium',
  })

  const { data: instData } = useQuery({
    queryKey: ['installations-for-warranty'],
    queryFn: async () => (await installationsApi.list({ status: 'completed' })).data,
  })
  const installations: Installation[] = instData?.results ?? instData ?? []

  const mutation = useMutation({
    mutationFn: () => warrantyApi.create({
      installation: Number(form.installation),
      title: form.title,
      description: form.description,
      priority: form.priority,
    }),
    onSuccess,
    onError: () => toast.error('Failed to create claim'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">New Warranty Claim</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Installation *</label>
            <select
              value={form.installation}
              onChange={e => setForm(f => ({ ...f, installation: e.target.value }))}
              className="input"
            >
              <option value="">— Select completed installation —</option>
              {installations.map(i => (
                <option key={i.id} value={i.id}>
                  {i.client_name} · {i.quote_ref}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Issue Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input"
              placeholder="e.g. Inverter fault after 3 months"
            />
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="input"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input resize-none"
              rows={3}
              placeholder="Describe the issue in detail..."
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.installation || !form.title}
            className="btn-primary flex-1 justify-center"
          >
            {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
            Submit Claim
          </button>
        </div>
      </div>
    </div>
  )
}
