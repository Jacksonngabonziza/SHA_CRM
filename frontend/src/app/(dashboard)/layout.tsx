'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import {
  LayoutDashboard, Users, FileText, Package,
  LogOut, Bell, ChevronRight, Menu, X,
  Wrench, CreditCard, BarChart2, ClipboardList, Share2, Settings, ShieldCheck, UserCheck, Activity,
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const NAV = [
  { href: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard, adminOnly: false },
  { href: '/clients',       label: 'Clients',       icon: Users,           adminOnly: false },
  { href: '/quotes',        label: 'Quotes',        icon: FileText,        adminOnly: false },
  { href: '/products',      label: 'Products',      icon: Package,         adminOnly: false },
  { href: '/installations', label: 'Installations', icon: Wrench,          adminOnly: false },
  { href: '/warranty',      label: 'Warranty',      icon: ShieldCheck,     adminOnly: false },
  { href: '/payments',      label: 'Payments',      icon: CreditCard,      adminOnly: false },
  { href: '/surveys',       label: 'Surveys',       icon: ClipboardList,   adminOnly: false },
  { href: '/referrals',     label: 'Referrals',     icon: Share2,          adminOnly: false },
  { href: '/agents',        label: 'Field Agents',  icon: UserCheck,       adminOnly: true  },
  { href: '/users',         label: 'Users',         icon: Users,           adminOnly: true  },
  { href: '/reports',       label: 'Reports',       icon: BarChart2,       adminOnly: true  },
  { href: '/activity',      label: 'Activity Log',  icon: Activity,        adminOnly: true  },
  { href: '/settings',      label: 'Settings',      icon: Settings,        adminOnly: false },
]

export default function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Open sidebar by default on desktop
  useEffect(() => {
    if (window.innerWidth >= 768) setSidebarOpen(true)
  }, [])

  // Close sidebar on mobile when navigating
  const handleNavClick = () => {
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login')
    else if (user?.role === 'field_agent') router.replace('/agent/dashboard')
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden no-print"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn('no-print',
        'flex flex-col bg-[#091928] text-white transition-all duration-300',
        // Mobile: fixed overlay
        'fixed inset-y-0 left-0 z-40 w-64',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: part of flex layout
        'md:relative md:inset-auto md:z-auto md:shrink-0',
        sidebarOpen ? 'md:w-60 md:translate-x-0' : 'md:w-16 md:translate-x-0',
      )}>
        {/* Logo */}
        <div className="flex items-center justify-center px-4 py-5 border-b border-white/10">
          {sidebarOpen ? (
            <Image
              src="/logo_sha.png"
              alt="Solar Hope Africa"
              width={110}
              height={37}
              style={{ height: 'auto' }}
              priority
            />
          ) : (
            <Image
              src="/logo_sha.png"
              alt="Solar Hope Africa"
              width={36}
              height={12}
              style={{ height: 'auto' }}
              priority
            />
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV.filter(({ adminOnly }) => !adminOnly || user?.role === 'admin').map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href} href={href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium',
                  active
                    ? 'bg-[#EA9D13] text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/8'
                )}
              >
                <Icon size={18} className="shrink-0" />
                {sidebarOpen && <span>{label}</span>}
                {sidebarOpen && active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/10 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-[#EA9D13] flex items-center justify-center text-xs font-bold shrink-0">
                {user?.full_name?.[0] || user?.username?.[0] || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.full_name || user?.username}</p>
                <p className="text-xs text-white/40 capitalize">{user?.role}</p>
              </div>
              <button onClick={handleLogout} className="text-white/40 hover:text-red-400 transition-colors">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center py-2 text-white/40 hover:text-red-400">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 no-print">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-3">
            <button className="relative text-gray-500 hover:text-gray-800">
              <Bell size={20} />
            </button>
            <div className="text-sm text-gray-500 hidden sm:block">
              {new Date().toLocaleDateString('en-RW', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
