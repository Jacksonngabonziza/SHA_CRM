'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

export default function AgentLoginPage() {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.agentLogin(phone.trim(), pin)
      Cookies.set('access_token', data.access, { expires: 1 })
      Cookies.set('refresh_token', data.refresh, { expires: 7 })
      useAuthStore.setState({ user: data.user, isAuthenticated: true })
      toast.success(`Welcome, ${data.user.first_name}!`)
      router.push('/agent/dashboard')
    } catch {
      toast.error('Invalid phone number or PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#091928] flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='5' y='5' width='30' height='20' rx='4' fill='none' stroke='%23EA9D13' stroke-width='1.5'/%3E%3Crect x='45' y='5' width='30' height='20' rx='4' fill='none' stroke='%23EA9D13' stroke-width='1.5'/%3E%3Crect x='5' y='35' width='30' height='20' rx='4' fill='none' stroke='%23EA9D13' stroke-width='1.5'/%3E%3Crect x='45' y='35' width='30' height='20' rx='4' fill='none' stroke='%23EA9D13' stroke-width='1.5'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logo_sha.png"
            alt="Solar Hope Africa"
            width={140}
            height={47}
            className="mx-auto mb-3"
            priority
          />
          <p className="text-white/50 text-sm mt-1">Field Agent Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your phone number and PIN</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input"
                placeholder="+250 7XX XXX XXX"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">PIN</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input pr-10"
                  placeholder="••••••"
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Brand stripe */}
        <div className="h-1 bg-[#EA9D13] rounded-full mt-6 mx-8" />
        <div className="h-0.5 bg-[#71AA1F] rounded-full mt-1 mx-8" />

        <p className="text-center text-white/30 text-xs mt-4">
          Light Up Dreams, The Solar Way
        </p>
      </div>
    </div>
  )
}
