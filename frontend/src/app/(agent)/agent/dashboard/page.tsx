'use client'
import { useQuery } from '@tanstack/react-query'
import { agentsApi } from '@/lib/api'
import { AgentStats } from '@/types'
import { formatRWF } from '@/lib/utils'
import { Users, TrendingUp, Coins, Clock, Plus, Loader2, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'

export default function AgentDashboardPage() {
  const { user } = useAuthStore()

  const { data: stats, isLoading } = useQuery<AgentStats>({
    queryKey: ['agent-me'],
    queryFn: async () => (await agentsApi.me()).data,
  })

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 size={28} className="animate-spin text-[#EA9D13]" />
      <p className="text-sm text-gray-400">Loading your dashboard…</p>
    </div>
  )

  const progress = stats
    ? Math.min(100, Math.round((stats.clients_this_month / (stats.target_clients_per_month || 1)) * 100))
    : 0

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{greeting()},</p>
          <h1 className="text-2xl font-bold text-gray-900">{user?.first_name} 👋</h1>
          {stats?.zone && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#71AA1F]" />
              {stats.zone}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[#091928] flex items-center justify-center text-white text-xl font-bold shadow-md">
          {user?.first_name?.[0] ?? '?'}
        </div>
      </div>

      {/* Monthly progress card */}
      <div className="relative bg-[#091928] rounded-2xl p-5 overflow-hidden">
        {/* Decorative bg */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#EA9D13]/10 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-[#71AA1F]/10 translate-y-8 -translate-x-4" />

        <div className="relative">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-widest">Monthly Goal</p>
              <p className="text-white text-2xl font-bold mt-0.5">
                {stats?.clients_this_month ?? 0}
                <span className="text-white/40 text-base font-normal"> / {stats?.target_clients_per_month ?? 0}</span>
              </p>
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${
              progress >= 100 ? 'bg-[#71AA1F] text-white' : 'bg-[#EA9D13]/20 text-[#EA9D13]'
            }`}>
              {progress}%
            </span>
          </div>

          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: progress >= 100
                  ? '#71AA1F'
                  : 'linear-gradient(90deg, #EA9D13, #f0b040)'
              }}
            />
          </div>
          <p className="text-white/30 text-xs mt-2">
            {progress >= 100
              ? 'Target reached! Keep going 🎉'
              : `${(stats?.target_clients_per_month ?? 0) - (stats?.clients_this_month ?? 0)} more client${(stats?.target_clients_per_month ?? 0) - (stats?.clients_this_month ?? 0) !== 1 ? 's' : ''} to hit target`}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Users}
          label="Total Clients"
          value={String(stats?.total_clients ?? 0)}
          accent="#091928"
          light="bg-slate-50"
        />
        <StatCard
          icon={TrendingUp}
          label="Clients Won"
          value={String(stats?.clients_won ?? 0)}
          accent="#71AA1F"
          light="bg-green-50"
        />
        <StatCard
          icon={Coins}
          label="Total Earned"
          value={formatRWF(stats?.total_commission_rwf ?? 0)}
          accent="#EA9D13"
          light="bg-amber-50"
          small
        />
        <StatCard
          icon={Clock}
          label="Pending Payout"
          value={formatRWF(stats?.pending_commission_rwf ?? 0)}
          accent="#f97316"
          light="bg-orange-50"
          small
        />
      </div>

      {/* Quick actions */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Quick Actions</p>
        <Link
          href="/agent/clients/new"
          className="flex items-center justify-between w-full bg-[#EA9D13] text-white font-semibold px-5 py-4 rounded-2xl hover:bg-[#d48e10] active:scale-[0.98] transition-all shadow-md shadow-amber-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Plus size={18} />
            </div>
            <span>Register New Client</span>
          </div>
          <ChevronRight size={18} className="opacity-70" />
        </Link>
        <Link
          href="/agent/clients"
          className="flex items-center justify-between w-full bg-white text-gray-800 font-semibold px-5 py-4 rounded-2xl hover:bg-gray-50 active:scale-[0.98] transition-all border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
              <Users size={18} className="text-[#091928]" />
            </div>
            <span>View My Clients</span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>
      </div>

      {/* Commission info */}
      {stats && stats.uses_tiers && stats.tiers.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Commission Scale</p>
          <div className="space-y-2">
            {stats.tiers.map(tier => (
              <div key={tier.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#71AA1F]" />
                  <span className="text-sm font-medium text-gray-800">{tier.label}</span>
                  <span className="text-gray-400 text-xs">
                    {formatRWF(tier.min_amount)} – {tier.max_amount != null ? formatRWF(tier.max_amount) : '∞'}
                  </span>
                </div>
                <span className="bg-green-50 text-green-700 font-bold text-xs px-2.5 py-1 rounded-full">
                  {tier.rate_pct}%
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-50">
            Commission is calculated on the total won deal value.
          </p>
        </div>
      ) : stats && !stats.uses_tiers && stats.commission_rate != null ? (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
          <span className="text-sm text-gray-500 flex items-center gap-2">
            <Coins size={14} className="text-[#EA9D13]" /> Your commission rate
          </span>
          <span className="font-bold text-gray-900">{(stats.commission_rate * 100).toFixed(1)}%</span>
        </div>
      ) : null}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, accent, light, small }: {
  icon: React.ElementType
  label: string
  value: string
  accent: string
  light: string
  small?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-xl ${light} flex items-center justify-center mb-3`}>
        <Icon size={17} style={{ color: accent }} />
      </div>
      <p className={`font-bold text-gray-900 leading-tight ${small ? 'text-base' : 'text-xl'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
