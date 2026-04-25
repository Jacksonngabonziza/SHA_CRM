'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '@/lib/api'
import { Product } from '@/types'
import { formatRWF, cn } from '@/lib/utils'
import { Plus, Edit, Trash2, Zap, Battery, Sun, Package, Loader2, CheckCircle, XCircle, Fuel } from 'lucide-react'
import toast from 'react-hot-toast'
import ProductFormModal from '@/components/products/ProductFormModal'

const CATEGORIES = [
  { key: '',          label: 'All',        icon: Package  },
  { key: 'panel',     label: 'Panels',     icon: Sun      },
  { key: 'battery',   label: 'Batteries',  icon: Battery  },
  { key: 'inverter',  label: 'Inverters',  icon: Zap      },
  { key: 'generator', label: 'Generators', icon: Fuel     },
  { key: 'accessory', label: 'Accessories',icon: Package  },
]

export default function ProductsPage() {
  const qc = useQueryClient()
  const [category, setCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['products', category],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (category) params.category = category
      return (await productsApi.list(params)).data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product removed')
    },
    onError: () => toast.error('Failed to remove product'),
  })

  const toggleStock = useMutation({
    mutationFn: ({ id, in_stock }: { id: number; in_stock: boolean }) =>
      productsApi.patch(id, { in_stock }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const products: Product[] = data?.results || data || []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1>Product Catalogue</h1>
          <p className="text-sm text-gray-500 mt-1">
            {products.length} products · Used by the smart quote engine
          </p>
        </div>
        <button onClick={() => { setEditProduct(null); setShowModal(true) }} className="btn-primary">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
        {CATEGORIES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0',
              category === key
                ? 'bg-[#091928] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-gray-400 mb-3">No products yet</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
            <Plus size={16} /> Add first product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="card p-5 flex flex-col gap-3">
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {p.category === 'panel'     && <Sun     size={18} className="text-[#EA9D13]" />}
                  {p.category === 'battery'   && <Battery size={18} className="text-[#71AA1F]" />}
                  {p.category === 'inverter'  && <Zap     size={18} className="text-blue-500"  />}
                  {p.category === 'generator' && <Fuel    size={18} className="text-orange-500"/>}
                  {p.category === 'accessory' && <Package size={18} className="text-gray-400"  />}
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {p.category_display}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleStock.mutate({ id: p.id, in_stock: !p.in_stock })}
                    title={p.in_stock ? 'Mark out of stock' : 'Mark in stock'}
                    className={cn('transition-colors', p.in_stock ? 'text-green-500' : 'text-gray-300')}
                  >
                    {p.in_stock ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  </button>
                  <button
                    onClick={() => { setEditProduct(p); setShowModal(true) }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Remove ${p.name}?`)) deleteMutation.mutate(p.id) }}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Product image + info */}
              <div className="flex items-start gap-3">
                {p.image ? (
                  <img src={p.image} alt={p.name}
                    className="w-14 h-14 rounded-lg object-cover border border-gray-100 shrink-0" />
                ) : null}
                <div>
                  <p className="font-semibold text-gray-900">{p.brand} {p.model}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{p.name}</p>
                </div>
              </div>

              {/* Spec badge */}
              <div className="flex items-center gap-2">
                <span className="bg-[#091928] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {p.display_spec}
                </span>
                <span className="text-xs text-gray-400">{p.warranty_years}yr warranty</span>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div>
                  <p className="text-lg font-bold text-[#EA9D13]">{formatRWF(p.price_rwf)}</p>
                  {p.price_usd && <p className="text-xs text-gray-400">${p.price_usd}</p>}
                </div>
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  p.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                )}>
                  {p.in_stock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ProductFormModal
          product={editProduct}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            qc.invalidateQueries({ queryKey: ['products'] })
          }}
        />
      )}
    </div>
  )
}
