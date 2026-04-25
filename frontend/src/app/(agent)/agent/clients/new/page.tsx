'use client'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api'
import { ArrowLeft, Loader2, CheckCircle, User, Phone, MapPin, Sun, FileText } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface FormValues {
  name: string
  phone: string
  email: string
  location: string
  client_type: string
  is_offgrid: boolean
  monthly_bill_rwf: string
  notes: string
}

export default function AgentAddClientPage() {
  const qc = useQueryClient()
  const [done, setDone] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: '', phone: '', email: '', location: '',
      client_type: 'residential', is_offgrid: false,
      monthly_bill_rwf: '', notes: '',
    }
  })

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => clientsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-clients'] })
      qc.invalidateQueries({ queryKey: ['agent-me'] })
      setDone(true)
    },
    onError: () => toast.error('Failed to register client'),
  })

  const onSubmit = (data: FormValues) => {
    const payload: Record<string, unknown> = { ...data }
    if (!data.monthly_bill_rwf) delete payload.monthly_bill_rwf
    if (!data.email) delete payload.email
    mutation.mutate(payload)
  }

  if (done) return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-20 h-20 rounded-full bg-[#71AA1F]/10 flex items-center justify-center mb-5">
        <CheckCircle size={40} className="text-[#71AA1F]" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Client Registered!</h2>
      <p className="text-gray-500 mt-2 leading-relaxed">
        Our team has been notified and will follow up with this client.
      </p>
      <div className="flex flex-col gap-3 w-full mt-8">
        <button
          onClick={() => { setDone(false); reset() }}
          className="w-full bg-[#EA9D13] text-white font-semibold py-3.5 rounded-2xl hover:bg-[#d48e10] active:scale-[0.98] transition-all shadow-sm shadow-amber-100"
        >
          Register Another Client
        </button>
        <Link
          href="/agent/clients"
          className="w-full bg-white border-2 border-gray-100 text-gray-700 font-semibold py-3.5 rounded-2xl text-center hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          View My Clients
        </Link>
        <Link
          href="/agent/dashboard"
          className="text-sm text-gray-400 hover:text-gray-600 py-1 text-center"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/agent/dashboard" className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Register Client</h1>
          <p className="text-xs text-gray-400">Fill in the details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Contact info */}
        <Section icon={User} title="Client Information">
          <div>
            <label className="label">Full Name <span className="text-red-400">*</span></label>
            <input
              {...register('name', { required: true })}
              className="input"
              placeholder="Jean Bosco Nkurunziza"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">Name is required</p>}
          </div>

          <div>
            <label className="label">Phone Number <span className="text-red-400">*</span></label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                {...register('phone', { required: true })}
                type="tel"
                className="input pl-9"
                placeholder="+250 7XX XXX XXX"
              />
            </div>
            {errors.phone && <p className="text-xs text-red-500 mt-1">Phone is required</p>}
          </div>

          <div>
            <label className="label">Location</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                {...register('location')}
                className="input pl-9"
                placeholder="e.g. Kicukiro, Kigali"
              />
            </div>
          </div>

          <div>
            <label className="label">Client Type</label>
            <select {...register('client_type')} className="input">
              <option value="residential">Residential (Home)</option>
              <option value="school">School / Institution</option>
              <option value="clinic">Clinic / Health Facility</option>
              <option value="business">Business / Hotel</option>
              <option value="community">Community / Mini-grid</option>
            </select>
          </div>
        </Section>

        {/* Energy context */}
        <Section icon={Sun} title="Energy Situation">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-[#091928]/4 border border-gray-100 hover:bg-[#091928]/6 transition-colors">
            <input
              {...register('is_offgrid')}
              type="checkbox"
              className="w-4 h-4 rounded accent-[#EA9D13]"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">No grid connection</p>
              <p className="text-xs text-gray-400">This client is fully off-grid</p>
            </div>
          </label>

          <div>
            <label className="label">Monthly Electricity Bill (RWF)</label>
            <input
              {...register('monthly_bill_rwf')}
              type="number"
              className="input"
              placeholder="e.g. 15,000"
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank if unknown or off-grid</p>
          </div>
        </Section>

        {/* Notes */}
        <Section icon={FileText} title="Additional Notes">
          <textarea
            {...register('notes')}
            className="input resize-none"
            rows={3}
            placeholder="Anything useful — e.g. roof type, urgency, referred by someone…"
          />
        </Section>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-[#EA9D13] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#d48e10] active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-amber-100"
        >
          {mutation.isPending ? (
            <><Loader2 size={18} className="animate-spin" /> Registering…</>
          ) : (
            'Register Client'
          )}
        </button>
      </form>
    </div>
  )
}

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 pb-1 border-b border-gray-50">
        <div className="w-6 h-6 rounded-lg bg-[#091928]/8 flex items-center justify-center">
          <Icon size={13} className="text-[#091928]" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  )
}
