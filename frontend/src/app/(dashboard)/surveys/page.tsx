'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { surveysApi, clientsApi } from '@/lib/api'
import { SiteSurvey, Feasibility } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { ClipboardList, Loader2, Plus, X } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const FEASIBILITY_COLORS: Record<Feasibility, string> = {
  feasible:      'bg-green-100 text-green-700',
  conditional:   'bg-amber-100 text-amber-700',
  not_feasible:  'bg-red-100 text-red-600',
}

const ROOF_OPTIONS = [
  { value: 'flat',      label: 'Flat' },
  { value: 'pitched',   label: 'Pitched' },
  { value: 'metal',     label: 'Metal Sheet' },
  { value: 'tile',      label: 'Tile' },
  { value: 'concrete',  label: 'Concrete Slab' },
]

const SHADING_OPTIONS = [
  { value: 'none',    label: 'No Shading' },
  { value: 'partial', label: 'Partial' },
  { value: 'heavy',   label: 'Heavy' },
]

const GRID_OPTIONS = [
  { value: 'connected', label: 'Grid Connected' },
  { value: 'offgrid',   label: 'Off-Grid' },
  { value: 'unstable',  label: 'Unstable Grid' },
]

const FEASIBILITY_OPTIONS = [
  { value: 'feasible',     label: 'Feasible' },
  { value: 'conditional',  label: 'Conditional' },
  { value: 'not_feasible', label: 'Not Feasible' },
]

export default function SurveysPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['surveys'],
    queryFn: async () => (await surveysApi.list()).data,
  })

  const surveys: SiteSurvey[] = data?.results ?? data ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: number) => surveysApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveys'] })
      toast.success('Survey deleted')
    },
    onError: () => toast.error('Failed to delete survey'),
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1>Site Surveys</h1>
          <p className="text-sm text-gray-500 mt-1">{surveys.length} total</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> New Survey
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">No surveys yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Client', 'Address', 'Roof', 'Shading', 'Grid', 'Feasibility', 'Surveyed', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {surveys.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/clients/${s.client}`} className="text-sm font-semibold text-gray-900 hover:text-[#EA9D13]">
                      {s.client_name}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{s.surveyed_by_name}</p>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600 max-w-36 truncate">{s.address || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 capitalize">{s.roof_type || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 capitalize">{s.shading_level}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 capitalize">{s.grid_status}</td>
                  <td className="px-5 py-3">
                    <span className={cn('badge', FEASIBILITY_COLORS[s.feasibility])}>
                      {s.feasibility_display}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {s.surveyed_at ? formatDate(s.surveyed_at) : formatDate(s.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => { if (window.confirm('Delete this survey?')) deleteMutation.mutate(s.id) }}
                      className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {showForm && (
        <SurveyFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['surveys'] })
            setShowForm(false)
          }}
        />
      )}
    </div>
  )
}

