'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api'
import { Client } from '@/types'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  client: Client | null
  onClose: () => void
  onSuccess: () => void
}

export default function ClientFormModal({ client, onClose, onSuccess }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '', phone: '', email: '', location: '', address: '',
      client_type: 'residential', is_offgrid: false,
      monthly_bill_rwf: '', source: '', notes: '',
    }
  })

  useEffect(() => {
    if (client) reset({ ...client, monthly_bill_rwf: client.monthly_bill_rwf?.toString() || '' })
  }, [client, reset])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      client ? clientsApi.patch(client.id, data) : clientsApi.create(data),
    onSuccess: () => {
      toast.success(client ? 'Client updated' : 'Client created')
      onSuccess()
    },
    onError: () => toast.error('Something went wrong'),
  })

  const onSubmit = (data: Record<string, unknown>) => {
    if (!data.monthly_bill_rwf) delete data.monthly_bill_rwf
    mutation.mutate(data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{client ? 'Edit Client' : 'New Client'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit as never)} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-full">
              <label className="label">Full Name *</label>
              <input {...register('name', { required: true })} className="input" placeholder="Jackson Ngabonziza" />
              {errors.name && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>
            <div>
              <label className="label">Phone *</label>
              <input {...register('phone', { required: true })} className="input" placeholder="+250 780 000 000" />
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="client@email.com" />
            </div>
            <div>
              <label className="label">Location</label>
              <input {...register('location')} className="input" placeholder="Kigali, Gasabo" />
            </div>
            <div>
              <label className="label">Client Type</label>
              <select {...register('client_type')} className="input">
                <option value="residential">Residential</option>
                <option value="school">School / Institution</option>
                <option value="clinic">Clinic / Health</option>
                <option value="business">Business / Hotel</option>
                <option value="community">Community</option>
              </select>
            </div>
            <div className="col-span-full">
              <label className="label">Address</label>
              <input {...register('address')} className="input" placeholder="Full address" />
            </div>
            <div>
              <label className="label">Monthly Bill (RWF)</label>
              <input {...register('monthly_bill_rwf')} type="number" className="input" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Source</label>
              <input {...register('source')} className="input" placeholder="Referral, Social media..." />
            </div>
            <div className="col-span-full flex items-center gap-2">
              <input {...register('is_offgrid')} type="checkbox" id="offgrid" className="w-4 h-4" />
              <label htmlFor="offgrid" className="text-sm text-gray-700">Off-grid client (no utility connection)</label>
            </div>
            <div className="col-span-full">
              <label className="label">Notes</label>
              <textarea {...register('notes')} className="input resize-none" rows={3} placeholder="Any notes about this client..." />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
          <button
            onClick={handleSubmit(onSubmit as never)}
            disabled={mutation.isPending}
            className="btn-primary flex-1 justify-center"
          >
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            {client ? 'Save Changes' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  )
}
