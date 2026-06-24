'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { companySettingsApi } from '@/lib/api'
import {
  LayoutDashboard, Users, FileText, Package,
  LogOut, Bell, ChevronRight, Menu, X,
  Wrench, CreditCard, BarChart2, ClipboardList, Share2, Settings, ShieldCheck, UserCheck, Activity, ShoppingCart,
  Receipt, ShoppingBag, MessageCircle,
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type NavItem = {
  href: string
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ElementType<any>
  permKey?: string
  adminLocked?: boolean
  alwaysVisible?: boolean
}

const NAV: NavItem[] = [
  { href: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard, alwaysVisible: true },
  { href: '/clients',       label: 'Clients',        icon: Users,           permKey: 'clients' },
  { href: '/quotes',        label: 'Quotes',         icon: FileText,        permKey: 'quotes' },
  { href: '/orders',        label: 'Product Orders', icon: ShoppingCart,    permKey: 'orders' },
  { href: '/products',      label: 'Products',       icon: Package,         permKey: 'products' },
  { href: '/installations', label: 'Installations',  icon: Wrench,          permKey: 'installations' },
  { href: '/warranty',      label: 'Warranty',       icon: ShieldCheck,     permKey: 'warranty' },
  { href: '/payments',      label: 'Payments',       icon: CreditCard,      permKey: 'payments' },
  { href: '/expenses',      label: 'Expenses',       icon: Receipt,         permKey: 'expenses' },
  { href: '/purchases',     label: 'Purchases',      icon: ShoppingBag,     permKey: 'purchases' },
  { href: '/surveys',       label: 'Surveys',        icon: ClipboardList,   permKey: 'surveys' },
  { href: '/referrals',     label: 'Referrals',      icon: Share2,          permKey: 'referrals' },
  { href: '/whatsapp',      label: 'WhatsApp Inbox', icon: MessageCircle,   permKey: 'whatsapp' },
  { href: '/agents',        label: 'Field Agents',   icon: UserCheck,       adminLocked: true },
  { href: '/users',         label: 'Users',          icon: Users,           adminLocked: true },
  { href: '/reports',       label: 'Reports',        icon: BarChart2,       adminLocked: true },
  { href: '/activity',      label: 'Activity Log',   icon: Activity,        adminLocked: true },
  { href: '/settings',      label: 'Settings',       icon: Settings,        permKey: 'settings' },
]

const DEFAULT_SALES_PERMS = [
  'clients', 'quotes', 'orders', 'products', 'installations',
  'warranty', 'payments', 'surveys', 'referrals', 'whatsapp', 'settings',
]

export default function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: settings, isSuccess: settingsLoaded } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => (await companySettingsApi.get()).data,
    staleTime: 30_000,
    enabled: !!isAuthenticated && user?.role !== 'admin',
  })

  const allowedKeys: string[] | null =
    user?.role === 'admin'
      ? null
      : (settings?.role_permissions?.[user?.role ?? ''] ?? DEFAULT_SALES_PERMS)

  const visibleNav = NAV.filter(item => {
    if (item.adminLocked) return user?.role === 'admin'
    if (item.alwaysVisible) return true
    if (user?.role === 'admin') return true
    return allowedKeys?.includes(item.permKey ?? '') ?? false
  })

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

  // Enforce page-level access: redirect if the current page is not in the user's allowed keys
  useEffect(() => {
    if (!isAuthenticated || user?.role === 'admin') return
    // Wait until permissions are loaded before enforcing (avoid redirect on initial render)
    if (!settingsLoaded) return

    const currentItem = NAV.find(
      item => item.permKey && (pathname === item.href || pathname.startsWith(item.href + '/'))
    )
    if (!currentItem) return  // dashboard, or admin-locked page (those redirect via backend)

    const keys = settings?.role_permissions?.[user?.role ?? ''] ?? DEFAULT_SALES_PERMS
    if (!keys.includes(currentItem.permKey ?? '')) {
      router.replace('/dashboard')
    }
  }, [pathname, settings, settingsLoaded, isAuthenticated, user?.role, router])

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
          {visibleNav.map(({ href, label, icon: Icon }) => {
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
        <main className={`flex-1 min-h-0 ${pathname.startsWith('/whatsapp') ? 'overflow-hidden' : 'overflow-y-auto p-3 sm:p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