function SurveyFormModal({ onClose, onSuccess }: { readonly onClose: () => void; readonly onSuccess: () => void }) {
  const qc = useQueryClient()
  const [clientId, setClientId] = useState('')
  const [address, setAddress] = useState('')
  const [roofType, setRoofType] = useState('')
  const [roofArea, setRoofArea] = useState('')
  const [shadingLevel, setShadingLevel] = useState('none')
  const [shadingNotes, setShadingNotes] = useState('')
  const [gridStatus, setGridStatus] = useState('connected')
  const [feasibility, setFeasibility] = useState('feasible')
  const [recommendedKw, setRecommendedKw] = useState('')
  const [surveyorNotes, setSurveyorNotes] = useState('')
  const [scaffoldingNeeded, setScaffoldingNeeded] = useState(false)
  const [threePhase, setThreePhase] = useState(false)
  const [surveyedAt, setSurveyedAt] = useState(new Date().toISOString().slice(0, 16))

  const { data: clientsData } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => (await clientsApi.list()).data,
  })
  const clients = clientsData?.results ?? clientsData ?? []

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => surveysApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveys'] })
      onSuccess()
      toast.success('Survey recorded')
    },
    onError: () => toast.error('Failed to save survey'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) { toast.error('Select a client'); return }
    createMutation.mutate({
      client: Number(clientId),
      address,
      roof_type: roofType || undefined,
      roof_area_m2: roofArea ? Number(roofArea) : null,
      shading_level: shadingLevel,
      shading_notes: shadingNotes,
      grid_status: gridStatus,
      feasibility,
      recommended_system_kw: recommendedKw ? Number(recommendedKw) : null,
      surveyor_notes: surveyorNotes,
      scaffolding_needed: scaffoldingNeeded,
      three_phase: threePhase,
      surveyed_at: surveyedAt || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">New Site Survey</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-full">
              <label htmlFor="survey-client" className="label">Client</label>
              <select id="survey-client" value={clientId} onChange={e => setClientId(e.target.value)} className="input" required>
                <option value="">Select client…</option>
                {clients.map((c: { id: number; name: string }) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-full">
              <label htmlFor="survey-address" className="label">Site Address</label>
              <input id="survey-address" value={address} onChange={e => setAddress(e.target.value)} className="input" placeholder="Full site address" />
            </div>
            <div>
              <label htmlFor="survey-roof" className="label">Roof Type</label>
              <select id="survey-roof" value={roofType} onChange={e => setRoofType(e.target.value)} className="input">
                <option value="">— Select —</option>
                {ROOF_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="survey-roof-area" className="label">Roof Area (m²)</label>
              <input id="survey-roof-area" type="number" value={roofArea} onChange={e => setRoofArea(e.target.value)} className="input" placeholder="e.g. 40" />
            </div>
            <div>
              <label htmlFor="survey-shading" className="label">Shading Level</label>
              <select id="survey-shading" value={shadingLevel} onChange={e => setShadingLevel(e.target.value)} className="input">
                {SHADING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="survey-grid" className="label">Grid Status</label>
              <select id="survey-grid" value={gridStatus} onChange={e => setGridStatus(e.target.value)} className="input">
                {GRID_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="survey-feasibility" className="label">Feasibility</label>
              <select id="survey-feasibility" value={feasibility} onChange={e => setFeasibility(e.target.value)} className="input">
                {FEASIBILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="survey-rec-kw" className="label">Recommended System (kW)</label>
              <input id="survey-rec-kw" type="number" step="0.1" value={recommendedKw} onChange={e => setRecommendedKw(e.target.value)} className="input" placeholder="e.g. 5.5" />
            </div>
            <div>
              <label htmlFor="survey-datetime" className="label">Surveyed At</label>
              <input id="survey-datetime" type="datetime-local" value={surveyedAt} onChange={e => setSurveyedAt(e.target.value)} className="input" />
            </div>
            <div className="flex items-center gap-6 pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input type="checkbox" checked={scaffoldingNeeded} onChange={e => setScaffoldingNeeded(e.target.checked)} className="w-4 h-4 accent-[#EA9D13]" />
                Scaffolding needed
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input type="checkbox" checked={threePhase} onChange={e => setThreePhase(e.target.checked)} className="w-4 h-4 accent-[#EA9D13]" />
                3-phase supply
              </label>
            </div>
            <div className="col-span-full">
              <label htmlFor="survey-shading-notes" className="label">Shading Notes</label>
              <textarea id="survey-shading-notes" value={shadingNotes} onChange={e => setShadingNotes(e.target.value)} className="input resize-none text-sm" rows={2} />
            </div>
            <div className="col-span-full">
              <label htmlFor="survey-notes" className="label">Surveyor Notes</label>
              <textarea id="survey-notes" value={surveyorNotes} onChange={e => setSurveyorNotes(e.target.value)} className="input resize-none text-sm" rows={3} placeholder="Overall observations, risks, recommendations…" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Save Survey
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
