'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi } from '@/lib/api'
import { Agent } from '@/types'
import { formatRWF, cn } from '@/lib/utils'
import {
  Plus, Users, Coins, Loader2, MoreVertical, Edit, Trash2, KeyRound,
  TrendingUp, ChevronRight, Search, ArrowUpDown, Layers,
  UserCheck, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import AgentFormModal from '@/components/agents/AgentFormModal'
import ResetPinModal from '@/components/agents/ResetPinModal'
import CommissionTiersSection from '@/components/agents/CommissionTiersSection'

type SortKey = 'full_name' | 'last_login_at' | 'total_clients' | 'clients_this_month' | 'clients_won' | 'total_quotes' | 'total_commission_rwf' | 'pending_commission_rwf'

function loginStatus(lastLogin: string | null): { label: string; sub: string; color: string; dot: string; days: number | null } {
  if (!lastLogin) return { label: 'Never', sub: '', color: 'text-gray-400', dot: 'bg-gray-300', days: null }
  const ms      = Date.now() - new Date(lastLogin).getTime()
  const minutes = Math.floor(ms / 60_000)
  const hours   = Math.floor(ms / 3_600_000)
  const days    = Math.floor(ms / 86_400_000)

  let label: string
  if (minutes < 1)       label = 'Just now'
  else if (minutes < 60) label = `${minutes}m ago`
  else if (hours < 24)   label = `${hours}h ${minutes % 60}m ago`
  else if (days === 1)   label = 'Yesterday'
  else                   label = `${days}d ago`

  const sub = new Date(lastLogin).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  })

  if (days <= 7)  return { label, sub, color: 'text-green-700', dot: 'bg-green-500', days }
  if (days <= 30) return { label, sub, color: 'text-amber-700', dot: 'bg-amber-400', days }
  return                 { label, sub, color: 'text-red-600',   dot: 'bg-red-400',   days }
}

