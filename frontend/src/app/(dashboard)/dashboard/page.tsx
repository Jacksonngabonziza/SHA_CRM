'use client'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi, productsApi } from '@/lib/api'
import { formatRWF, formatDate, STATUS_COLORS, cn } from '@/lib/utils'
import { DashboardStats, Product } from '@/types'
import {
  Users, FileText, DollarSign,
  AlertCircle, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, Phone
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => (await dashboardApi.stats()).data,
    refetchInterval: 60_000,
  })

  const { data: lowStockProducts } = useQuery<Product[]>({
    queryKey: ['low-stock'],
    queryFn: async () => (await productsApi.lowStock()).data,
    refetchInterval: 300_000,
  })

  if (isLoading) return <DashboardSkeleton />

  const revenueGrowth = stats?.revenue.last_month
    ? ((stats.revenue.this_month - stats.revenue.last_month) / stats.revenue.last_month * 100).toFixed(1)
    : null

  const clientGrowth = stats?.clients.new_last_month
    ? ((stats.clients.new_this_month - stats.clients.new_last_month) / stats.clients.new_last_month * 100).toFixed(1)
    : null

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getGreeting()}, {user?.first_name || user?.username} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Here's what's happening with SolarHope Africa today.
        </p>
      </div>

      {/* Follow-up panel */}
      {stats && stats.followups.overdue > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-amber-50 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Follow-ups Due</span>
              {stats.followups.today_count > 0 && (
                <span className="text-xs bg-amber-500 text-white rounded-full px-2 py-0.5 font-medium">
                  {stats.followups.today_count} today
                </span>
              )}
              {stats.followups.overdue_count > 0 && (
                <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-medium">
                  {stats.followups.overdue_count} overdue
                </span>
              )}
            </div>
            <Link href="/clients?status=followup" className="text-xs font-medium text-amber-700 hover:underline">
              View all {stats.followups.overdue} →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.followups.due.map(c => {
              const today = new Date().toISOString().slice(0, 10)
              const isOverdue = c.followup_date && c.followup_date < today
              return (
                <Link
                  key={c.id}
                  href={`/clients/${c.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold shrink-0">
                      {c.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Phone size={11} className="text-gray-400" />
                        <span className="text-xs text-gray-500">{c.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isOverdue ? `Overdue · ${c.followup_date}` : `Today · ${c.followup_date}`}
                    </span>
                    {c.location && <p className="text-xs text-gray-400 mt-0.5">{c.location}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Expiring quotes alert */}
      {(stats?.alerts?.expiring_count ?? 0) > 0 && stats && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">Quotes Expiring Soon</span>
              <span className="text-xs bg-blue-500 text-white rounded-full px-2 py-0.5 font-medium">
                {stats.alerts.expiring_count} within 7 days
              </span>
            </div>
            <Link href="/quotes" className="text-xs font-medium text-blue-700 hover:underline">View quotes →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.alerts.expiring_quotes.map(q => (
              <Link key={q.id} href={`/quotes/${q.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-[#091928]">{q.ref_number}</p>
                  <p className="text-xs text-gray-400">{q.client_name ?? q.client_detail?.name}</p>
                </div>
                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Expires {formatDate(q.valid_until)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Low-stock alert */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 mb-1">
              {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} low on stock
            </p>
            <p className="text-xs text-red-600">
              {lowStockProducts.map(p => p.name).join(' · ')}
            </p>
          </div>
          <Link href="/products" className="text-xs font-medium text-red-700 hover:underline shrink-0">
            View products →
          </Link>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Clients"
          value={stats?.clients.total || 0}
          sub={`+${stats?.clients.new_this_month || 0} this month`}
          growth={clientGrowth}
          icon={<Users size={20} />}
          color="blue"
          href="/clients"
        />
        <MetricCard
          label="Total Quotes"
          value={stats?.quotes.total || 0}
          sub={`${stats?.quotes.conversion_rate || 0}% conversion`}
          icon={<FileText size={20} />}
          color="amber"
          href="/quotes"
        />
        <MetricCard
          label="Revenue Won"
          value={formatRWF(stats?.revenue.total || 0)}
          sub={`${formatRWF(stats?.revenue.this_month || 0)} this month`}
          growth={revenueGrowth}
          icon={<DollarSign size={20} />}
          color="green"
        />
        <MetricCard
          label="Follow-ups Due"
          value={stats?.followups.overdue || 0}
          sub="Need attention today"
          icon={<Clock size={20} />}
          color="red"
          href="/clients?status=followup"
        />
      </div>

      {/* Charts + Quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Revenue — Last 6 months</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">RWF</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.monthly_revenue || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1_000_000).toFixed(1)}M`} />
              <Tooltip
                formatter={(v: number) => [formatRWF(v), 'Revenue']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Bar dataKey="revenue" fill="#EA9D13" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quote Pipeline</h3>
          <div className="space-y-3">
            {Object.entries(stats?.quotes.by_status || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('badge', STATUS_COLORS[status] || 'bg-gray-100 text-gray-700')}>
                    {status}
                  </span>
                </div>
                <span className="font-semibold text-gray-900 text-sm">{count}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Client Pipeline</h3>
            <div className="space-y-3">
              {Object.entries(stats?.clients.by_status || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={cn('badge', STATUS_COLORS[status] || 'bg-gray-100 text-gray-700')}>
                    {status}
                  </span>
                  <span className="font-semibold text-gray-900 text-sm">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent quotes + clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent quotes */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Quotes</h3>
            <Link href="/quotes" className="text-xs text-[#EA9D13] font-medium hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(stats?.recent_quotes || []).length === 0 && (
              <p className="text-sm text-gray-400 p-6 text-center">No quotes yet</p>
            )}
            {(stats?.recent_quotes || []).map(q => (
              <Link key={q.id} href={`/quotes/${q.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{q.client_name}</p>
                  <p className="text-xs text-gray-500">{q.ref_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatRWF(q.total_price_rwf)}</p>
                  <span className={cn('badge text-xs', STATUS_COLORS[q.status] || '')}>
                    {q.status_display}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent clients */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Clients</h3>
            <Link href="/clients" className="text-xs text-[#EA9D13] font-medium hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(stats?.recent_clients || []).length === 0 && (
              <p className="text-sm text-gray-400 p-6 text-center">No clients yet</p>
            )}
            {(stats?.recent_clients || []).map(c => (
              <Link key={c.id} href={`/clients/${c.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#091928] flex items-center justify-center text-white text-xs font-bold">
                    {c.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone} · {c.location || '—'}</p>
                  </div>
                </div>
                <span className={cn('badge', STATUS_COLORS[c.status] || '')}>{c.status_display}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, growth, icon, color, href }: {
  label: string, value: string | number, sub: string,
  growth?: string | null, icon: React.ReactNode,
  color: string, href?: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
  }
  const content = (
    <div className="stat-card flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', colorMap[color])}>{icon}</div>
        {growth && (
          <div className={cn('flex items-center gap-0.5 text-xs font-medium',
            parseFloat(growth) >= 0 ? 'text-green-600' : 'text-red-500')}>
            {parseFloat(growth) >= 0
              ? <ArrowUpRight size={14} />
              : <ArrowDownRight size={14} />}
            {Math.abs(parseFloat(growth))}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
    </div>
  )
  return href ? <Link href={href} className="hover:shadow-md transition-shadow">{content}</Link> : content
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
      <div className="h-8 bg-gray-200 rounded w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 bg-gray-200 rounded-xl" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}
