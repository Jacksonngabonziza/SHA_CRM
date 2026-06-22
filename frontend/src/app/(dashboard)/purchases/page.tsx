'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { purchasesApi, purchaseOrderPdfUrl, downloadCsv } from '@/lib/api'
import { PurchaseOrder, PurchaseOrderStatus, Supplier } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import {
  ShoppingBag, Plus, X, Loader2, Check, Trash2, Package, ChevronDown, ChevronUp, FileDown
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  draft:     'bg-gray-100 text-gray-600',
  ordered:   'bg-blue-100 text-blue-700',
  received:  'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

function formatRWF(v: number) {
  return `RWF ${Number(v).toLocaleString()}`
}

export default function PurchasesPage() {
  const qc = useQueryClient()
  const [showPOForm, setShowPOForm]       = useState(false)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [expandedId, setExpandedId]       = useState<number | null>(null)
  const [statusFilter, setStatusFilter]   = useState('')

  const { data: posData, isLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: async () => (await purchasesApi.list(statusFilter ? { status: statusFilter } : undefined)).data,
  })

  const orders: PurchaseOrder[] = posData?.results ?? posData ?? []

  const receiveMutation = useMutation({
    mutationFn: (id: number) => purchasesApi.receive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['products-list'] })
      toast.success('Order received — stock updated')
    },
    onError: () => toast.error('Failed to mark received'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchasesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1 className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#EA9D13]" /> Purchase Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage supplier orders and restock inventory</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSupplierForm(true)} className="btn-outline">Manage Suppliers</button>
          <button onClick={() => setShowPOForm(true)} className="btn-primary">
            <Plus size={16} /> New Purchase Order
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['', 'draft', 'ordered', 'received', 'cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              statusFilter === s ? 'bg-[#091928] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" /></div>}
        {!isLoading && orders.length === 0 && (
          <div className="card text-center py-12 text-gray-400">No purchase orders yet</div>
        )}
        {orders.map(po => (
          <div key={po.id} className="card overflow-hidden">
            {/* Header row */}
            <div
              className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedId(expandedId === po.id ? null : po.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#091928]">{po.supplier_name}</p>
                  <span className={cn('badge', STATUS_COLORS[po.status])}>{po.status_display}</span>
                  {po.ref_number && <span className="text-xs text-gray-400">#{po.ref_number}</span>}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  Ordered: {formatDate(po.order_date)}
                  {po.received_date ? ` · Received: ${formatDate(po.received_date)}` : ''}
                  {' · '}{po.items.length} item{po.items.length !== 1 ? 's' : ''}
                </p>
              </div>
              <p className="font-bold text-lg text-[#091928]">{formatRWF(po.total_cost_rwf)}</p>
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={e => { e.stopPropagation(); downloadCsv(purchaseOrderPdfUrl(po.id), `PO-${String(po.id).padStart(5,'0')}_${po.supplier_name}.pdf`) }}
                  title="Download PDF"
                  className="p-1.5 text-gray-400 hover:text-[#091928] rounded transition-colors"
                >
                  <FileDown size={15} />
                </button>
                {po.status === 'ordered' && (
                  <button
                    onClick={e => { e.stopPropagation(); receiveMutation.mutate(po.id) }}
                    disabled={receiveMutation.isPending}
                    className="btn-outline text-xs py-1.5 px-3 text-green-700 border-green-200 hover:bg-green-50"
                  >
                    {receiveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Mark Received
                  </button>
                )}
                {po.status === 'draft' && (
                  <button
                    onClick={e => { e.stopPropagation(); if (globalThis.confirm('Delete this PO?')) deleteMutation.mutate(po.id) }}
                    className="p-1.5 text-gray-300 hover:text-red-500 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                {expandedId === po.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>

            {/* Expanded items */}
            {expandedId === po.id && (
              <div className="border-t bg-gray-50">
                {po.items.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-4">No items added</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-white">
                        <th className="px-5 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                        <th className="px-5 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                        <th className="px-5 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Unit Cost</th>
                        <th className="px-5 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {po.items.map(item => (
                        <tr key={item.id} className="hover:bg-gray-100 transition-colors">
                          <td className="px-5 py-2 font-medium text-gray-800">
                            {item.product_brand} {item.product_model}
                            <span className="text-xs text-gray-400 ml-1">({item.product_name})</span>
                          </td>
                          <td className="px-5 py-2 text-right text-gray-700">{item.quantity}</td>
                          <td className="px-5 py-2 text-right text-gray-700">{formatRWF(item.unit_cost_rwf)}</td>
                          <td className="px-5 py-2 text-right font-semibold text-[#091928]">{formatRWF(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {po.notes && (
                  <p className="px-5 py-3 text-xs text-gray-500 border-t">Notes: {po.notes}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showPOForm && (
        <NewPOModal
          onClose={() => setShowPOForm(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); setShowPOForm(false) }}
        />
      )}

      {showSupplierForm && (
        <SupplierModal onClose={() => setShowSupplierForm(false)} />
      )}
    </div>
  )
}

function NewPOModal({ onClose, onSaved }: { readonly onClose: () => void; readonly onSaved: () => void }) {
  const [supplierId, setSupplierId] = useState('')
  const [refNumber, setRefNumber]   = useState('')
  const [orderDate, setOrderDate]   = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes]           = useState('')
  const [items, setItems]           = useState<{ product: string; quantity: string; unit_cost_rwf: string }[]>([
    { product: '', quantity: '1', unit_cost_rwf: '' },
  ])

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await purchasesApi.suppliers.list()).data,
  })
  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => (await import('@/lib/api').then(m => m.productsApi.list({ page_size: '200' }))).data,
  })

  const suppliers: Supplier[] = suppliersData?.results ?? suppliersData ?? []
  const products = productsData?.results ?? productsData ?? []

  const mutation = useMutation({
    mutationFn: async () => {
      const po = await purchasesApi.create({
        supplier: Number(supplierId), ref_number: refNumber,
        order_date: orderDate, status: 'ordered', notes,
      })
      const poId = po.data.id
      await Promise.all(items
        .filter(it => it.product && it.quantity && it.unit_cost_rwf)
        .map(it => purchasesApi.addItem(poId, {
          product: Number(it.product),
          quantity: Number(it.quantity),
          unit_cost_rwf: Number(it.unit_cost_rwf),
        }))
      )
      return po
    },
    onSuccess: () => { toast.success('Purchase order created'); onSaved() },
    onError: () => toast.error('Failed to create purchase order'),
  })

  const addItem = () => setItems(prev => [...prev, { product: '', quantity: '1', unit_cost_rwf: '' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const setItemField = (i: number, field: string, val: string) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">New Purchase Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="po-supplier" className="label">Supplier *</label>
              <select id="po-supplier" className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">— Select supplier —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="po-date" className="label">Order Date</label>
              <input id="po-date" type="date" className="input" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="po-ref" className="label">Supplier Reference #</label>
            <input id="po-ref" className="input" value={refNumber} onChange={e => setRefNumber(e.target.value)} placeholder="Optional" />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="section-title mb-0">Items</p>
              <button onClick={addItem} className="btn-outline text-xs py-1 px-2"><Plus size={13} /> Add Item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl p-3">
                  <div className="col-span-5">
                    <select className="input text-sm" value={item.product} onChange={e => setItemField(i, 'product', e.target.value)}>
                      <option value="">— Pick product —</option>
                      {products.map((p: { id: number; brand: string; model: string }) => (
                        <option key={p.id} value={p.id}>{p.brand} {p.model}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" min={1} className="input text-sm text-right" placeholder="Qty"
                      value={item.quantity} onChange={e => setItemField(i, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-4">
                    <input type="number" min={0} className="input text-sm text-right" placeholder="Unit cost RWF"
                      value={item.unit_cost_rwf} onChange={e => setItemField(i, 'unit_cost_rwf', e.target.value)} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="po-notes" className="label">Notes</label>
            <textarea id="po-notes" className="input resize-none text-sm" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="p-6 border-t flex gap-2">
          <button onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !supplierId}
            className="btn-primary flex-1 justify-center"
          >
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
            Create Order
          </button>
        </div>
      </div>
    </div>
  )
}

function SupplierModal({ onClose }: { readonly onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName]               = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone]             = useState('')
  const [email, setEmail]             = useState('')

  const { data } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await purchasesApi.suppliers.list()).data,
  })
  const suppliers: Supplier[] = data?.results ?? data ?? []

  const createMutation = useMutation({
    mutationFn: () => purchasesApi.suppliers.create({ name, contact_name: contactName, phone, email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier added')
      setName(''); setContactName(''); setPhone(''); setEmail('')
    },
    onError: () => toast.error('Failed to add supplier'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchasesApi.suppliers.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Supplier removed') },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Manage Suppliers</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Existing suppliers */}
        <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
          {suppliers.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No suppliers yet</p>}
          {suppliers.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{s.name}</p>
                {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
              </div>
              <button
                onClick={() => { if (globalThis.confirm('Remove supplier?')) deleteMutation.mutate(s.id) }}
                className="p-1 text-gray-300 hover:text-red-500 rounded"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Add new */}
        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Add Supplier</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sup-name" className="label">Company Name *</label>
              <input id="sup-name" className="input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="sup-contact" className="label">Contact Person</label>
              <input id="sup-contact" className="input" value={contactName} onChange={e => setContactName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="sup-phone" className="label">Phone</label>
              <input id="sup-phone" className="input" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label htmlFor="sup-email" className="label">Email</label>
              <input id="sup-email" type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name}
            className="btn-primary w-full justify-center"
          >
            {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add Supplier
          </button>
        </div>
      </div>
    </div>
  )
}
