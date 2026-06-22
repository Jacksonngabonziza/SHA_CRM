'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { ordersApi, paymentsApi, downloadCsv } from '@/lib/api'
import { Quote, PaymentSummary, QuoteStatus } from '@/types'
import { formatRWF, formatDate, STATUS_COLORS, cn } from '@/lib/utils'
import {
  ArrowLeft, Download, Loader2, Mail, MessageCircle, X,
  CreditCard, ShoppingCart, Package, FileText, Copy, Pencil, Printer,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const ORDER_STATUSES: QuoteStatus[] = ['draft', 'sent', 'approved', 'rejected', 'expired']

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const numId = Number(id)
  const qc = useQueryClient()

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailOverride, setEmailOverride] = useState('')

  const { data: order, isLoading } = useQuery<Quote>({
    queryKey: ['order', id],
    queryFn: async () => (await ordersApi.get(numId)).data,
  })

  const { data: paymentSummary } = useQuery<PaymentSummary>({
    queryKey: ['payment-summary-order', numId],
    queryFn: async () => (await paymentsApi.quoteSummary(numId)).data,
    enabled: order !== undefined,
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => ordersApi.updateStatus(numId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Status updated')
    },
  })

  const emailMutation = useMutation({
    mutationFn: (email?: string) => ordersApi.email(numId, email),
    onSuccess: () => {
      setShowEmailModal(false)
      setEmailOverride('')
      toast.success('Order emailed to client')
    },
    onError: () => toast.error('Failed to send email'),
  })

  const whatsappMutation = useMutation({
    mutationFn: () => ordersApi.whatsapp(numId),
    onSuccess: ({ data }) => globalThis.open(data.whatsapp_url, '_blank'),
    onError: () => toast.error('Failed to generate WhatsApp link'),
  })

  const copyShareLink = () => {
    if (order?.share_url) {
      navigator.clipboard.writeText(order.share_url)
      toast.success('Share link copied!')
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-gray-400" />
    </div>
  )
  if (!order) return <div className="text-center py-20 text-gray-400">Order not found</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/orders" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 w-fit no-print">
        <ArrowLeft size={16} /> Back to Orders
      </Link>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <ShoppingCart size={18} className="text-[#EA9D13]" />
              <h1 className="font-mono text-xl font-bold text-[#091928]">{order.ref_number}</h1>
              <span className={cn('badge', STATUS_COLORS[order.status])}>{order.status_display}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
              <span>Client: <Link href={`/clients/${order.client}`} className="font-medium text-gray-800 hover:text-[#EA9D13]">{order.client_detail?.name}</Link></span>
              <span>Created: {formatDate(order.created_at)}</span>
              <span>Valid until: {order.valid_until ? formatDate(order.valid_until) : 'N/A'}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 justify-end no-print">
            {order.status === 'draft' && (
              <Link href={`/orders/new?edit=${numId}`} className="btn-outline text-sm">
                <Pencil size={15} /> Edit
              </Link>
            )}
            <button onClick={copyShareLink} className="btn-outline text-sm">
              <Copy size={15} /> Copy Link
            </button>
            <button onClick={() => setShowEmailModal(true)} className="btn-outline text-sm">
              <Mail size={15} /> Email
            </button>
            <button
              onClick={() => whatsappMutation.mutate()}
              disabled={whatsappMutation.isPending}
              className="btn-outline text-sm text-green-700 border-green-200 hover:bg-green-50"
            >
              {whatsappMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
              WhatsApp
            </button>
            <button
              onClick={() => downloadCsv(ordersApi.pdfUrl(numId), `Order-${order.ref_number}.pdf`).catch(() => toast.error('PDF download failed'))}
              className="btn-amber text-sm"
            >
              <Download size={15} /> PDF
            </button>
            <button onClick={() => globalThis.print()} className="btn-outline text-sm no-print">
              <Printer size={15} /> Print
            </button>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 no-print">
          {ORDER_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => statusMutation.mutate(s)}
              disabled={statusMutation.isPending}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                order.status === s ? 'bg-[#091928] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: summary banner + line items */}
        <div className="lg:col-span-2 space-y-5">

          {/* Navy summary banner */}
          <div className="bg-[#091928] rounded-xl p-5 text-white">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-4">Order Summary</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-xs text-white/40 mb-1">Items</p>
                <p className="font-bold text-[#EA9D13]">{order.line_items?.length ?? 0}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-xs text-white/40 mb-1">Order Total</p>
                <p className="font-bold text-[#EA9D13]">{formatRWF(order.total_price_rwf)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-xs text-white/40 mb-1">Valid Until</p>
                <p className="font-bold text-white/80 text-sm">{order.valid_until ? formatDate(order.valid_until) : '—'}</p>
              </div>
            </div>
          </div>

          {/* Line items table */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <Package size={16} className="text-[#EA9D13]" />
              <h3 className="font-semibold text-[#091928]">Products</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left w-10">#</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Description</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Qty</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Unit Price</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(order.line_items ?? []).map((item, i) => (
                  <tr key={item.id ?? i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{item.description}</p>
                      {item.product_detail && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.product_detail.category} · {item.product_detail.brand}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">{item.quantity}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{formatRWF(item.unit_price)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[#091928]">
                      {formatRWF(item.total ?? item.quantity * item.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-[#091928]">
                <tr>
                  <td colSpan={4} className="px-5 py-4 text-right font-bold text-[#091928]">Total</td>
                  <td className="px-5 py-4 text-right font-bold text-xl text-[#EA9D13]">
                    {formatRWF(order.total_price_rwf)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Client card */}
          <div className="card p-5">
            <p className="section-title">Client</p>
            <p className="font-semibold text-gray-800">{order.client_detail?.name}</p>
            <p className="text-sm text-gray-500">{order.client_detail?.phone}</p>
            {order.client_detail?.email && (
              <p className="text-sm text-gray-500">{order.client_detail.email}</p>
            )}
            {order.client_detail?.location && (
              <p className="text-sm text-gray-400 mt-0.5">{order.client_detail.location}</p>
            )}
            <Link href={`/clients/${order.client}`}
              className="text-xs text-[#EA9D13] hover:underline mt-2 inline-block">
              View client profile →
            </Link>
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
              <Link href="/payments" className="btn-outline w-full justify-center text-sm mt-3">
                <CreditCard size={14} /> Record Payment
              </Link>
            </div>
          )}

          {/* Send to client */}
          <div className="card p-5 no-print">
            <p className="section-title">Send to Client</p>
            <div className="space-y-2">
              <button onClick={copyShareLink} className="btn-outline w-full justify-center text-sm">
                <Copy size={14} /> Copy Share Link
              </button>
              <button onClick={() => setShowEmailModal(true)} className="btn-outline w-full justify-center text-sm">
                <Mail size={14} /> Send by Email
              </button>
              <button
                onClick={() => whatsappMutation.mutate()}
                disabled={whatsappMutation.isPending}
                className="btn-outline w-full justify-center text-sm text-green-700 border-green-200 hover:bg-green-50"
              >
                {whatsappMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                Share on WhatsApp
              </button>
              <button
                onClick={() => downloadCsv(ordersApi.pdfUrl(numId), `Order-${order.ref_number}.pdf`).catch(() => toast.error('PDF download failed'))}
                className="btn-amber w-full justify-center text-sm"
              >
                <FileText size={14} /> Download PDF
              </button>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="card p-5">
              <p className="section-title">Notes</p>
              <p className="text-sm text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Email modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Email Order to Client</h2>
              <button onClick={() => { setShowEmailModal(false); setEmailOverride('') }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              The order PDF will be attached and sent to the client. Leave blank to use the client&apos;s email on file
              {order.client_detail?.email ? ` (${order.client_detail.email})` : ''}.
            </p>
            <div className="space-y-3">
              <div>
                <label htmlFor="email-override" className="label">Email address (optional)</label>
                <input
                  id="email-override"
                  type="email"
                  value={emailOverride}
                  onChange={e => setEmailOverride(e.target.value)}
                  placeholder={order.client_detail?.email || 'client@example.com'}
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
    </div>
  )
}
