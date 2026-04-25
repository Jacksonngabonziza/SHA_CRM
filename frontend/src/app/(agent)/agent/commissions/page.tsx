'use client'
import { useQuery } from '@tanstack/react-query'
import { agentsApi } from '@/lib/api'
import { AgentCommission } from '@/types'
import { formatRWF, formatDate } from '@/lib/utils'
import { Coins, CheckCircle, Clock, Loader2, TrendingUp } from 'lucide-react'

export default function AgentCommissionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['agent-my-commissions'],
    queryFn: async () => (await agentsApi.myCommissions()).data,
  })

  const commissions: AgentCommission[] = data?.results ?? data ?? []

  const totalEarned = commissions.reduce((s, c) => s + Number(c.amount_rwf), 0)
  const totalPending = commissions.filter(c => !c.is_paid).reduce((s, c) => s + Number(c.amount_rwf), 0)
  const totalPaid = commissions.filter(c => c.is_paid).reduce((s, c) => s + Number(c.amount_rwf), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Earnings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Commission from won deals</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={24} className="animate-spin text-[#EA9D13]" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <SummaryCard label="Total Earned" value={formatRWF(totalEarned)} icon={TrendingUp} color="text-[#091928]" bg="bg-slate-50" />
            <SummaryCard label="Paid Out" value={formatRWF(totalPaid)} icon={CheckCircle} color="text-[#71AA1F]" bg="bg-green-50" />
            <SummaryCard label="Pending" value={formatRWF(totalPending)} icon={Clock} color="text-[#EA9D13]" bg="bg-amber-50" />
          </div>

          {/* Commission list */}
          {commissions.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Coins size={28} className="text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">No commissions yet</p>
              <p className="text-sm text-gray-400 mt-1">You earn commission when a client you registered wins a deal</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {commissions.map(c => (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{c.client_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">{c.quote_ref}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{formatRWF(c.amount_rwf)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(c.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <span className="text-xs text-gray-400">
                      Deal: <span className="font-medium text-gray-600">{formatRWF(c.quote_total)}</span>
                    </span>
                    {c.is_paid ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                        <CheckCircle size={11} /> Paid {c.paid_at ? `· ${formatDate(c.paid_at)}` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
                        <Clock size={11} /> Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color, bg }: {
  label: string; value: string; icon: React.ElementType; color: string; bg: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm text-center">
      <div className={`w-7 h-7 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}>
        <Icon size={14} className={color} />
      </div>
      <p className="text-sm font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
