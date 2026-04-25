'use client'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { productsApi } from '@/lib/api'
import { Product } from '@/types'
import { X, Loader2, Upload, ImageOff } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props { product: Product | null; onClose: () => void; onSuccess: () => void }

export default function ProductFormModal({ product, onClose, onSuccess }: Props) {
  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: {
      name: '', brand: '', model: '', description: '',
      category: 'panel', price_rwf: '', price_usd: '',
      wattage_wp: '', panel_efficiency: '', capacity_kwh: '',
      voltage_v: '', battery_cycles: '', power_kw: '',
      inverter_type: '', phase: '', warranty_years: '5',
      linear_warranty_years: '', in_stock: true, stock_quantity: '0',
      is_all_in_one: false, min_panel_wp: '', max_panel_wp: '', max_pv_input_w: '',
    }
  })

  const category = watch('category')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    if (product) {
      reset({
        ...product,
        price_rwf: product.price_rwf?.toString() || '',
        price_usd: product.price_usd?.toString() || '',
        wattage_wp: product.wattage_wp?.toString() || '',
        panel_efficiency: product.panel_efficiency?.toString() || '',
        capacity_kwh: product.capacity_kwh?.toString() || '',
        voltage_v: product.voltage_v?.toString() || '',
        battery_cycles: product.battery_cycles?.toString() || '',
        power_kw: product.power_kw?.toString() || '',
        warranty_years: product.warranty_years?.toString() || '5',
        stock_quantity: product.stock_quantity?.toString() || '0',
        is_all_in_one: product.is_all_in_one ?? false,
        min_panel_wp: product.min_panel_wp?.toString() || '',
        max_panel_wp: product.max_panel_wp?.toString() || '',
        max_pv_input_w: product.max_pv_input_w?.toString() || '',
      } as never)
      setImagePreview(product.image || null)
    }
  }, [product, reset])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== '' && v !== null)
      )

      if (imageFile) {
        const fd = new FormData()
        Object.entries(cleaned).forEach(([k, v]) => fd.append(k, String(v)))
        fd.append('image', imageFile)
        return product
          ? productsApi.update(product.id, fd)
          : productsApi.create(fd)
      }

      return product ? productsApi.update(product.id, cleaned) : productsApi.create(cleaned)
    },
    onSuccess: () => {
      toast.success(product ? 'Product updated' : 'Product added')
      onSuccess()
    },
    onError: () => toast.error('Something went wrong'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Image upload */}
          <div>
            <label className="label">Product Image</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="Product" className="w-full h-full object-cover" />
                ) : (
                  <ImageOff size={24} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="product-image-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-outline text-sm py-2 flex items-center gap-2"
                >
                  <Upload size={15} />
                  {imagePreview ? 'Change image' : 'Upload image'}
                </button>
                {imageFile && (
                  <p className="text-xs text-gray-400 mt-1">{imageFile.name}</p>
                )}
                {imagePreview && !imageFile && (
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setImageFile(null) }}
                    className="text-xs text-red-500 hover:underline mt-1 block"
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <select {...register('category')} className="input">
                <option value="panel">Solar Panel</option>
                <option value="battery">Battery</option>
                <option value="inverter">Inverter</option>
                <option value="generator">All-in-One Generator</option>
                <option value="accessory">Accessory / BOS</option>
              </select>
            </div>
            <div>
              <label className="label">Brand *</label>
              <input {...register('brand', { required: true })} className="input" placeholder="e.g. AIKO, DEYE" />
            </div>
            <div>
              <label className="label">Model *</label>
              <input {...register('model', { required: true })} className="input" placeholder="Model number" />
            </div>
            <div>
              <label className="label">Display Name *</label>
              <input {...register('name', { required: true })} className="input" placeholder="Short name" />
            </div>

            {/* Panel fields */}
            {category === 'panel' && <>
              <div>
                <label className="label">Wattage (Wp) *</label>
                <input {...register('wattage_wp')} type="number" step="0.01" className="input" placeholder="450" />
              </div>
              <div>
                <label className="label">Efficiency (%)</label>
                <input {...register('panel_efficiency')} type="number" step="0.01" className="input" placeholder="22.5" />
              </div>
            </>}

            {/* Battery fields */}
            {category === 'battery' && <>
              <div>
                <label className="label">Capacity (kWh) *</label>
                <input {...register('capacity_kwh')} type="number" step="0.01" className="input" placeholder="5" />
              </div>
              <div>
                <label className="label">Voltage (V)</label>
                <input {...register('voltage_v')} type="number" step="0.1" className="input" placeholder="48" />
              </div>
              <div>
                <label className="label">Cycle Life</label>
                <input {...register('battery_cycles')} type="number" className="input" placeholder="6000" />
              </div>
            </>}

            {/* Inverter fields */}
            {category === 'inverter' && <>
              <div>
                <label className="label">Power (kW) *</label>
                <input {...register('power_kw')} type="number" step="0.01" className="input" placeholder="5" />
              </div>
              <div>
                <label className="label">Phase</label>
                <select {...register('phase')} className="input">
                  <option value="">Select</option>
                  <option value="single">Single Phase</option>
                  <option value="three">Three Phase</option>
                </select>
              </div>
              <div>
                <label className="label">Inverter Type</label>
                <input {...register('inverter_type')} className="input" placeholder="Hybrid / On-grid / Off-grid" />
              </div>
            </>}

            {/* Generator fields */}
            {category === 'generator' && <>
              <div className="col-span-full flex items-center gap-2 pb-1">
                <input {...register('is_all_in_one')} type="checkbox" id="is_all_in_one" className="w-4 h-4 accent-[#EA9D13]" />
                <label htmlFor="is_all_in_one" className="text-sm font-medium text-gray-700">
                  All-in-one unit (built-in battery + inverter)
                </label>
              </div>
              <div>
                <label htmlFor="gen-power-kw" className="label">Inverter Power (kW) *</label>
                <input {...register('power_kw')} id="gen-power-kw" type="number" step="0.01" className="input" placeholder="5" />
              </div>
              <div>
                <label htmlFor="gen-capacity-kwh" className="label">Built-in Battery (kWh)</label>
                <input {...register('capacity_kwh')} id="gen-capacity-kwh" type="number" step="0.01" className="input" placeholder="e.g. 5.12" />
              </div>
              <div>
                <label htmlFor="gen-voltage-v" className="label">Battery Voltage (V)</label>
                <input {...register('voltage_v')} id="gen-voltage-v" type="number" step="0.1" className="input" placeholder="e.g. 48" />
              </div>
              <div>
                <label htmlFor="gen-phase" className="label">Phase</label>
                <select {...register('phase')} id="gen-phase" className="input">
                  <option value="">Select</option>
                  <option value="single">Single Phase</option>
                  <option value="three">Three Phase</option>
                </select>
              </div>
              <div>
                <label htmlFor="gen-max-pv" className="label">Max Total PV Input (W)</label>
                <input {...register('max_pv_input_w')} id="gen-max-pv" type="number" step="1" className="input" placeholder="e.g. 3000" />
              </div>
              <div>
                <label htmlFor="gen-min-panel-wp" className="label">Min Compatible Panel (Wp)</label>
                <input {...register('min_panel_wp')} id="gen-min-panel-wp" type="number" step="0.01" className="input" placeholder="300" />
              </div>
              <div>
                <label htmlFor="gen-max-panel-wp" className="label">Max Compatible Panel (Wp)</label>
                <input {...register('max_panel_wp')} id="gen-max-panel-wp" type="number" step="0.01" className="input" placeholder="600" />
              </div>
            </>}

            <div>
              <label className="label">Price (RWF) *</label>
              <input {...register('price_rwf', { required: true })} type="number" step="0.01" className="input" placeholder="1,450,000" />
            </div>
            <div>
              <label className="label">Price (USD)</label>
              <input {...register('price_usd')} type="number" step="0.01" className="input" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Warranty (years)</label>
              <input {...register('warranty_years')} type="number" className="input" placeholder="5" />
            </div>
            <div>
              <label className="label">Stock Qty</label>
              <input {...register('stock_quantity')} type="number" className="input" placeholder="0" />
            </div>
            <div className="col-span-full flex items-center gap-2">
              <input {...register('in_stock')} type="checkbox" id="in_stock" className="w-4 h-4" />
              <label htmlFor="in_stock" className="text-sm text-gray-700">In stock</label>
            </div>
            <div className="col-span-full">
              <label className="label">Description</label>
              <textarea {...register('description')} className="input resize-none" rows={2} />
            </div>
          </div>
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
          <button
            onClick={handleSubmit(mutation.mutate as never)}
            disabled={mutation.isPending}
            className="btn-primary flex-1 justify-center"
          >
            {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
            {product ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  )
}
