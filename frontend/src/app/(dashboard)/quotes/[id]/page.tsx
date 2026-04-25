'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { quotesApi, paymentsApi, installationsApi, downloadCsv } from '@/lib/api'
import { Quote, PaymentSummary } from '@/types'
import { formatRWF, formatDate, STATUS_COLORS, cn } from '@/lib/utils'
import {
  ArrowLeft, Download, CheckCircle,
  XCircle, Sun, Battery, Zap, Loader2, Copy,
  Mail, MessageCircle, GitBranch, X, CreditCard, Wrench, Cpu, Printer, Pencil
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const QUOTE_STATUSES = ['draft', 'sent', 'approved', 'rejected', 'expired']

export default function QuoteDetailPage({ params }: { readonly params: { id: string } }) {
  const qc = useQueryClient()
  const router = useRouter()
  const id = Number.parseInt(params.id)

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailOverride, setEmailOverride] = useState('')
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')

  const { data: quote, isLoading } = useQuery<Quote>({
    queryKey: ['quote', id],
    queryFn: async () => (await quotesApi.get(id)).data,
  })

  const { data: paymentSummary } = useQuery<PaymentSummary>({
    queryKey: ['payment-summary', id],
    queryFn: async () => (await paymentsApi.quoteSummary(id)).data,
    enabled: !!quote,
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => quotesApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', id] })
      toast.success('Status updated')
    },
  })

  const emailMutation = useMutation({
    mutationFn: (email?: string) => quotesApi.email(id, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', id] })
      setShowEmailModal(false)
      setEmailOverride('')
      toast.success('Quote emailed to client')
    },
    onError: () => toast.error('Failed to send email'),
  })

  const whatsappMutation = useMutation({
    mutationFn: () => quotesApi.whatsapp(id),
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ['quote', id] })
      window.open(data.whatsapp_url, '_blank')
    },
    onError: () => toast.error('Failed to generate WhatsApp link'),
  })

  const versionMutation = useMutation({
    mutationFn: () => quotesApi.createVersion(id),
    onSuccess: ({ data }) => {
      toast.success(`New version ${data.ref_number} created`)
      router.push(`/quotes/${data.id}`)
    },
    onError: () => toast.error('Failed to create new version'),
  })

  const installMutation = useMutation({
    mutationFn: () => installationsApi.create({
      quote: id,
      client: quote!.client,
      scheduled_date: scheduledDate || null,
    }),
    onSuccess: ({ data }) => {
      setShowInstallModal(false)
      toast.success('Installation created')
      router.push(`/installations/${data.id}`)
    },
    onError: () => toast.error('Could not create installation — one may already exist for this quote'),
  })

  const copyShareLink = () => {
    if (quote?.share_url) {
      navigator.clipboard.writeText(quote.share_url)
      toast.success('Share link copied!')
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-gray-400" />
    </div>
  )
  if (!quote) return <div className="text-center py-20 text-gray-400">Quote not found</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/quotes" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 w-fit no-print">
        <ArrowLeft size={16} /> Back to Quotes
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-mono text-xl font-bold text-[#091928]">{quote.ref_number}</h1>
              <span className={cn('badge', STATUS_COLORS[quote.status])}>{quote.status_display}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
              <span>Client: <Link href={`/clients/${quote.client}`} className="font-medium text-gray-800 hover:text-[#EA9D13]">{quote.client_detail?.name}</Link></span>
              <span>Created: {formatDate(quote.created_at)}</span>
              <span>Valid until: {formatDate(quote.valid_until)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 justify-end no-print">
            {quote.status === 'draft' && (
              <Link href={`/quotes/new?edit=${id}`} className="btn-outline text-sm">
                <Pencil size={15} /> Edit
              </Link>
            )}
            <button onClick={copyShareLink} className="btn-outline text-sm" title="Copy share link">
              <Copy size={15} /> Copy Link
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              className="btn-outline text-sm"
              title="Email quote to client"
            >
              <Mail size={15} /> Email
            </button>
            <button
              onClick={() => whatsappMutation.mutate()}
              disabled={whatsappMutation.isPending}
              className="btn-outline text-sm text-green-700 border-green-200 hover:bg-green-50"
              title="Share via WhatsApp"
            >
              {whatsappMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
              WhatsApp
            </button>
            <button
              onClick={() => versionMutation.mutate()}
              disabled={versionMutation.isPending}
              className="btn-outline text-sm"
              title="Create a new version of this quote"
            >
              {versionMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <GitBranch size={15} />}
              New Version
            </button>
            {quote.status === 'approved' && (
              <button
                onClick={() => setShowInstallModal(true)}
                className="btn-green text-sm"
                title="Create installation job for this quote"
              >
                <Wrench size={15} /> Create Installation
              </button>
            )}
            <button
              onClick={() => downloadCsv(quotesApi.pdfUrl(id), `Quote-${quote.ref_number}.pdf`).catch(() => toast.error('PDF download failed'))}
              className="btn-amber text-sm"
            >
              <Download size={15} /> PDF
            </button>
            <button
              onClick={() => window.print()}
              className="btn-outline text-sm"
              title="Print this page"
            >
              <Printer size={15} /> Print
            </button>
          </div>
        </div>

        {/* Status update */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 no-print">
          {QUOTE_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => statusMutation.mutate(s)}
              disabled={statusMutation.isPending}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                quote.status === s ? 'bg-[#091928] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-5">

          {/* System overview */}
          <div className="bg-[#091928] rounded-xl p-5 text-white">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-4">System Overview</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'System Size', val: `${quote.system_size_kwp} kWp` },
                { label: 'Daily Load', val: `${quote.total_daily_kwh} kWh` },
                { label: 'Panels', val: `${quote.num_panels} pcs` },
                { label: 'Backup', val: `${quote.backup_hours}h` },
              ].map(({ label, val }) => (
                <div key={label} className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-xs text-white/40 mb-1">{label}</p>
                  <p className="font-bold text-[#EA9D13]">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Appliances */}
          {quote.appliances.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold mb-4">Load Summary</h3>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="text-left pb-2">Appliance</th>
                    <th className="text-center pb-2">Qty</th>
                    <th className="text-center pb-2">Watts</th>
                    <th className="text-center pb-2">Hrs/Day</th>
                    <th className="text-right pb-2">kWh/Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {quote.appliances.map((a) => (
                    <tr key={`${a.name}-${a.wattage}`}>
                      <td className="py-2 text-gray-700">{a.name}</td>
                      <td className="py-2 text-center text-gray-600">{a.quantity}</td>
                      <td className="py-2 text-center text-gray-600">{a.wattage}W</td>
                      <td className="py-2 text-center text-gray-600">{a.hours_per_day}h</td>
                      <td className="py-2 text-right font-medium text-[#EA9D13]">{a.daily_kwh?.toFixed(3)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-gray-200">
                    <td colSpan={4} className="pt-2 text-gray-700">Total</td>
                    <td className="pt-2 text-right text-[#EA9D13]">{quote.total_daily_kwh} kWh</td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* Components */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4">System Components</h3>
            <div className="space-y-3">
              {quote.panel_detail && (
                <CompRow icon={<Sun size={18} className="text-[#EA9D13]" />}
                  title="Solar Panels" brand={`${quote.panel_detail.brand} ${quote.panel_detail.model}`}
                  spec={`${quote.num_panels} × ${quote.panel_detail.wattage_wp}Wp`}
                  warranty={`${quote.panel_detail.warranty_years}yr`} price={quote.panels_cost} />
              )}
              {quote.generator_detail && (
                <CompRow icon={<Cpu size={18} className="text-purple-500" />}
                  title="All-in-One Generator" brand={`${quote.generator_detail.brand} ${quote.generator_detail.model}`}
                  spec={`${quote.generator_detail.power_kw}kW${quote.generator_detail.capacity_kwh ? ` · ${quote.generator_detail.capacity_kwh}kWh` : ''}`}
                  warranty={`${quote.generator_detail.warranty_years}yr`} price={quote.generator_cost} />
              )}
              {!quote.is_all_in_one_mode && quote.inverter_detail && (
                <CompRow icon={<Zap size={18} className="text-blue-500" />}
                  title={quote.num_inverters > 1 ? `Inverter ×${quote.num_inverters}` : 'Inverter'}
                  brand={`${quote.inverter_detail.brand} ${quote.inverter_detail.model}`}
                  spec={`${quote.num_inverters > 1 ? `${quote.num_inverters}× ` : ''}${quote.inverter_detail.power_kw ?? 0}kW${quote.num_inverters > 1 ? ` = ${quote.num_inverters * (quote.inverter_detail.power_kw ?? 0)}kW total` : ''}`}
                  warranty={`${quote.inverter_detail.warranty_years}yr`} price={quote.inverter_cost} />
              )}
              {!quote.is_all_in_one_mode && quote.battery_detail && (
                <CompRow icon={<Battery size={18} className="text-[#71AA1F]" />}
                  title={quote.num_batteries > 1 ? `Battery ×${quote.num_batteries}` : 'Battery'}
                  brand={`${quote.battery_detail.brand} ${quote.battery_detail.model}`}
                  spec={`${quote.num_batteries > 1 ? `${quote.num_batteries}× ` : ''}${quote.battery_detail.capacity_kwh ?? 0}kWh${quote.num_batteries > 1 ? ` = ${(quote.num_batteries * (quote.battery_detail.capacity_kwh ?? 0)).toFixed(1)}kWh total` : ''}`}
                  warranty={`${quote.battery_detail.warranty_years}yr`} price={quote.battery_cost} />
              )}
              <div className="flex justify-between text-sm py-2 border-t border-dashed border-gray-200">
                <span className="text-gray-500">Cables &amp; BOS</span>
                <span className="font-medium">{formatRWF(quote.accessories_cost)}</span>
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-gray-500">Installation</span>
                <span className="font-medium">{formatRWF(quote.installation_cost)}</span>
              </div>
              <div className="flex justify-between font-bold text-base py-3 border-t-2 border-gray-900">
                <span>Total Investment</span>
                <span className="text-[#EA9D13] text-xl">{formatRWF(quote.total_price_rwf)}</span>
              </div>
            </div>
          </div>

          {/* Client feedback */}
          {quote.feedback && quote.feedback.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold mb-4">Client Feedback</h3>
              {quote.feedback.map(f => {
                let feedbackClass = 'bg-gray-50 border-gray-200'
                if (f.status === 'approved') feedbackClass = 'bg-green-50 border-green-200'
                else if (f.status === 'rejected') feedbackClass = 'bg-red-50 border-red-200'
                return (
                <div key={f.id} className={cn('p-4 rounded-xl border', feedbackClass)}>
                  <div className="flex items-center gap-2 mb-2">
                    {f.status === 'approved' && <CheckCircle size={16} className="text-green-600" />}
                    {f.status === 'rejected' && <XCircle size={16} className="text-red-500" />}
                    <span className="text-sm font-medium">{f.status_display}</span>
                    <span className="text-xs text-gray-400 ml-auto">{formatDate(f.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{f.message}</p>
                </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* ROI */}
          <div className="card p-5 bg-green-50 border-green-200">
            <p className="section-title text-green-700">Return on Investment</p>
            <div className="space-y-3 mt-2">
              <div>
                <p className="text-xs text-green-600">Annual savings</p>
                <p className="text-xl font-bold text-green-800">{formatRWF(quote.annual_savings_rwf)}</p>
              </div>
              <div>
                <p className="text-xs text-green-600">Payback period</p>
                <p className="text-xl font-bold text-green-800">{quote.payback_years} years</p>
              </div>
            </div>
          </div>

          {/* Share */}
          <div className="card p-5 no-print">
            <p className="section-title">Share with Client</p>
            <p className="text-xs text-gray-500 mb-3">Client can view their quote and leave feedback via this link</p>
            <div className="space-y-2">
              <button onClick={copyShareLink} className="btn-outline w-full justify-center text-sm">
                <Copy size={14} /> Copy Link
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                className="btn-outline w-full justify-center text-sm"
              >
                <Mail size={14} /> Send by Email
              </button>
              <button
                onClick={() => whatsappMutation.mutate()}
                disabled={whatsappMutation.isPending}
                className="btn-outline w-full justify-center text-sm text-green-700 border-green-200 hover:bg-green-50"
              >
                {whatsappMutation.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <MessageCircle size={14} />}
                Share on WhatsApp
              </button>
            </div>
          </div>

          {/* Payment summary */}
          {paymentSummary && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="section-title mb-0">Payments</p>
                <Link href="/payments" className="text-xs text-[#EA9D13] hover:underline">Manage →</Link>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total price</span>
                  <span className="font-medium">{formatRWF(paymentSummary.total_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total paid</span>
                  <span className="font-medium text-green-700">{formatRWF(paymentSummary.total_paid)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                  <span className="font-semibold">Balance due</span>
                  <span className={paymentSummary.balance_due > 0 ? 'font-bold text-red-600' : 'font-bold text-green-600'}>
                    {paymentSummary.balance_due > 0 ? formatRWF(paymentSummary.balance_due) : 'Fully paid'}
                  </span>
                </div>
              </div>
              {paymentSummary.payments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                  {paymentSummary.payments.map(p => (
                    <div key={p.id} className="flex justify-between text-xs text-gray-500">
                      <span>{formatDate(p.payment_date)} · {p.payment_type_display}</span>
                      <span className="font-medium text-gray-700">{formatRWF(p.amount_rwf)}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/payments"
                className="btn-outline w-full justify-center text-sm mt-3"
              >
                <CreditCard size={14} /> Record Payment
              </Link>
            </div>
          )}

          {/* Notes */}
          {quote.notes && (
            <div className="card p-5">
              <p className="section-title">Notes</p>
              <p className="text-sm text-gray-600">{quote.notes}</p>
            </div>
          )}

          {quote.internal_notes && (
            <div className="card p-5 bg-amber-50 border-amber-200">
              <p className="section-title text-amber-700">Internal Notes</p>
              <p className="text-sm text-amber-800">{quote.internal_notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Email modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Email Quote to Client</h2>
              <button onClick={() => { setShowEmailModal(false); setEmailOverride('') }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              The quote PDF will be attached and sent to the client. Leave blank to use the client&apos;s email on file
              {quote.client_detail?.email ? ` (${quote.client_detail.email})` : ''}.
            </p>
            <div className="space-y-3">
              <div>
                <label htmlFor="email-override" className="label">Email address (optional)</label>
                <input
                  id="email-override"
                  type="email"
                  value={emailOverride}
                  onChange={e => setEmailOverride(e.target.value)}
                  placeholder={quote.client_detail?.email || 'client@example.com'}
                  className="input"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowEmailModal(false); setEmailOverride('') }}
                  className="btn-outline flex-1 justify-center"
                >
                  Cancel
                </button>
                <button
                  onClick={() => emailMutation.mutate(emailOverride || undefined)}
                  disabled={emailMutation.isPending}
                  className="btn-amber flex-1 justify-center"
                >
                  {emailMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create installation modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Create Installation</h2>
              <button onClick={() => setShowInstallModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              An installation job will be created for <strong>{quote.client_detail?.name}</strong> and linked to this quote.
            </p>
            <div className="space-y-3">
              <div>
                <label htmlFor="install-date" className="label">Scheduled Date (optional)</label>
                <input
                  id="install-date"
                  type="date"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="input"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowInstallModal(false)} className="btn-outline flex-1 justify-center">
                  Cancel
                </button>
                <button
                  onClick={() => installMutation.mutate()}
                  disabled={installMutation.isPending}
                  className="btn-green flex-1 justify-center"
                >
                  {installMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CompRow({ icon, title, brand, spec, warranty, price }: {
  readonly icon: React.ReactNode, readonly title: string, readonly brand: string,
  readonly spec: string, readonly warranty: string, readonly price: number
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">{icon}</div>
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <p className="text-sm font-semibold text-gray-800">{brand}</p>
          <p className="text-xs text-gray-400">{spec} · {warranty} warranty</p>
        </div>
      </div>
      <p className="text-sm font-bold text-gray-700">{formatRWF(price)}</p>
    </div>
  )
}
