'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi } from '@/lib/api'
import { Agent, AgentCommission, Client } from '@/types'
import { formatRWF, formatDate, STATUS_COLORS, cn } from '@/lib/utils'
import {
  ArrowLeft, Phone, MapPin, Coins, Users, TrendingUp,
  CheckCircle, Clock, KeyRound, Edit, Loader2, Target, Layers
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import AgentFormModal from '@/components/agents/AgentFormModal'
import ResetPinModal from '@/components/agents/ResetPinModal'

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  const qc = useQueryClient()
  const [showEdit, setShowEdit] = useState(false)
  const [showResetPin, setShowResetPin] = useState(false)

  const { data: agent, isLoading } = useQuery<Agent>({
    queryKey: ['agents', id],
    queryFn: async () => (await agentsApi.get(id)).data,
  })

  const { data: commissionsData } = useQuery({
    queryKey: ['agent-commissions', id],
    queryFn: async () => (await agentsApi.commissions(id)).data,
    enabled: !!id,
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'agent', id],
    queryFn: async () => {
      const { clientsApi } = await import('@/lib/api')
      return (await clientsApi.list({ source_agent: String(id) })).data
    },
    enabled: !!id,
  })

  const markPaidMutation = useMutation({
    mutationFn: (commissionId: number) => agentsApi.markCommissionPaid(commissionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-commissions', id] })
      qc.invalidateQueries({ queryKey: ['agents', id] })
      toast.success('Commission marked as paid')
    },
    onError: () => toast.error('Failed to update commission'),
  })

  const commissions: AgentCommission[] = commissionsData?.results ?? commissionsData ?? []
  const clients: Client[] = clientsData?.results ?? clientsData ?? []

  if (isLoading) return (
    <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
  )
  if (!agent) return <div className="text-center py-20 text-gray-500">Agent not found</div>

  const hasTiers = agent.agent_profile?.commission_rate == null
  const rate = agent.agent_profile?.commission_rate ?? 0
  const conversionRate = agent.total_clients > 0
    ? Math.round((agent.clients_won / agent.total_clients) * 100)
    : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/agents" className="mt-1 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-2xl bg-[#091928] flex items-center justify-center text-white font-bold text-xl shrink-0">
              {agent.full_name?.[0] ?? '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agent.full_name}</h1>
              <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500 flex-wrap">
                <span className="flex items-center gap-1"><Phone size={12} /> {agent.phone}</span>
                {agent.agent_profile?.zone && (
                  <span className="flex items-center gap-1"><MapPin size={12} /> {agent.agent_profile.zone}</span>
                )}
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-semibold',
                  agent.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                )}>
                  {agent.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowResetPin(true)} className="btn-outline gap-2 text-sm">
            <KeyRound size={14} /> Reset PIN
          </button>
          <button onClick={() => setShowEdit(true)} className="btn-primary gap-2 text-sm">
            <Edit size={14} /> Edit
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Clients', value: String(agent.total_clients), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Clients Won', value: String(agent.clients_won), icon: TrendingUp, color: 'text-[#71AA1F]', bg: 'bg-green-50' },
          { label: 'Total Commission', value: formatRWF(agent.total_commission_rwf), icon: Coins, color: 'text-[#EA9D13]', bg: 'bg-amber-50' },
          { label: 'Pending Payout', value: formatRWF(agent.pending_commission_rwf), icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Agent settings */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target size={16} className="text-gray-400" /> Agent Settings
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Zone</p>
            <p className="font-semibold text-gray-900">{agent.agent_profile?.zone || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Monthly Target</p>
            <p className="font-semibold text-gray-900">{agent.agent_profile?.target_clients_per_month ?? '—'} clients</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Commission Rate</p>
            <span className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold',
              hasTiers ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
            )}>
              {hasTiers ? <><Layers size={12} /> Tiered</> : `${(rate * 100).toFixed(1)}%`}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Conversion</p>
            <p className="font-semibold text-gray-900">{conversionRate}%</p>
          </div>
        </div>
      </div>

      {/* Commission history */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Coins size={16} className="text-gray-400" /> Commission History
          {commissions.length > 0 && (
            <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {commissions.length}
            </span>
          )}
        </h2>
        {commissions.length === 0 ? (
          <div className="text-center py-10">
            <Coins size={28} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No commissions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-5 text-xs font-medium text-gray-400 uppercase tracking-wide">Quote</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Client</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Deal Value</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Commission</th>
                  <th className="text-center py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="pr-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {commissions.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="py-3 pl-5 font-mono text-xs text-gray-500">{c.quote_ref}</td>
                    <td className="py-3 font-medium text-gray-900">{c.client_name}</td>
                    <td className="py-3 text-right text-gray-500">{formatRWF(c.quote_total)}</td>
                    <td className="py-3 text-right font-bold text-gray-900">{formatRWF(c.amount_rwf)}</td>
                    <td className="py-3 text-center">
                      {c.is_paid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                          <CheckCircle size={10} /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right text-gray-400 text-xs">{formatDate(c.created_at)}</td>
                    <td className="py-3 pl-3 pr-5">
                      {!c.is_paid && (
                        <button
                          onClick={() => markPaidMutation.mutate(c.id)}
                          disabled={markPaidMutation.isPending}
                          className="text-xs text-[#EA9D13] hover:text-[#d48e10] font-semibold hover:underline transition-colors disabled:opacity-50"
                        >
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sourced clients */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={16} className="text-gray-400" /> Sourced Clients
          <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {clients.length}
          </span>
        </h2>
        {clients.length === 0 ? (
          <div className="text-center py-10">
            <Users size={28} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No clients sourced yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {clients.map((client: Client) => (
              <div key={client.id} className="flex items-center justify-between py-3 hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-semibold shrink-0">
                    {client.name[0]}
                  </div>
                  <div>
                    <Link href={`/clients/${client.id}`} className="font-medium text-gray-900 hover:text-[#EA9D13] transition-colors text-sm">
                      {client.name}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{client.phone}{client.location ? ` · ${client.location}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400 hidden sm:block">{formatDate(client.created_at)}</span>
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', STATUS_COLORS[client.status])}>
                    {client.status_display}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEdit && (
        <AgentFormModal
          agent={agent}
          onClose={() => setShowEdit(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['agents', id] }); setShowEdit(false) }}
        />
      )}
      {showResetPin && (
        <ResetPinModal agent={agent} onClose={() => setShowResetPin(false)} />
      )}
    </div>
  )
}
