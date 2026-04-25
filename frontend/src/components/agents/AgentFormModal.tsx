'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { agentsApi } from '@/lib/api'
import { Agent } from '@/types'
import { X, Loader2, Info } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  agent: Agent | null
  onClose: () => void
  onSaved: () => void
}

interface FormValues {
  first_name: string
  last_name: string
  phone: string
  pin: string
  zone: string
  target_clients_per_month: number
  commission_rate: string
}

export default function AgentFormModal({ agent, onClose, onSaved }: Props) {
  const isEdit = !!agent

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      first_name: '', last_name: '', phone: '', pin: '',
      zone: '', target_clients_per_month: 10, commission_rate: '',
    }
  })

  useEffect(() => {
    if (agent) {
      reset({
        first_name: agent.first_name,
        last_name: agent.last_name,
        phone: agent.phone,
        pin: '',
        zone: agent.agent_profile?.zone ?? '',
        target_clients_per_month: agent.agent_profile?.target_clients_per_month ?? 10,
        commission_rate: agent.agent_profile?.commission_rate != null
          ? String((agent.agent_profile.commission_rate * 100).toFixed(2))
          : '',
      })
    }
  }, [agent, reset])

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      const rateVal = data.commission_rate.trim()
      const payload: Record<string, unknown> = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        zone: data.zone,
        target_clients_per_month: data.target_clients_per_month,
        commission_rate: rateVal ? (Number(rateVal) / 100).toFixed(4) : null,
      }
      if (isEdit) return agentsApi.patch(agent!.id, payload)
      payload.pin = data.pin
      return agentsApi.create(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Agent updated' : 'Agent created')
      onSaved()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { phone?: string[] } } })?.response?.data?.phone?.[0]
      toast.error(msg || 'Something went wrong')
    },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[95vh]">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Agent' : 'New Field Agent'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{isEdit ? 'Update agent details' : 'Register a new field agent'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name <span className="text-red-400">*</span></label>
                <input {...register('first_name', { required: true })} className="input" placeholder="Jean" />
                {errors.first_name && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>
              <div>
                <label className="label">Last Name <span className="text-red-400">*</span></label>
                <input {...register('last_name', { required: true })} className="input" placeholder="Bosco" />
                {errors.last_name && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="label">
                Phone Number <span className="text-red-400">*</span>
                {!isEdit && <span className="text-gray-400 font-normal ml-1">(used to login)</span>}
              </label>
              <input
                {...register('phone', { required: true })}
                className="input disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="+250 7XX XXX XXX"
                disabled={isEdit}
              />
            </div>

            {/* PIN — create only */}
            {!isEdit && (
              <div>
                <label className="label">
                  PIN <span className="text-red-400">*</span>
                  <span className="text-gray-400 font-normal ml-1">(4–6 digits)</span>
                </label>
                <input
                  {...register('pin', { required: !isEdit, minLength: 4, maxLength: 6 })}
                  type="password"
                  inputMode="numeric"
                  className="input tracking-widest"
                  placeholder="••••"
                  maxLength={6}
                />
                {errors.pin && <p className="text-xs text-red-500 mt-1">PIN must be 4–6 digits</p>}
              </div>
            )}

            {/* Zone */}
            <div>
              <label className="label">Zone / Territory</label>
              <input {...register('zone')} className="input" placeholder="e.g. Kicukiro, Nyarugenge…" />
            </div>

            {/* Target + Commission rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Monthly Target</label>
                <input
                  {...register('target_clients_per_month', { min: 1 })}
                  type="number"
                  className="input"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="label">Commission Rate (%)</label>
                <input
                  {...register('commission_rate')}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="input"
                  placeholder="e.g. 2.5"
                />
              </div>
            </div>

            {/* Tiers notice */}
            <div className="flex items-start gap-2.5 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              <Info size={14} className="shrink-0 mt-0.5" />
              <p>
                Leave <strong>Commission Rate</strong> blank to use the global tiered brackets configured in the Agents page.
                A value here overrides the tiers for this agent only.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending && <Loader2 size={15} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
