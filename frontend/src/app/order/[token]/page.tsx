'use client'
import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '@/lib/api'
import { Quote } from '@/types'
import { formatRWF, formatDate } from '@/lib/utils'
import { Loader2, Package, CheckCircle, XCircle, Clock } from 'lucide-react'
import Image from 'next/image'

export default function SharedOrderPage({ params }: { params: { token: string } }) {
  const { token } = params

  const { data: order, isLoading, error } = useQuery<Quote>({
    queryKey: ['shared-order', token],
    queryFn: async () => (await ordersApi.shared(token)).data,
  })

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 size={28} className="animate-spin text-gray-400" />
    </div>
  )

  if (error || !order) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <XCircle size={32} className="text-gray-400" />
        </div>
        <p className="text-gray-700 font-semibold text-lg">Order not found</p>
        <p className="text-gray-400 text-sm mt-1">This link may have expired or is invalid.</p>
      </div>
    </div>
  )

  const statusConfig = {
    draft:    { label: 'Draft',    color: 'bg-gray-100 text-gray-600',   icon: Clock },
    sent:     { label: 'Sent',     color: 'bg-blue-100 text-blue-700',   icon: Clock },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700',     icon: XCircle },
    expired:  { label: 'Expired',  color: 'bg-amber-100 text-amber-700', icon: Clock },
  }
  const st = statusConfig[order.status as keyof typeof statusConfig] ?? statusConfig.sent
  const StatusIcon = st.icon

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top nav bar */}
      <div className="bg-[#091928] text-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-28 h-9">
              <Image src="/logo_sha.png" alt="SolarHope Africa" fill style={{ objectFit: 'contain', objectPosition: 'left' }} />
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-[#EA9D13]">{order.ref_number}</p>
            <p className="text-xs text-white/50">Product Order</p>
          </div>
        </div>
        <div className="h-1 bg-[#EA9D13]" />
        <div className="h-0.5 bg-[#71AA1F]" />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Greeting + status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hello, {order.client_detail?.name} 👋
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Here is your product order from SolarHope Africa.
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${st.color}`}>
            <StatusIcon size={14} />
            {st.label}
          </span>
        </div>

        {/* Order summary band */}
        <div className="bg-[#091928] rounded-2xl p-5 text-white">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Order Summary</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-white/40 mb-1">Reference</p>
              <p className="font-mono font-bold text-[#EA9D13] text-sm">{order.ref_number}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-white/40 mb-1">Order Total</p>
              <p className="font-bold text-[#EA9D13]">{formatRWF(order.total_price_rwf)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-white/40 mb-1">Valid Until</p>
              <p className="font-bold text-white/80 text-sm">
                {order.valid_until ? formatDate(order.valid_until) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Package size={18} className="text-[#EA9D13]" />
            <h2 className="font-semibold text-gray-900">Products &amp; Items</h2>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-10">#</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Qty</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Unit Price</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(order.line_items ?? []).map((item, i) => (
                  <tr key={item.id ?? i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{item.description}</p>
                      {item.product_detail && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.product_detail.brand} · {item.product_detail.category}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-gray-700">{item.quantity}</td>
                    <td className="px-5 py-4 text-right text-gray-600">{formatRWF(item.unit_price)}</td>
                    <td className="px-5 py-4 text-right font-semibold text-[#091928]">
                      {formatRWF(item.total ?? item.quantity * item.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[#091928] bg-amber-50">
                <tr>
                  <td colSpan={4} className="px-5 py-4 text-right font-bold text-gray-900">
                    Order Total
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-xl text-[#EA9D13]">
                    {formatRWF(order.total_price_rwf)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-gray-100">
            {(order.line_items ?? []).map((item, i) => (
              <div key={item.id ?? i} className="px-4 py-4">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-gray-900 text-sm flex-1 pr-3">{item.description}</p>
                  <p className="font-semibold text-[#091928] text-sm shrink-0">
                    {formatRWF(item.total ?? item.quantity * item.unit_price)}
                  </p>
                </div>
                <p className="text-xs text-gray-400">Qty: {item.quantity} × {formatRWF(item.unit_price)}</p>
              </div>
            ))}
            <div className="px-4 py-4 bg-amber-50 flex justify-between items-center border-t-2 border-[#091928]">
              <span className="font-bold text-gray-900">Order Total</span>
              <span className="font-bold text-xl text-[#EA9D13]">{formatRWF(order.total_price_rwf)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-2">Notes from SolarHope</h2>
            <p className="text-sm text-gray-600">{order.notes}</p>
          </div>
        )}

        {/* Contact CTA */}
        <div className="bg-[#091928] rounded-2xl p-6 text-center text-white">
          <p className="font-semibold text-lg mb-1">Questions about your order?</p>
          <p className="text-white/60 text-sm mb-4">Our team is here to help you.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:+250780348624"
              className="inline-flex items-center justify-center gap-2 bg-[#EA9D13] text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-amber-500 transition-colors"
            >
              Call Us
            </a>
            <a
              href="mailto:info@solarhopeafrica.com"
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white/80 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-white/5 transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 pb-6 border-t border-gray-200">
          <p className="text-sm font-semibold text-[#091928]">
            Solar<span className="text-[#71AA1F]">Hope</span>
            <span className="text-[#EA9D13]"> Africa</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">+250 780 348 624 · info@solarhopeafrica.com</p>
          <p className="text-xs text-gray-300 mt-1">Light Up Dreams, The Solar Way</p>
        </div>
      </div>
    </div>
  )
}
