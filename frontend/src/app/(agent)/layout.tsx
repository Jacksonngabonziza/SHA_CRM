'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { LayoutDashboard, Users, Coins, LogOut, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/agent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agent/clients', label: 'My Clients', icon: Users },
  { href: '/agent/commissions', label: 'Earnings', icon: Coins },
]

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/agent/login')
    } else if (user && user.role !== 'field_agent') {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, user, router])

  if (!isAuthenticated || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#091928]">
      <Loader2 size={28} className="animate-spin text-[#EA9D13]" />
    </div>
  )

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    router.push('/agent/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#091928] px-4 pt-safe-top">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Image src="/logo_sha.png" alt="SHA" width={90} height={30} className="brightness-0 invert opacity-90" priority />
            <div className="h-4 w-px bg-white/20" />
            <span className="text-white/50 text-xs font-medium tracking-wide uppercase">Agent Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-white text-xs font-semibold leading-tight">{user.first_name} {user.last_name}</p>
              <p className="text-white/40 text-[10px]">Field Agent</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#EA9D13] flex items-center justify-center text-white text-sm font-bold">
              {user.first_name?.[0] ?? '?'}
            </div>
            <button onClick={handleLogout} className="text-white/40 hover:text-red-400 transition-colors p-1 ml-1">
              <LogOut size={16} />
            </button>
          </div>
        </div>
        {/* Brand accent stripe */}
        <div className="flex h-0.5">
          <div className="flex-1 bg-[#EA9D13]" />
          <div className="flex-1 bg-[#71AA1F]" />
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 pb-24 max-w-xl mx-auto w-full px-4 py-5">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-safe-bottom">
        <div className="max-w-xl mx-auto flex">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/agent/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 relative flex flex-col items-center justify-center py-3 gap-0.5 transition-colors',
                  active ? 'text-[#EA9D13]' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#EA9D13] rounded-b-full" />
                )}
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className={cn('text-[10px] font-medium', active ? 'text-[#EA9D13]' : 'text-gray-400')}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