export default function AgentsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm]       = useState(false)
  const [editAgent, setEditAgent]     = useState<Agent | null>(null)
  const [resetPinAgent, setResetPinAgent] = useState<Agent | null>(null)
  const [menuOpen, setMenuOpen]       = useState<number | null>(null)
  const [search, setSearch]           = useState('')
  const [sortKey, setSortKey]         = useState<SortKey>('full_name')
  const [sortAsc, setSortAsc]         = useState(true)

  const { data, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => (await agentsApi.list()).data,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => agentsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); toast.success('Agent removed') },
    onError: () => toast.error('Failed to remove agent'),
  })

  const agents: Agent[] = data?.results ?? data ?? []

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = q
      ? agents.filter(a =>
          a.full_name.toLowerCase().includes(q) ||
          a.phone.includes(q) ||
          (a.agent_profile?.zone ?? '').toLowerCase().includes(q)
        )
      : agents
    return [...list].sort((a, b) => {
      let va: string | number = a[sortKey] ?? ''
      let vb: string | number = b[sortKey] ?? ''
      if (sortKey === 'last_login_at') {
        va = a.last_login_at ? new Date(a.last_login_at).getTime() : 0
        vb = b.last_login_at ? new Date(b.last_login_at).getTime() : 0
      }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ? 1 : -1
      return 0
    })
  }, [agents, search, sortKey, sortAsc])

  // Summary stats
  const totalActive = agents.filter(a => a.last_login_at && Math.floor((Date.now() - new Date(a.last_login_at).getTime()) / 86_400_000) <= 30).length
  const dormant     = agents.filter(a => !a.last_login_at || Math.floor((Date.now() - new Date(a.last_login_at).getTime()) / 86_400_000) > 30).length
  const totalPending = agents.reduce((s, a) => s + a.pending_commission_rwf, 0)
  const clientsThisMonth = agents.reduce((s, a) => s + a.clients_this_month, 0)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortTh = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th
      onClick={() => handleSort(k)}
      className={cn(
        'py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-800 whitespace-nowrap',
        right ? 'text-right' : 'text-left'
      )}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown size={11} className={sortKey === k ? 'text-[#EA9D13]' : 'text-gray-300'} />
      </span>
    </th>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Field Agents</h1>
          <p className="text-sm text-gray-500 mt-1">{agents.length} agent{agents.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={() => { setEditAgent(null); setShowForm(true) }} className="btn-primary">
          <Plus size={16} /> New Agent
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Users}        label="Total Agents"         value={String(agents.length)}       sub="registered"            color="text-[#091928]" bg="bg-slate-50" />
        <SummaryCard icon={UserCheck}    label="Active (30 days)"     value={String(totalActive)}         sub="logged in recently"     color="text-[#71AA1F]" bg="bg-green-50" />
        <SummaryCard icon={TrendingUp}   label="Clients This Month"   value={String(clientsThisMonth)}    sub="across all agents"      color="text-blue-600"  bg="bg-blue-50" />
        <SummaryCard icon={Coins}        label="Pending Commissions"  value={formatRWF(totalPending)}     sub="awaiting payout"        color="text-[#EA9D13]" bg="bg-amber-50" />
      </div>

      {/* Dormant warning */}
      {dormant > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <span><strong>{dormant}</strong> agent{dormant !== 1 ? 's have' : ' has'} not logged in within the last 30 days.</span>
        </div>
      )}

      {/* Table card */}
      <div className="card p-0 overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EA9D13]/30 focus:border-[#EA9D13]"
            />
          </div>
          <span className="text-xs text-gray-400 ml-auto">
            {filtered.length} of {agents.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Users size={24} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700">No field agents yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Add your first agent to start tracking field activity</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto">
              <Plus size={15} /> Add Agent
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <SortTh k="full_name">Agent</SortTh>
                  <SortTh k="last_login_at">Last Login</SortTh>
                  <SortTh k="clients_this_month" right>This Month</SortTh>
                  <SortTh k="total_clients" right>Total Clients</SortTh>
                  <SortTh k="total_quotes" right>Quoted</SortTh>
                  <SortTh k="clients_won" right>Won</SortTh>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right whitespace-nowrap">Conv.</th>
                  <SortTh k="total_commission_rwf" right>Commission</SortTh>
                  <SortTh k="pending_commission_rwf" right>Pending</SortTh>
                  <th className="py-3 px-4 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(agent => {
                  const ls = loginStatus(agent.last_login_at)
                  const conv = agent.total_clients > 0
                    ? Math.round((agent.clients_won / agent.total_clients) * 100)
                    : 0
                  const hasTiers = agent.agent_profile?.commission_rate == null

                  return (
                    <tr key={agent.id} className="hover:bg-gray-50/60 group transition-colors">
                      {/* Agent */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-xl bg-[#091928] flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {agent.full_name[0]}
                            </div>
                            <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white', ls.dot)} />
                          </div>
                          <div>
                            <Link href={`/agents/${agent.id}`} className="font-semibold text-gray-900 hover:text-[#EA9D13] transition-colors">
                              {agent.full_name}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">{agent.phone}</span>
                              {agent.agent_profile?.zone && (
                                <span className="text-xs text-gray-400">· {agent.agent_profile.zone}</span>
                              )}
                              <span className={cn(
                                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                                hasTiers ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-700'
                              )}>
                                {hasTiers ? <span className="flex items-center gap-0.5"><Layers size={9} /> Tiered</span> : `${((agent.agent_profile?.commission_rate ?? 0) * 100).toFixed(1)}%`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Last login */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('text-sm font-semibold', ls.color)}>{ls.label}</span>
                          {ls.days !== null && ls.days > 30 && (
                            <span className="text-[10px] text-red-500 font-semibold bg-red-50 px-1.5 py-0.5 rounded-full">Dormant</span>
                          )}
                          {!agent.last_login_at && (
                            <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded-full">No login</span>
                          )}
                        </div>
                        {ls.sub && (
                          <p className="text-[11px] text-gray-400 mt-0.5">{ls.sub}</p>
                        )}
                      </td>

                      {/* This month */}
                      <td className="py-3 px-4 text-right">
                        <span className={cn(
                          'font-semibold text-sm',
                          agent.clients_this_month > 0 ? 'text-[#71AA1F]' : 'text-gray-300'
                        )}>
                          {agent.clients_this_month}
                        </span>
                        <span className="text-xs text-gray-300 ml-1">
                          / {agent.agent_profile?.target_clients_per_month ?? '—'}
                        </span>
                      </td>

                      {/* Total clients */}
                      <td className="py-3 px-4 text-right font-medium text-gray-700">{agent.total_clients}</td>

                      {/* Quoted */}
                      <td className="py-3 px-4 text-right font-medium text-gray-700">{agent.total_quotes}</td>

                      {/* Won */}
                      <td className="py-3 px-4 text-right font-semibold text-[#71AA1F]">{agent.clients_won}</td>

                      {/* Conversion */}
                      <td className="py-3 px-4 text-right">
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          conv >= 50 ? 'bg-green-50 text-green-700' :
                          conv >= 20 ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        )}>
                          {conv}%
                        </span>
                      </td>

                      {/* Commission */}
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        {formatRWF(agent.total_commission_rwf)}
                      </td>

                      {/* Pending */}
                      <td className="py-3 px-4 text-right">
                        {agent.pending_commission_rwf > 0 ? (
                          <span className="font-semibold text-amber-600">{formatRWF(agent.pending_commission_rwf)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === agent.id ? null : agent.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <MoreVertical size={15} />
                        </button>
                        {menuOpen === agent.id && (
                          <div className="absolute right-4 top-12 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                            <Link
                              href={`/agents/${agent.id}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setMenuOpen(null)}
                            >
                              <ChevronRight size={13} /> View details
                            </Link>
                            <button
                              onClick={() => { setEditAgent(agent); setShowForm(true); setMenuOpen(null) }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Edit size={13} /> Edit profile
                            </button>
                            <button
                              onClick={() => { setResetPinAgent(agent); setMenuOpen(null) }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <KeyRound size={13} /> Reset PIN
                            </button>
                            <div className="my-1 border-t border-gray-100" />
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${agent.full_name}?`)) deleteMutation.mutate(agent.id)
                                setMenuOpen(null)
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={13} /> Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filtered.length === 0 && search && (
              <div className="text-center py-12 text-gray-400">
                <Search size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No agents match "{search}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Commission tiers */}
      <CommissionTiersSection />

      {showForm && (
        <AgentFormModal
          agent={editAgent}
          onClose={() => { setShowForm(false); setEditAgent(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['agents'] }); setShowForm(false); setEditAgent(null) }}
        />
      )}
      {resetPinAgent && (
        <ResetPinModal agent={resetPinAgent} onClose={() => setResetPinAgent(null)} />
      )}
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, sub, color, bg }: {
  icon: React.ElementType; label: string; value: string; sub: string; color: string; bg: string
}) {
  return (
    <div className="card">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon size={17} className={color} />
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}
