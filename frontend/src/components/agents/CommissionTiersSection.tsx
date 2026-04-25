'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi } from '@/lib/api'
import { CommissionTier } from '@/types'
import { formatRWF } from '@/lib/utils'
import { Plus, Edit, Trash2, Layers, Loader2, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CommissionTiersSection() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editTier, setEditTier] = useState<CommissionTier | null>(null)

  const { data: tiersRaw, isLoading } = useQuery({
    queryKey: ['commission-tiers'],
    queryFn: async () => (await agentsApi.tiers.list()).data,
  })
  const tiers: CommissionTier[] = tiersRaw?.results ?? (Array.isArray(tiersRaw) ? tiersRaw : [])

  const deleteMutation = useMutation({
    mutationFn: (id: number) => agentsApi.tiers.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commission-tiers'] }); toast.success('Tier deleted') },
    onError: () => toast.error('Failed to delete tier'),
  })

  const sortedTiers = [...tiers].sort((a, b) => a.min_amount - b.min_amount)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-[#091928]" />
          <h2 className="text-base font-semibold text-gray-900">Commission Tiers</h2>
          <span className="text-xs text-gray-400 ml-1">Global brackets applied to agents without a fixed rate</span>
        </div>
        <button
          onClick={() => { setEditTier(null); setShowForm(true) }}
          className="btn-secondary text-sm py-1.5 px-3"
        >
          <Plus size={14} /> Add Tier
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : sortedTiers.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Layers size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No tiers configured yet.</p>
          <p className="text-xs mt-1">Agents without a fixed rate will earn 0% until tiers are set.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-3 text-sm py-1.5 px-4">
            <Plus size={14} /> Create First Tier
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">Label</th>
                <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500">Min Deal</th>
                <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500">Max Deal</th>
                <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500">Rate</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedTiers.map((tier) => (
                <tr key={tier.id} className="hover:bg-gray-50 group">
                  <td className="py-2.5 pr-4 font-medium text-gray-900">{tier.label}</td>
                  <td className="py-2.5 pr-4 text-right text-gray-600">{formatRWF(tier.min_amount)}</td>
                  <td className="py-2.5 pr-4 text-right text-gray-600">
                    {tier.max_amount != null ? formatRWF(tier.max_amount) : <span className="text-gray-400 italic">No limit</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 font-semibold text-xs px-2 py-0.5 rounded-full">
                      {tier.rate_pct}%
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditTier(tier); setShowForm(true) }}
                        className="p-1 text-gray-400 hover:text-gray-700"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete tier "${tier.label}"?`)) deleteMutation.mutate(tier.id) }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <TierFormModal
          tier={editTier}
          onClose={() => { setShowForm(false); setEditTier(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['commission-tiers'] }); setShowForm(false); setEditTier(null) }}
        />
      )}
    </div>
  )
}

function TierFormModal({ tier, onClose, onSaved }: {
  tier: CommissionTier | null
  onClose: () => void
  onSaved: () => void
}) {
  const [label, setLabel] = useState(tier?.label ?? '')
  const [minAmount, setMinAmount] = useState(String(tier?.min_amount ?? ''))
  const [maxAmount, setMaxAmount] = useState(tier?.max_amount != null ? String(tier.max_amount) : '')
  const [ratePct, setRatePct] = useState(String(tier?.rate_pct ?? ''))
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !minAmount || !ratePct) return
    setSaving(true)
    try {
      const payload = {
        label: label.trim(),
        min_amount: Number(minAmount),
        max_amount: maxAmount ? Number(maxAmount) : null,
        rate: Number(ratePct) / 100,
      }
      if (tier) {
        await agentsApi.tiers.update(tier.id, payload)
        toast.success('Tier updated')
      } else {
        await agentsApi.tiers.create(payload)
        toast.success('Tier created')
      }
      onSaved()
    } catch {
      toast.error('Failed to save tier')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{tier ? 'Edit Tier' : 'New Commission Tier'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Standard, Premium"
              className="input w-full"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Deal (RWF)</label>
              <input
                type="number"
                value={minAmount}
                onChange={e => setMinAmount(e.target.value)}
                placeholder="0"
                className="input w-full"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Deal (RWF)</label>
              <input
                type="number"
                value={maxAmount}
                onChange={e => setMaxAmount(e.target.value)}
                placeholder="No limit"
                className="input w-full"
                min="0"
              />
              <p className="text-xs text-gray-400 mt-0.5">Leave blank for no upper limit</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
            <input
              type="number"
              value={ratePct}
              onChange={e => setRatePct(e.target.value)}
              placeholder="2.5"
              className="input w-full"
              step="0.01"
              min="0"
              max="100"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {tier ? 'Save Changes' : 'Create Tier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
