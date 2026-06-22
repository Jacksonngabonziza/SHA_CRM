'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ordersApi, clientsApi, productsApi } from '@/lib/api'
import { Client, Product, QuoteLineItem } from '@/types'
import { formatRWF } from '@/lib/utils'
import { Plus, Trash2, Loader2, ShoppingCart, ArrowLeft, Package } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

type OrderItem = QuoteLineItem & { _key: number }
let _counter = 0
const emptyItem = (): OrderItem => ({
  _key: ++_counter, product: null, description: '', quantity: 1, unit_price: 0,
})

export default function NewOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit') ? Number(searchParams.get('edit')) : null

  const [clientId, setClientId] = useState<number | ''>('')
  const [items, setItems] = useState<OrderItem[]>([emptyItem()])
  const [notes, setNotes] = useState('')
  const [validDays, setValidDays] = useState(30)
  const [initialized, setInitialized] = useState(false)

  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => (await clientsApi.list({ page_size: '200' })).data,
  })
  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => (await productsApi.list({ page_size: '200' })).data,
  })
  const { data: existingOrder } = useQuery({
    queryKey: ['order', editId],
    queryFn: async () => (await ordersApi.get(Number(editId))).data,
    enabled: editId !== null,
  })

  useEffect(() => {
    if (existingOrder && !initialized) {
      setClientId(existingOrder.client as number)
      setNotes(existingOrder.notes ?? '')
      setValidDays(existingOrder.valid_days ?? 30)
      if (existingOrder.line_items?.length) {
        setItems(existingOrder.line_items.map((item: QuoteLineItem) => ({ ...item, _key: ++_counter })))
      }
      setInitialized(true)
    }
  }, [existingOrder, initialized])

  const clients: Client[] = clientsData?.results ?? clientsData ?? []
  const products: Product[] = productsData?.results ?? productsData ?? []

  const total = items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0)

  const setItem = useCallback((index: number, patch: Partial<OrderItem>) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it))
  }, [])

  const pickProduct = (index: number, productId: number) => {
    const p = products.find(p => p.id === productId)
    if (!p) return
    setItem(index, { product: p.id, description: `${p.brand} ${p.model}`, unit_price: p.price_rwf })
  }

  const addItem = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))

  const payload = () => ({
    client: clientId,
    line_items: items.map(it => ({
      product: it.product ?? null,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
    })),
    notes,
    valid_days: validDays,
    total_price_rwf: total,
  })

  const mutation = useMutation({
    mutationFn: () => editId
      ? ordersApi.update(editId, payload())
      : ordersApi.create(payload()),
    onSuccess: (res) => {
      toast.success(editId ? 'Order updated' : 'Order created')
      router.push(`/orders/${editId ?? res.data.id}`)
    },
    onError: () => toast.error(editId ? 'Failed to update order' : 'Failed to create order'),
  })

  const canSubmit = clientId && items.every(it => it.description && it.quantity > 0 && it.unit_price > 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href={editId ? `/orders/${editId}` : '/orders'}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 w-fit">
        <ArrowLeft size={16} /> {editId ? 'Back to Order' : 'Back to Orders'}
      </Link>

      <div className="page-header">
        <h1 className="flex items-center gap-2">
          <ShoppingCart size={20} className="text-[#EA9D13]" />
          {editId ? 'Edit Product Order' : 'New Product Order'}
        </h1>
      </div>

      {/* Client */}
      <div className="card p-6 space-y-4">
        <p className="section-title">Client</p>
        <div>
          <label htmlFor="client-select" className="label">Select client *</label>
          <select id="client-select" className="input" value={clientId} onChange={e => setClientId(Number(e.target.value))}>
            <option value="">Choose a client...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Line items */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-[#EA9D13]" />
            <p className="section-title mb-0">Products *</p>
          </div>
          <button onClick={addItem} className="btn-outline text-xs py-1.5 px-3">
            <Plus size={13} /> Add Item
          </button>
        </div>

        <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
          <span className="col-span-4">Description</span>
          <span className="col-span-3">Pick from catalogue</span>
          <span className="col-span-2 text-right">Qty</span>
          <span className="col-span-2 text-right">Unit Price (RWF)</span>
          <span className="col-span-1" />
        </div>

        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item._key} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl p-3">
              <div className="col-span-4">
                <input className="input text-sm" placeholder="e.g. Victron MPPT 100/30"
                  value={item.description}
                  onChange={e => setItem(i, { description: e.target.value })} />
              </div>
              <div className="col-span-3">
                <select className="input text-sm" value={item.product ?? ''}
                  onChange={e => { if (e.target.value) pickProduct(i, Number(e.target.value)) }}>
                  <option value="">— or pick product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.brand} {p.model} ({formatRWF(p.price_rwf)})</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <input type="number" min={1} className="input text-sm text-right"
                  value={item.quantity}
                  onChange={e => setItem(i, { quantity: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <input type="number" min={0} className="input text-sm text-right"
                  value={item.unit_price}
                  onChange={e => setItem(i, { unit_price: Number(e.target.value) })} />
              </div>
              <div className="col-span-1 flex justify-end">
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="col-span-11 text-right text-xs text-gray-400 -mt-1 pr-1">
                Subtotal: <span className="font-semibold text-[#091928]">{formatRWF(item.quantity * item.unit_price)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <div className="bg-[#091928] text-white rounded-xl px-8 py-4">
            <span className="text-sm text-white/60 mr-4">Order Total</span>
            <span className="text-2xl font-bold text-[#EA9D13]">{formatRWF(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes & validity */}
      <div className="card p-6 space-y-4">
        <p className="section-title">Additional Details</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="order-notes" className="label">Notes (visible to client)</label>
            <textarea id="order-notes" className="input" rows={3} value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Payment terms, delivery info, etc." />
          </div>
          <div>
            <label htmlFor="valid-days" className="label">Valid for (days)</label>
            <input id="valid-days" type="number" min={1} max={365} className="input"
              value={validDays} onChange={e => setValidDays(Number(e.target.value))} />
            <p className="text-xs text-gray-400 mt-1">Order expires after this many days</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pb-8">
        <Link href={editId ? `/orders/${editId}` : '/orders'} className="btn-outline">Cancel</Link>
        <button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending} className="btn-primary">
          {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
          {editId ? 'Save Changes' : 'Create Order'}
        </button>
      </div>
    </div>
  )
}
