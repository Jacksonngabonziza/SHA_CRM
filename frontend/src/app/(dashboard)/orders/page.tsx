'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '@/lib/api'
import { Quote } from '@/types'
import { formatRWF, formatDate, STATUS_COLORS, cn } from '@/lib/utils'
import { Plus, Search, FileText, Loader2, ExternalLink, Download, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

const STATUSES = ['', 'draft', 'sent', 'approved', 'rejected', 'expired']
const STATUS_LABELS: Record<string, string> = {
  '': 'All', draft: 'Draft', sent: 'Sent',
  approved: 'Approved', rejected: 'Rejected', expired: 'Expired',
}

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['orders', search, status],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (status) params.status = status
      return (await ordersApi.list(params)).data
    },
  })

  const orders: Quote[] = data?.results ?? data ?? []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1>Product Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{orders.length} total orders</p>
        </div>
        <Link href="/orders/new" className="btn-primary">
          <Plus size={16} /> New Order
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ref, client name, phone..."
            className="input pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                status === s ? 'bg-[#091928] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 mb-2">No product orders yet</p>
            <Link href="/orders/new" className="btn-primary mx-auto w-fit">
              <Plus size={16} /> Create first order
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Reference', 'Client', 'Items', 'Total Price', 'Status', 'Valid Until', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/orders/${o.id}`} className="font-mono text-sm font-semibold text-[#091928] hover:text-[#EA9D13]">
                        {o.ref_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/clients/${o.client}`}>
                        <p className="text-sm font-medium text-gray-900 hover:text-[#EA9D13]">{o.client_name}</p>
                        <p className="text-xs text-gray-400">{o.client_phone}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-gray-700">
                        {o.line_items?.length ?? 0} item{(o.line_items?.length ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-bold text-gray-900">{formatRWF(o.total_price_rwf)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('badge', STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600')}>
                        {o.status_display}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{formatDate(o.valid_until)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/orders/${o.id}`}
                          className="p-1.5 text-gray-400 hover:text-[#091928] hover:bg-gray-100 rounded transition-colors" title="View">
                          <ExternalLink size={15} />
                        </Link>
                        <a href={ordersApi.pdfUrl(o.id)} target="_blank" rel="noreferrer"
                          className="p-1.5 text-gray-400 hover:text-[#EA9D13] hover:bg-amber-50 rounded transition-colors" title="Download PDF">
                          <Download size={15} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
