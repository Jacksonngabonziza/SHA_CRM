'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { agentsApi } from '@/lib/api'
import { Agent } from '@/types'
import { X, Loader2, KeyRound, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  agent: Agent
  onClose: () => void
}

export default function ResetPinModal({ agent, onClose }: Props) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const mutation = useMutation({
    mutationFn: () => agentsApi.resetPin(agent.id, pin),
    onSuccess: () => {
      toast.success('PIN updated successfully')
      onClose()
    },
    onError: () => toast.error('Failed to reset PIN'),
  })

  const valid = pin.length >= 4 && pin === confirmPin
  const mismatch = confirmPin.length > 0 && pin !== confirmPin

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <KeyRound size={16} className="text-[#EA9D13]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Reset PIN</h2>
              <p className="text-xs text-gray-400">{agent.full_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="label">New PIN <span className="text-gray-400 font-normal">(4–6 digits)</span></label>
            <input
              type="password"
              value={pin}
              inputMode="numeric"
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input tracking-[0.4em] text-lg font-bold placeholder:tracking-normal placeholder:font-normal"
              placeholder="••••"
              maxLength={6}
              autoFocus
            />
          </div>

          <div>
            <label className="label">Confirm PIN</label>
            <input
              type="password"
              value={confirmPin}
              inputMode="numeric"
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`input tracking-[0.4em] text-lg font-bold placeholder:tracking-normal placeholder:font-normal ${
                mismatch ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : ''
              }`}
              placeholder="••••"
              maxLength={6}
            />
            {mismatch && <p className="text-xs text-red-500 mt-1">PINs do not match</p>}
            {valid && (
              <p className="text-xs text-[#71AA1F] mt-1 flex items-center gap-1">
                <ShieldCheck size={12} /> PINs match
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={!valid || mutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {mutation.isPending && <Loader2 size={15} className="animate-spin" />}
              Update PIN
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
