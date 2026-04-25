'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { referralsApi, clientsApi } from '@/lib/api'
import { Referral, ReferralStatus } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { Share2, Loader2, Plus, X } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<ReferralStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  converted: 'bg-green-100 text-green-700',
  lost:      'bg-red-100 text-red-600',
}

const STATUS_OPTIONS: { value: ReferralStatus; label: string }[] = [
  { value: 'pending',   label: 'Pending' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost',      label: 'Lost' },
]

export default function ReferralsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: async () => (await referralsApi.list()).data,
  })

  const referrals: Referral[] = data?.results ?? data ?? []

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      referralsApi.patch(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referrals'] })
      toast.success('Updated')
    },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => referralsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referrals'] })
      toast.success('Referral deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1>Referrals</h1>
          <p className="text-sm text-gray-500 mt-1">{referrals.length} total</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add Referral
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-16">
            <Share2 size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">No referrals recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Referrer', 'Referred Client', 'Status', 'Reward', 'Date', 'Notes', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {referrals.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/clients/${r.referrer}`} className="text-sm font-semibold text-gray-900 hover:text-[#EA9D13]">
                      {r.referrer_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/clients/${r.referred}`} className="text-sm text-gray-700 hover:text-[#EA9D13]">
                      {r.referred_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={r.status}
                      onChange={e => patchMutation.mutate({ id: r.id, data: { status: e.target.value } })}
                      className={cn('text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer', STATUS_COLORS[r.status])}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={r.reward_given}
                        onChange={e => patchMutation.mutate({ id: r.id, data: { reward_given: e.target.checked } })}
                        className="w-4 h-4 accent-[#EA9D13]"
                      />
                      <span className="text-xs text-gray-600">{r.reward_given ? 'Given' : 'Pending'}</span>
                    </label>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{formatDate(r.created_at)}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 max-w-40 truncate">{r.notes || '—'}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => { if (window.confirm('Delete this referral?')) deleteMutation.mutate(r.id) }}
                      className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {showForm && (
        <ReferralFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['referrals'] })
            setShowForm(false)
          }}
        />
      )}
    </div>
  )
}

function ReferralFormModal({ onClose, onSuccess }: { readonly onClose: () => void; readonly onSuccess: () => void }) {
  const [referrerId, setReferrerId] = useState('')
  const [referredId, setReferredId] = useState('')
  const [notes, setNotes] = useState('')
  const [rewardNotes, setRewardNotes] = useState('')

  const { data: clientsData } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => (await clientsApi.list()).data,
  })
  const clients = clientsData?.results ?? clientsData ?? []

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => referralsApi.create(d),
    onSuccess: () => {
      onSuccess()
      toast.success('Referral recorded')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? 'Failed to save referral')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!referrerId || !referredId) { toast.error('Both clients are required'); return }
    if (referrerId === referredId) { toast.error('Referrer and referred must be different clients'); return }
    createMutation.mutate({
      referrer: Number(referrerId),
      referred: Number(referredId),
      notes,
      reward_notes: rewardNotes,
      status: 'pending',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Add Referral</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="referrer-select" className="label">Referrer (existing client)</label>
            <select id="referrer-select" value={referrerId} onChange={e => setReferrerId(e.target.value)} className="input" required>
              <option value="">Select referrer…</option>
              {clients.map((c: { id: number; name: string }) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="referred-select" className="label">Referred (new client)</label>
            <select id="referred-select" value={referredId} onChange={e => setReferredId(e.target.value)} className="input" required>
              <option value="">Select referred client…</option>
              {clients.map((c: { id: number; name: string }) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="referral-notes" className="label">Notes</label>
            <textarea id="referral-notes" value={notes} onChange={e => setNotes(e.target.value)} className="input resize-none text-sm" rows={2} placeholder="How the referral happened…" />
          </div>
          <div>
            <label htmlFor="reward-notes" className="label">Reward Notes</label>
            <textarea id="reward-notes" value={rewardNotes} onChange={e => setRewardNotes(e.target.value)} className="input resize-none text-sm" rows={2} placeholder="Agreed reward, amount, etc…" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Save Referral
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
