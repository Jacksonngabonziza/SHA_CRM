'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api'
import { MonthlyReport, RevenueReport } from '@/types'
import { useAuthStore } from '@/lib/store'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, LineChart, Line, Legend,
} from 'recharts'
import { Loader2, TrendingUp, Users, FileText, Wrench, BarChart2 } from 'lucide-react'

function formatRWF(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M RWF`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K RWF`
  return `${v.toLocaleString()} RWF`
}

export default function ReportsPage() {
  const { user } = useAuthStore()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: monthly, isLoading: loadingMonthly } = useQuery<MonthlyReport>({
    queryKey: ['report-monthly', year, month],
    queryFn: async () => (await reportsApi.monthly({ year, month })).data,
  })

  const { data: revenue, isLoading: loadingRevenue } = useQuery<RevenueReport>({
    queryKey: ['report-revenue'],
    queryFn: async () => (await reportsApi.revenue()).data,
  })

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <BarChart2 size={48} className="mb-4 text-gray-200" />
        <p className="text-lg font-medium">Reports are admin-only</p>
        <p className="text-sm mt-1">Ask your admin for access.</p>
      </div>
    )
  }

  const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Business performance analytics</p>
        </div>
      </div>

      {/* 12-month Revenue chart */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-1">12-Month Revenue Overview</h2>
        <p className="text-xs text-gray-500 mb-6">Quoted vs collected revenue per month</p>
        {loadingRevenue ? (
          <div className="flex items-center justify-center h-52">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenue?.months ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatRWF(v)} width={80} />
              <Tooltip
                formatter={(v: number, name: string) => [formatRWF(v), name === 'revenue_quoted' ? 'Quoted' : 'Collected']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Legend formatter={v => v === 'revenue_quoted' ? 'Quoted' : 'Collected'} />
              <Line type="monotone" dataKey="revenue_quoted" stroke="#EA9D13" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="revenue_collected" stroke="#71AA1F" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly report */}
      <div>
        <div className="flex items-center gap-4 mb-5">
          <h2 className="font-semibold text-gray-900">Monthly Performance Report</h2>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="input py-1.5 text-sm w-36"
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="input py-1.5 text-sm w-24"
            >
              {[now.getFullYear() - 1, now.getFullYear()].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {loadingMonthly ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : monthly ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <SummaryCard icon={<Users size={18} />} label="New Clients" value={monthly.summary.new_clients} color="blue" />
              <SummaryCard icon={<FileText size={18} />} label="Quotes Created" value={monthly.summary.quotes_created} color="amber" />
              <SummaryCard icon={<FileText size={18} />} label="Quotes Won" value={monthly.summary.quotes_won} color="green" />
              <SummaryCard
                icon={<TrendingUp size={18} />}
                label="Revenue Collected"
                value={formatRWF(monthly.summary.revenue_collected)}
                color="green"
              />
              <SummaryCard icon={<Wrench size={18} />} label="Installs Completed" value={monthly.summary.installations_completed} color="blue" />
              <SummaryCard
                icon={<TrendingUp size={18} />}
                label="Avg System Size"
                value={`${monthly.summary.avg_system_size.toFixed(1)} kWp`}
                color="amber"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales breakdown */}
              <div className="card p-5">
                <h3 className="font-semibold mb-4">Sales Team Breakdown</h3>
                {monthly.sales_breakdown.length === 0 ? (
                  <p className="text-sm text-gray-400">No data for this period</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                        <th className="text-left pb-2">Name</th>
                        <th className="text-center pb-2">Clients</th>
                        <th className="text-center pb-2">Sent</th>
                        <th className="text-center pb-2">Won</th>
                        <th className="text-right pb-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {monthly.sales_breakdown.map(s => (
                        <tr key={s.name}>
                          <td className="py-2 font-medium text-gray-800">{s.name}</td>
                          <td className="py-2 text-center text-gray-600">{s.new_clients}</td>
                          <td className="py-2 text-center text-gray-600">{s.quotes_sent}</td>
                          <td className="py-2 text-center text-gray-600">{s.quotes_won}</td>
                          <td className="py-2 text-right font-semibold text-gray-800">{formatRWF(s.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Client types */}
              <div className="card p-5">
                <h3 className="font-semibold mb-4">New Clients by Type</h3>
                {monthly.by_client_type.length === 0 ? (
                  <p className="text-sm text-gray-400">No data for this period</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={monthly.by_client_type} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="client_type" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                      <Bar dataKey="count" fill="#EA9D13" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top packages */}
            {monthly.top_packages.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold mb-4">Top System Sizes Won</h3>
                <div className="flex gap-3 flex-wrap">
                  {monthly.top_packages.map((pkg, i) => (
                    <div key={pkg.system_size_kwp} className="bg-gray-50 rounded-xl px-4 py-3 text-center min-w-24">
                      <p className="text-xs text-gray-500 mb-1">#{i + 1}</p>
                      <p className="font-bold text-[#091928] text-lg">{pkg.system_size_kwp} kWp</p>
                      <p className="text-xs text-gray-500">{pkg.count} sold</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, color }: {
  readonly icon: React.ReactNode
  readonly label: string
  readonly value: string | number
  readonly color: 'blue' | 'amber' | 'green'
}) {
  const colorMap = {
    blue:  'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
  }
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`p-2 rounded-lg shrink-0 ${colorMap[color]}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}
