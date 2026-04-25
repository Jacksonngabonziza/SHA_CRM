'use client'
import { useQuery } from '@tanstack/react-query'
import { agentsApi } from '@/lib/api'
import { Client } from '@/types'
import { formatDate, STATUS_COLORS, cn } from '@/lib/utils'
import { Plus, Phone, MapPin, Loader2, Users, Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const TYPE_LABELS: Record<string, string> = {
  residential: 'Home',
  school: 'School',
  clinic: 'Clinic',
  business: 'Business',
  community: 'Community',
}

export default function AgentClientsPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['agent-clients'],
    queryFn: async () => (await agentsApi.myClients()).data,
  })

  const allClients: Client[] = data?.results ?? data ?? []
  const clients = search.trim()
    ? allClients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        c.location?.toLowerCase().includes(search.toLowerCase())
      )
    : allClients

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Clients</h1>
          <p className="text-xs text-gray-400 mt-0.5">{allClients.length} registered</p>
        </div>
        <Link
          href="/agent/clients/new"
          className="flex items-center gap-1.5 bg-[#EA9D13] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#d48e10] active:scale-95 transition-all shadow-sm shadow-amber-100"
        >
          <Plus size={15} /> New
        </Link>
      </div>

      {/* Search */}
      {allClients.length > 0 && (
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, location…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EA9D13]/30 focus:border-[#EA9D13]"
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={24} className="animate-spin text-[#EA9D13]" />
          <p className="text-sm text-gray-400">Loading clients…</p>
        </div>
      ) : allClients.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700">No clients yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">Start registering clients you meet in the field</p>
          <Link
            href="/agent/clients/new"
            className="inline-flex items-center gap-2 bg-[#EA9D13] text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-sm shadow-amber-100"
          >
            <Plus size={15} /> Register First Client
          </Link>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Search size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No clients match "{search}"</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {clients.map(client => (
            <div key={client.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-[#091928]/8 flex items-center justify-center text-[#091928] font-bold text-base shrink-0 border border-gray-100">
                  {client.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 leading-tight truncate">{client.name}</p>
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0', STATUS_COLORS[client.status])}>
                      {client.status_display}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Phone size={10} /> {client.phone}</span>
                    {client.location && <span className="flex items-center gap-1"><MapPin size={10} /> {client.location}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg">
                  {TYPE_LABELS[client.client_type] ?? client.client_type_display}
                </span>
                <span className="text-[11px] text-gray-400">{formatDate(client.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
