'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const { login, isLoading } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(username, password)
      const { user } = useAuthStore.getState()
      toast.success('Welcome back!')
      router.push(user?.role === 'field_agent' ? '/agent/dashboard' : '/dashboard')
    } catch {
      toast.error('Invalid username or password')
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
          <p className="text-white/50 text-sm mt-1">CRM & Quotation System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input"
                placeholder="your_username"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Amber bottom bar */}
        <div className="h-1 bg-[#EA9D13] rounded-full mt-6 mx-8" />
        <div className="h-0.5 bg-[#71AA1F] rounded-full mt-1 mx-8" />

        <p className="text-center text-white/30 text-xs mt-4">
          Light Up Dreams, The Solar Way
        </p>
      </div>
    </div>
  )
}
