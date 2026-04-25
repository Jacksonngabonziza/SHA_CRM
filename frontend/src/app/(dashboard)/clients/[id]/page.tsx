'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi, quotesApi, surveysApi } from '@/lib/api'
import { SiteSurvey } from '@/types'
import { formatRWF, formatDate, formatDateTime, STATUS_COLORS, CLIENT_TYPE_ICONS, cn } from '@/lib/utils'
import { Phone, MapPin, Mail, Plus, ArrowLeft, Edit, Calendar, Loader2, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ClientFormModal from '@/components/clients/ClientFormModal'

const CLIENT_STATUSES = ['new', 'quoted', 'followup', 'won', 'lost']

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient()
  const id = parseInt(params.id)
  const [showEdit, setShowEdit] = useState(false)
  const [note, setNote] = useState('')
  const [showFollowup, setShowFollowup] = useState(false)
  const [followupDate, setFollowupDate] = useState('')

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => (await clientsApi.get(id)).data,
  })

  const { data: notesData } = useQuery({
    queryKey: ['client-notes', id],
    queryFn: async () => (await clientsApi.notes(id)).data,
  })

  const { data: quotesData } = useQuery({
    queryKey: ['client-quotes', id],
    queryFn: async () => (await quotesApi.list({ client: id.toString() })).data,
  })

  const { data: surveysData } = useQuery({
    queryKey: ['client-surveys', id],
    queryFn: async () => (await surveysApi.list({ client: id.toString() })).data,
  })

  const addNoteMutation = useMutation({
    mutationFn: () => clientsApi.addNote(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-notes', id] })
      setNote('')
      toast.success('Note added')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ status, followup_date }: { status: string; followup_date?: string }) =>
      clientsApi.updateStatus(id, status, followup_date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', id] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      setShowFollowup(false)
      toast.success('Status updated')
    },
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-gray-400" />
    </div>
  )

  if (!client) return <div className="text-center py-20 text-gray-400">Client not found</div>

  const notes = notesData?.results || notesData || []
  const quotes = quotesData?.results || quotesData || []
  const surveys: SiteSurvey[] = surveysData?.results ?? surveysData ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/clients" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 w-fit">
        <ArrowLeft size={16} /> Back to Clients
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#091928] flex items-center justify-center text-white text-xl font-bold">
              {client.name[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Phone size={13} />{client.phone}</span>
                {client.email && <span className="flex items-center gap-1"><Mail size={13} />{client.email}</span>}
                {client.location && <span className="flex items-center gap-1"><MapPin size={13} />{client.location}</span>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn('badge', STATUS_COLORS[client.status])}>{client.status_display}</span>
                <span className="text-sm text-gray-500">{CLIENT_TYPE_ICONS[client.client_type]} {client.client_type_display}</span>
                {client.is_offgrid && <span className="badge bg-gray-100 text-gray-600">Off-grid</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/quotes/new?client=${id}`} className="btn-amber">
              <Plus size={16} /> New Quote
            </Link>
            <button onClick={() => setShowEdit(true)} className="btn-outline">
              <Edit size={16} /> Edit
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{client.total_quotes}</p>
            <p className="text-xs text-gray-500 mt-1">Total Quotes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {client.monthly_bill_rwf ? formatRWF(client.monthly_bill_rwf) : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Monthly Bill</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{formatDate(client.created_at)}</p>
            <p className="text-xs text-gray-500 mt-1">Client Since</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Status + Notes */}
        <div className="space-y-4">
          {/* Update status */}
          <div className="card p-4">
            <p className="section-title">Update Status</p>
            <div className="space-y-1.5">
              {CLIENT_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => {
                    if (s === 'followup') { setShowFollowup(true) }
                    else statusMutation.mutate({ status: s })
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    client.status === s
                      ? 'bg-[#091928] text-white'
                      : 'hover:bg-gray-50 text-gray-600'
                  )}
                >
                  <span className={cn('inline-block w-2 h-2 rounded-full mr-2', {
                    'bg-blue-400': s === 'new',
                    'bg-amber-400': s === 'quoted',
                    'bg-purple-400': s === 'followup',
                    'bg-green-500': s === 'won',
                    'bg-red-400': s === 'lost',
                  })} />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {showFollowup && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                <label className="label">Follow-up Date</label>
                <input
                  type="date"
                  value={followupDate}
                  onChange={e => setFollowupDate(e.target.value)}
                  className="input"
                />
                <button
                  onClick={() => statusMutation.mutate({ status: 'followup', followup_date: followupDate })}
                  className="btn-primary w-full justify-center"
                >
                  <Calendar size={14} /> Set Follow-up
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="card p-4">
            <p className="section-title">Notes</p>
            <div className="space-y-3 max-h-60 overflow-y-auto mb-3">
              {notes.length === 0 && <p className="text-xs text-gray-400">No notes yet</p>}
              {notes.map((n: { id: number; note: string; created_by_name: string; created_at: string }) => (
                <div key={n.id} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{n.note}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {n.created_by_name} · {formatDate(n.created_at)}
                  </p>
                </div>
              ))}
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className="input resize-none text-sm"
              rows={2}
              placeholder="Add a note..."
            />
            <button
              onClick={() => note.trim() && addNoteMutation.mutate()}
              disabled={!note.trim() || addNoteMutation.isPending}
              className="btn-primary w-full justify-center mt-2 text-sm"
            >
              Add Note
            </button>
          </div>
        </div>

        {/* Right: Quotes */}
        <div className="md:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold">Quotes ({quotes.length})</h3>
            <Link href={`/quotes/new?client=${id}`} className="btn-amber text-sm py-1.5">
              <Plus size={14} /> New Quote
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {quotes.length === 0 && (
              <p className="text-sm text-gray-400 p-6 text-center">No quotes yet</p>
            )}
            {quotes.map((q: { id: number; ref_number: string; system_size_kwp: number; total_price_rwf: number; status: string; status_display: string; created_at: string }) => (
              <Link
                key={q.id} href={`/quotes/${q.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-[#091928]">{q.ref_number}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(q.created_at)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">{q.system_size_kwp} kWp</p>
                  <p className="text-xs text-gray-400">System size</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatRWF(q.total_price_rwf)}</p>
                  <span className={cn('badge', STATUS_COLORS[q.status])}>{q.status_display}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Surveys */}
      {surveys.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold flex items-center gap-2">
              <ClipboardList size={16} className="text-gray-400" /> Site Surveys ({surveys.length})
            </h3>
            <Link href="/surveys" className="text-xs text-[#EA9D13] font-medium hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {surveys.map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.address || 'No address'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.roof_type ? `${s.roof_type} roof · ` : ''}{s.shading_level} shading · {formatDate(s.surveyed_at ?? s.created_at)}
                  </p>
                </div>
                <span className={cn('badge', {
                  'bg-green-100 text-green-700':  s.feasibility === 'feasible',
                  'bg-amber-100 text-amber-700':  s.feasibility === 'conditional',
                  'bg-red-100 text-red-600':      s.feasibility === 'not_feasible',
                })}>
                  {s.feasibility_display}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEdit && (
        <ClientFormModal
          client={client}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false)
            qc.invalidateQueries({ queryKey: ['client', id] })
          }}
        />
      )}
    </div>
  )
}
