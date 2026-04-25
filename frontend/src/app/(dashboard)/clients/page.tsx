'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi, downloadCsv } from '@/lib/api'
import { Client } from '@/types'
import { formatDate, STATUS_COLORS, CLIENT_TYPE_ICONS, cn } from '@/lib/utils'
import {
  Plus, Search, Filter, Phone, MapPin,
  MoreVertical, Edit, Trash2, FileText, Loader2, Download
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ClientFormModal from '@/components/clients/ClientFormModal'

const STATUSES = ['', 'new', 'quoted', 'followup', 'won', 'lost']
const STATUS_LABELS: Record<string, string> = {
  '': 'All', new: 'New', quoted: 'Quoted',
  followup: 'Follow Up', won: 'Won', lost: 'Lost'
}

export default function ClientsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, status],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (status) params.status = status
      return (await clientsApi.list(params)).data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client deleted')
    },
    onError: () => toast.error('Failed to delete client'),
  })

  const clients: Client[] = data?.results || data || []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p className="text-sm text-gray-500 mt-1">{clients.length} total clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCsv(clientsApi.exportUrl(), 'clients.csv').catch(() => toast.error('Export failed'))}
            className="btn-outline"
            title="Export CSV"
          >
            <Download size={16} /> Export
          </button>
          <button onClick={() => { setEditClient(null); setShowModal(true) }} className="btn-primary">
            <Plus size={16} /> New Client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, location..."
            className="input pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                status === s
                  ? 'bg-[#091928] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-2">No clients found</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
              <Plus size={16} /> Add first client
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Client', 'Contact', 'Type', 'Status', 'Quotes', 'Follow-up', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/clients/${c.id}`} className="flex items-center gap-3 group">
                      <div className="w-9 h-9 rounded-full bg-[#091928] flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-[#EA9D13] transition-colors">
                          {c.name}
                        </p>
                        <p className="text-xs text-gray-400">{c.is_offgrid ? 'Off-grid' : 'On-grid'}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Phone size={11} /> {c.phone}
                    </div>
                    {c.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <MapPin size={11} /> {c.location}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm">
                      {CLIENT_TYPE_ICONS[c.client_type]} {c.client_type_display}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('badge', STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-700')}>
                      {c.status_display}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{c.total_quotes}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {c.followup_date ? (
                      <span className={cn(
                        new Date(c.followup_date) <= new Date()
                          ? 'text-red-600 font-medium' : ''
                      )}>
                        {formatDate(c.followup_date)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/quotes/new?client=${c.id}`}
                        className="p-1.5 text-gray-400 hover:text-[#EA9D13] hover:bg-amber-50 rounded transition-colors"
                        title="New quote">
                        <FileText size={15} />
                      </Link>
                      <button
                        onClick={() => { setEditClient(c); setShowModal(true) }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${c.name}?`)) deleteMutation.mutate(c.id)
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {showModal && (
        <ClientFormModal
          client={editClient}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            qc.invalidateQueries({ queryKey: ['clients'] })
          }}
        />
      )}
    </div>
  )
}
