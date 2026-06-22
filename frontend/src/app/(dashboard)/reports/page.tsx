'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, downloadCsv } from '@/lib/api'
import { MonthlyReport, RevenueReport, FinancialReport } from '@/types'
import { useAuthStore } from '@/lib/store'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, LineChart, Line, Legend,
} from 'recharts'
import {
  Loader2, TrendingUp, Users, FileText, Wrench, BarChart2,
  DollarSign, TrendingDown, Wallet, FileDown, AlertCircle,
} from 'lucide-react'

function formatRWF(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M RWF`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K RWF`
  return `${v.toLocaleString()} RWF`
}

type Tab = 'overview' | 'financial'

export default function ReportsPage() {
  const { user } = useAuthStore()
  const now = new Date()
  const [tab, setTab] = useState<Tab>('overview')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const todayStr = now.toISOString().slice(0, 10)
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const [fromDate, setFromDate] = useState(firstOfMonth)
  const [toDate, setToDate]     = useState(todayStr)
  const [queryFrom, setQueryFrom] = useState(firstOfMonth)
  const [queryTo, setQueryTo]     = useState(todayStr)
  const [pdfLoading, setPdfLoading] = useState(false)

  const { data: monthly, isLoading: loadingMonthly } = useQuery<MonthlyReport>({
    queryKey: ['report-monthly', year, month],
    queryFn:  async () => (await reportsApi.monthly({ year, month })).data,
    enabled: tab === 'overview',
  })

  const { data: revenue, isLoading: loadingRevenue } = useQuery<RevenueReport>({
    queryKey: ['report-revenue'],
    queryFn:  async () => (await reportsApi.revenue()).data,
    enabled: tab === 'overview',
  })

  const { data: financial, isLoading: loadingFinancial } = useQuery<FinancialReport>({
    queryKey: ['report-financial', queryFrom, queryTo],
    queryFn:  async () => (await reportsApi.financial({ from_date: queryFrom, to_date: queryTo })).data,
    enabled: tab === 'financial',
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

  const handleDownloadPdf = async () => {
    setPdfLoading(true)
    try {
      await downloadCsv(
        reportsApi.financialPdfUrl(queryFrom, queryTo),
        `Financial-Report-${queryFrom}-to-${queryTo}.pdf`,
      )
    } finally {
      setPdfLoading(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',  label: 'Overview & Monthly Report' },
    { id: 'financial', label: 'Financial Report' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Business performance analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[#EA9D13] text-[#091928]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview + Monthly (combined) ── */}
      {tab === 'overview' && (
        <div className="space-y-8">
          {/* 12-month Revenue chart */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-1">12-Month Revenue Overview</h2>
            <p className="text-xs text-gray-500 mb-6">Quoted vs collected revenue per month</p>
            {loadingRevenue ? (
              <div className="flex items-center justify-center h-52">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={revenue?.months ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatRWF(v)} width={90} />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatRWF(v), name === 'revenue_quoted' ? 'Quoted' : 'Collected']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Legend formatter={v => v === 'revenue_quoted' ? 'Quoted' : 'Collected'} />
                  <Line type="monotone" dataKey="revenue_quoted"    stroke="#EA9D13" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="revenue_collected" stroke="#71AA1F" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly Performance Report */}
          <div>
            <div className="flex items-center gap-4 mb-5">
              <h2 className="font-semibold text-gray-900">Monthly Performance Report</h2>
              <div className="flex items-center gap-2 ml-auto">
                <select value={month} onChange={e => setMonth(Number(e.target.value))} className="input py-1.5 text-sm w-36">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="input py-1.5 text-sm w-24">
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
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <SummaryCard icon={<Users size={18} />} label="New Clients" value={monthly.summary.new_clients} color="blue" />
                  <SummaryCard icon={<FileText size={18} />} label="Quotes Created" value={monthly.summary.quotes_created} color="amber" />
                  <SummaryCard icon={<FileText size={18} />} label="Quotes Won" value={monthly.summary.quotes_won} color="green" />
                  <SummaryCard icon={<TrendingUp size={18} />} label="Revenue Collected" value={formatRWF(monthly.summary.revenue_collected)} color="green" />
                  <SummaryCard icon={<Wrench size={18} />} label="Installs Completed" value={monthly.summary.installations_completed} color="blue" />
                  <SummaryCard icon={<TrendingUp size={18} />} label="Avg System Size" value={`${monthly.summary.avg_system_size.toFixed(1)} kWp`} color="amber" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      )}

      {/* ── Financial Report ── */}
      {tab === 'financial' && (
        <div className="space-y-6">
          {/* Date range filter */}
          <div className="card p-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">From</label>
              <input
                type="date" value={fromDate} max={toDate}
                onChange={e => setFromDate(e.target.value)}
                className="input py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">To</label>
              <input
                type="date" value={toDate} min={fromDate} max={todayStr}
                onChange={e => setToDate(e.target.value)}
                className="input py-1.5 text-sm"
              />
            </div>
            <button
              onClick={() => { setQueryFrom(fromDate); setQueryTo(toDate) }}
              className="btn-primary py-1.5 px-4 text-sm"
            >
              Apply
            </button>
            <div className="ml-auto">
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading || loadingFinancial}
                className="btn-secondary py-1.5 px-4 text-sm flex items-center gap-2"
              >
                {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                Export PDF
              </button>
            </div>
          </div>

          {loadingFinancial ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={28} className="animate-spin text-gray-300" />
            </div>
          ) : financial ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <KpiCard
                  label="Gross Revenue"
                  value={formatRWF(financial.revenue.gross)}
                  sub={`${financial.revenue.install_count + financial.revenue.order_count} deals`}
                  icon={<DollarSign size={18} />}
                  color="blue"
                />
                <KpiCard
                  label="Cash Collected"
                  value={formatRWF(financial.cash.collected)}
                  sub={financial.cash.outstanding > 0 ? `${formatRWF(financial.cash.outstanding)} outstanding` : 'Fully collected'}
                  icon={<Wallet size={18} />}
                  color="green"
                />
                <KpiCard
                  label="Cost of Goods"
                  value={formatRWF(financial.cogs)}
                  sub="Purchase orders received"
                  icon={<TrendingDown size={18} />}
                  color="amber"
                />
                <KpiCard
                  label="Total Expenses"
                  value={formatRWF(financial.expenses.total)}
                  sub={`${financial.expenses.by_category.length} categories`}
                  icon={<AlertCircle size={18} />}
                  color="red"
                />
                <KpiCard
                  label="Gross Profit"
                  value={formatRWF(financial.profit.gross)}
                  sub={`${financial.profit.gross_margin_pct}% margin`}
                  icon={<TrendingUp size={18} />}
                  color={financial.profit.gross >= 0 ? 'green' : 'red'}
                />
                <KpiCard
                  label="Net Profit"
                  value={formatRWF(financial.profit.net)}
                  sub={`${financial.profit.net_margin_pct}% margin`}
                  icon={<BarChart2 size={18} />}
                  color={financial.profit.net >= 0 ? 'green' : 'red'}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue breakdown */}
                <div className="card p-5">
                  <h3 className="font-semibold mb-1">Revenue Breakdown</h3>
                  <p className="text-xs text-gray-400 mb-4">Approved quotes & orders</p>
                  <div className="space-y-3">
                    <PLRow label="Installation Quotes" value={financial.revenue.installation}
                      count={financial.revenue.install_count} total={financial.revenue.gross} />
                    <PLRow label="Product Orders" value={financial.revenue.orders}
                      count={financial.revenue.order_count} total={financial.revenue.gross} />
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <PLRow label="Gross Revenue" value={financial.revenue.gross} total={financial.revenue.gross} bold />
                    </div>
                    <PLRow label="— Cost of Goods (COGS)" value={-financial.cogs} total={financial.revenue.gross} negative />
                    <div className="border-t border-[#EA9D13] pt-3 mt-1">
                      <PLRow label="Gross Profit" value={financial.profit.gross} total={financial.revenue.gross} bold
                        highlight={financial.profit.gross >= 0 ? 'green' : 'red'} />
                    </div>
                  </div>
                </div>

                {/* Expense breakdown */}
                <div className="card p-5">
                  <h3 className="font-semibold mb-1">Expense Breakdown</h3>
                  <p className="text-xs text-gray-400 mb-4">Operating expenses by category</p>
                  {financial.expenses.by_category.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center">No expenses in this period</p>
                  ) : (
                    <div className="space-y-2.5">
                      {financial.expenses.by_category.map(cat => {
                        const pct = financial.expenses.total > 0
                          ? (cat.total / financial.expenses.total) * 100 : 0
                        return (
                          <div key={cat.category}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700">{cat.label}</span>
                              <span className="font-semibold text-gray-900">{formatRWF(cat.total)}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full">
                              <div className="h-1.5 bg-[#EA9D13] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-xs text-gray-400 text-right mt-0.5">{pct.toFixed(1)}%</p>
                          </div>
                        )
                      })}
                      <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold text-gray-900">
                        <span>Total OpEx</span>
                        <span>{formatRWF(financial.expenses.total)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly trend */}
              {financial.monthly_trend.length > 1 && (
                <div className="card p-5">
                  <h3 className="font-semibold mb-1">Monthly Trend</h3>
                  <p className="text-xs text-gray-400 mb-5">Revenue, expenses and net profit over period</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={financial.monthly_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatRWF(v)} width={90} />
                      <Tooltip
                        formatter={(v: number, name: string) => {
                          const labels: Record<string, string> = {
                            revenue: 'Revenue', expenses: 'Expenses',
                            cogs: 'COGS', net_profit: 'Net Profit',
                          }
                          return [formatRWF(v), labels[name] ?? name]
                        }}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                      />
                      <Legend formatter={(v: string) => ({ revenue: 'Revenue', expenses: 'Expenses', cogs: 'COGS', net_profit: 'Net Profit' } as Record<string, string>)[v] ?? v} />
                      <Bar dataKey="revenue"    fill="#091928" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="expenses"   fill="#EA9D13" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="net_profit" fill="#15803D" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Bottom P&L summary */}
              <div className="card p-5">
                <h3 className="font-semibold mb-4">Profit &amp; Loss Summary</h3>
                <div className="space-y-2">
                  <PLRow label="Gross Revenue" value={financial.revenue.gross} total={financial.revenue.gross} bold />
                  <PLRow label="— COGS" value={-financial.cogs} total={financial.revenue.gross} negative />
                  <PLRow label="Gross Profit" value={financial.profit.gross} total={financial.revenue.gross}
                    bold highlight={financial.profit.gross >= 0 ? 'green' : 'red'} />
                  <PLRow label="— Total Expenses" value={-financial.expenses.total} total={financial.revenue.gross} negative />
                  <div className="border-t-2 border-[#EA9D13] pt-3 mt-2">
                    <PLRow label="Net Profit / (Loss)" value={financial.profit.net} total={financial.revenue.gross}
                      bold highlight={financial.profit.net >= 0 ? 'green' : 'red'} large />
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
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

function KpiCard({ label, value, sub, icon, color }: {
  readonly label: string
  readonly value: string
  readonly sub: string
  readonly icon: React.ReactNode
  readonly color: 'blue' | 'amber' | 'green' | 'red'
}) {
  const colorMap = {
    blue:  'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-700',
    red:   'bg-red-50 text-red-600',
  }
  return (
    <div className="card p-4">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colorMap[color]}`}>{icon}</div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5 leading-tight">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

function PLRow({ label, value, count, total, bold, negative, highlight, large }: {
  readonly label: string
  readonly value: number
  readonly count?: number
  readonly total: number
  readonly bold?: boolean
  readonly negative?: boolean
  readonly highlight?: 'green' | 'red'
  readonly large?: boolean
}) {
  const pct = total > 0 ? Math.abs(value / total) * 100 : 0
  const valueColor = highlight === 'green' ? 'text-green-700'
    : highlight === 'red' ? 'text-red-600'
    : negative ? 'text-red-500'
    : 'text-gray-900'
  return (
    <div className={`flex items-center gap-2 ${bold ? '' : 'pl-2'}`}>
      <span className={`flex-1 text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'} ${large ? 'text-base' : ''}`}>
        {label}
        {count !== undefined && <span className="ml-2 text-xs text-gray-400">({count})</span>}
      </span>
      <span className={`text-sm font-${bold ? 'bold' : 'medium'} tabular-nums ${valueColor} ${large ? 'text-base' : ''}`}>
        {value < 0 ? `(${formatRWF(Math.abs(value))})` : formatRWF(value)}
      </span>
      {!bold && total > 0 && (
        <span className="text-xs text-gray-400 w-12 text-right tabular-nums">{pct.toFixed(1)}%</span>
      )}
    </div>
  )
}
