'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentsApi, clientsApi, quotesApi, ordersApi, downloadCsv, paymentReceiptUrl } from '@/lib/api'
import { Payment, PaymentMethod, PaymentType } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { CreditCard, Loader2, Plus, X, Check, Clock, XCircle, Download, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  failed:    'bg-red-100 text-red-600',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:   <Clock size={13} />,
  confirmed: <Check size={13} />,
  failed:    <XCircle size={13} />,
}

const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'partial', label: 'Partial Payment' },
  { value: 'final',   label: 'Final Payment' },
  { value: 'full',    label: 'Full Payment' },
]

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',   label: 'Cash' },
  { value: 'momo',   label: 'Mobile Money' },
  { value: 'bank',   label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
]

type QuoteRow = { id: number; ref_number: string; total_price_rwf: number; status_display: string; _label: string }

function formatRWF(v: number) {
  return `RWF ${Number(v).toLocaleString()}`
}

export default function PaymentsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [quoteSearch, setQuoteSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => (await paymentsApi.list()).data,
  })

  const payments: Payment[] = data?.results ?? data ?? []

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => paymentsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      setShowForm(false)
      toast.success('Payment recorded')
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail || 'Failed to record payment')
    },
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      paymentsApi.patch(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      toast.success('Payment updated')
    },
    onError: () => toast.error('Failed to update payment'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => paymentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      toast.success('Payment deleted')
    },
    onError: () => toast.error('Failed to delete payment'),
  })

  const filteredPayments = quoteSearch
    ? payments.filter(p =>
        p.quote_ref?.toLowerCase().includes(quoteSearch.toLowerCase()) ||
        p.client_name?.toLowerCase().includes(quoteSearch.toLowerCase())
      )
    : payments

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p className="text-sm text-gray-500 mt-1">{payments.length} records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCsv(paymentsApi.exportUrl(), 'payments.csv').catch(() => toast.error('Export failed'))}
            className="btn-outline"
            title="Export CSV"
          >
            <Download size={16} /> Export
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} /> Record Payment
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        value={quoteSearch}
        onChange={e => setQuoteSearch(e.target.value)}
        placeholder="Filter by quote ref or client..."
        className="input max-w-sm"
      />

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        )}
        {!isLoading && filteredPayments.length === 0 && (
          <div className="text-center py-16">
            <CreditCard size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">No payments found</p>
          </div>
        )}
        {!isLoading && filteredPayments.length > 0 && (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Client', 'Quote', 'Amount', 'Type', 'Method', 'Date', 'Status', 'Balance Due', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPayments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.client_name}</td>
                  <td className="px-4 py-3 font-mono text-sm text-[#091928]">{p.quote_ref}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">{formatRWF(p.amount_rwf)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.payment_type_display}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.payment_method_display}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(p.payment_date)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('badge flex items-center gap-1 w-fit', STATUS_COLORS[p.status])}>
                      {STATUS_ICON[p.status]} {p.status_display}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {p.balance_due > 0
                      ? <span className="text-red-600 font-medium">{formatRWF(p.balance_due)}</span>
                      : <span className="text-green-600 font-medium">Paid</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {p.status === 'pending' && (
                        <button
                          onClick={() => patchMutation.mutate({ id: p.id, data: { status: 'confirmed' } })}
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          title="Confirm payment"
                        >
                          Confirm
                        </button>
                      )}
                      <button
                        onClick={() => downloadCsv(paymentReceiptUrl(p.id), `Receipt-${p.id}.pdf`).catch(() => toast.error('Failed to download receipt'))}
                        className="p-1.5 text-gray-400 hover:text-[#091928] rounded transition-colors"
                        title="Download receipt"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (globalThis.confirm('Delete this payment?')) deleteMutation.mutate(p.id)
                        }}
                        className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors"
                        title="Delete"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Record payment modal */}
      {showForm && (
        <PaymentFormModal
          onClose={() => setShowForm(false)}
          onSubmit={data => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  )
}

function PaymentFormModal({
  onClose, onSubmit, isLoading,
}: {
  readonly onClose: () => void
  readonly onSubmit: (data: Record<string, unknown>) => void
  readonly isLoading: boolean
}) {
  const [clientId, setClientId] = useState('')
  const [quoteId, setQuoteId] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<PaymentType>('deposit')
  const [method, setMethod] = useState<PaymentMethod>('momo')
  const [reference, setReference] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const { data: clientsData } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => (await clientsApi.list()).data,
  })
  const clients = clientsData?.results ?? clientsData ?? []

  // Fetch installation quotes for selected client
  const { data: clientQuotesData, isLoading: quotesLoading } = useQuery({
    queryKey: ['client-quotes', clientId],
    queryFn: async () => (await quotesApi.list({ client: clientId })).data,
    enabled: !!clientId,
  })
  // Fetch product orders for selected client
  const { data: clientOrdersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['client-orders-pay', clientId],
    queryFn: async () => (await ordersApi.list({ client: clientId })).data,
    enabled: !!clientId,
  })

  const installationQuotes: QuoteRow[] = (clientQuotesData?.results ?? clientQuotesData ?? [])
    .map((q: QuoteRow) => ({ ...q, _label: 'Quote' }))
  const productOrders: QuoteRow[] = (clientOrdersData?.results ?? clientOrdersData ?? [])
    .map((o: QuoteRow) => ({ ...o, _label: 'Order' }))
  const clientQuotes: QuoteRow[] = [...installationQuotes, ...productOrders]
  const anyLoading = quotesLoading || ordersLoading

  // Fetch payment summary for selected quote to show balance
  const { data: summary } = useQuery({
    queryKey: ['payment-summary', quoteId],
    queryFn: async () => (await paymentsApi.quoteSummary(Number(quoteId))).data,
    enabled: !!quoteId,
  })

  // When a quote is selected, pre-fill amount with outstanding balance
  const handleQuoteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setQuoteId(id)
    setAmount('')  // clear; will be filled once summary loads
  }

  // Once summary loads after quote selection, pre-fill amount with balance_due
  const balanceDue = summary?.balance_due ?? null
  const handleAmountFocus = () => {
    if (!amount && balanceDue !== null && balanceDue > 0) {
      setAmount(String(Math.round(balanceDue)))
    }
  }

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setClientId(e.target.value)
    setQuoteId('')
    setAmount('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quoteId || !clientId || !amount) {
      toast.error('Client, quote and amount are required')
      return
    }
    onSubmit({
      quote: Number(quoteId),
      client: Number(clientId),
      amount_rwf: Number(amount),
      payment_type: type,
      payment_method: method,
      reference,
      payment_date: paymentDate,
      notes,
      status: 'pending',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Record Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="space-y-4">

          {/* Step 1: Client */}
          <div>
            <label htmlFor="client-select" className="label">Client *</label>
            <select
              id="client-select"
              value={clientId}
              onChange={handleClientChange}
              className="input"
              required
            >
              <option value="">— Select client —</option>
              {clients.map((c: { id: number; name: string; phone: string }) => (
                <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
              ))}
            </select>
          </div>

          {/* Step 2: Quote (shown only after client selected) */}
          {clientId && (
            <div>
              <label htmlFor="quote-select" className="label">Quote *</label>
              {anyLoading && (
                <div className="input flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 size={14} className="animate-spin" /> Loading…
                </div>
              )}
              {!anyLoading && clientQuotes.length === 0 && (
                <p className="text-sm text-gray-400 py-2">No quotes or orders found for this client.</p>
              )}
              {!anyLoading && clientQuotes.length > 0 && (
                <select
                  id="quote-select"
                  value={quoteId}
                  onChange={handleQuoteChange}
                  className="input"
                  required
                >
                  <option value="">— Select quote or order —</option>
                  {clientQuotes.map(q => (
                    <option key={q.id} value={q.id}>
                      [{q._label}] {q.ref_number} · {formatRWF(q.total_price_rwf)} · {q.status_display}
                    </option>
                  ))}
                </select>
              )}
              {/* Balance hint */}
              {summary && (
                <p className={cn(
                  'text-xs mt-1',
                  summary.balance_due > 0 ? 'text-amber-600' : 'text-green-600'
                )}>
                  {summary.balance_due > 0
                    ? `Balance due: ${formatRWF(summary.balance_due)} of ${formatRWF(summary.total_price)}`
                    : 'Fully paid'}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="label">Amount (RWF) *</label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onFocus={handleAmountFocus}
                placeholder={balanceDue !== null && balanceDue > 0 ? `Balance: ${Math.round(balanceDue)}` : '0'}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="payment-date" className="label">Payment Date</label>
              <input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="payment-type" className="label">Payment Type</label>
              <select id="payment-type" value={type} onChange={e => setType(e.target.value as PaymentType)} className="input">
                {PAYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="payment-method" className="label">Method</label>
              <select id="payment-method" value={method} onChange={e => setMethod(e.target.value as PaymentMethod)} className="input">
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="reference" className="label">Reference / Transaction Code</label>
            <input
              id="reference"
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="MoMo code, bank ref..."
              className="input"
            />
          </div>

          <div>
            <label htmlFor="payment-notes" className="label">Notes</label>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input resize-none text-sm"
              rows={2}
            />
          </div>

        </div>{/* form fields */}
        </div>{/* scrollable area */}

        {/* Sticky footer buttons */}
        <div className="flex gap-2 p-4 sm:p-6 pt-3 border-t border-gray-100 shrink-0">
          <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !clientId || !quoteId}
            className="btn-amber flex-1 justify-center"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Record Payment
          </button>
        </div>
      </div>
    </div>
  )
}
