'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '@/lib/api'
import { Expense, RecurringExpense, ExpenseCategory, ExpenseFrequency } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import {
  Receipt, Plus, X, Loader2, RefreshCw, Check, AlertCircle, Trash2, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'rent',        label: 'Rent' },
  { value: 'utilities',   label: 'Utilities' },
  { value: 'fuel',        label: 'Fuel' },
  { value: 'materials',   label: 'Materials' },
  { value: 'salaries',    label: 'Salaries' },
  { value: 'contractor',  label: 'Contractor Commission' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'transport',   label: 'Transport' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other',       label: 'Other' },
]

const FREQUENCIES: { value: ExpenseFrequency; label: string }[] = [
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual',    label: 'Annual' },
]

const CATEGORY_COLORS: Record<string, string> = {
  rent:        'bg-blue-100 text-blue-700',
  utilities:   'bg-cyan-100 text-cyan-700',
  fuel:        'bg-orange-100 text-orange-700',
  materials:   'bg-yellow-100 text-yellow-700',
  salaries:    'bg-purple-100 text-purple-700',
  contractor:  'bg-amber-100 text-amber-700',
  marketing:   'bg-pink-100 text-pink-700',
  transport:   'bg-indigo-100 text-indigo-700',
  maintenance: 'bg-gray-100 text-gray-700',
  other:       'bg-gray-100 text-gray-600',
}

function formatRWF(v: number) {
  return `RWF ${Number(v).toLocaleString()}`
}

type Tab = 'one-time' | 'recurring' | 'summary'

export default function ExpensesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('one-time')
  const [showForm, setShowForm] = useState(false)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const today = new Date()

  const { data: expensesData, isLoading: expLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => (await expensesApi.list()).data,
  })
  const { data: recurringData, isLoading: recLoading } = useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: async () => (await expensesApi.recurring.list()).data,
  })
  const { data: summaryData } = useQuery({
    queryKey: ['expense-summary', today.getFullYear()],
    queryFn: async () => (await expensesApi.summary({ year: String(today.getFullYear()) })).data,
  })

  const expenses: Expense[]          = expensesData?.results ?? expensesData ?? []
  const recurring: RecurringExpense[] = recurringData?.results ?? recurringData ?? []
  const overdueRecurring = recurring.filter(r => r.is_overdue && r.is_active)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => expensesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['expense-summary'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => expensesApi.recurring.markPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring-expenses'] })
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['expense-summary'] })
      toast.success('Marked as paid — expense recorded')
    },
    onError: () => toast.error('Failed to mark paid'),
  })

  const deleteRecurringMutation = useMutation({
    mutationFn: (id: number) => expensesApi.recurring.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring-expenses'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1 className="flex items-center gap-2">
            <Receipt size={20} className="text-[#EA9D13]" /> Expenses
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track business costs and recurring commitments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRecurringForm(true)} className="btn-outline">
            <RefreshCw size={15} /> Add Recurring
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} /> Record Expense
          </button>
        </div>
      </div>

      {/* Overdue recurring alert */}
      {overdueRecurring.length > 0 && (
        <div className="card p-4 border-l-4 border-red-400 bg-red-50 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {overdueRecurring.length} recurring expense{overdueRecurring.length > 1 ? 's' : ''} overdue
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {overdueRecurring.map(r => r.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['one-time', 'recurring', 'summary'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === t ? 'bg-white text-[#091928] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t === 'one-time' ? 'One-Time' : t === 'recurring' ? 'Recurring' : 'Summary'}
          </button>
        ))}
      </div>

      {/* One-time expenses */}
      {tab === 'one-time' && (
        <div className="card overflow-hidden">
          {expLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" /></div>}
          {!expLoading && expenses.length === 0 && (
            <div className="text-center py-12 text-gray-400">No expenses recorded yet</div>
          )}
          {!expLoading && expenses.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Date', 'Description', 'Category', 'Quote / Order', 'Amount', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{e.description}</td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', CATEGORY_COLORS[e.category] ?? 'bg-gray-100 text-gray-600')}>
                          {e.category_display}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.quote_ref ?? '—'}</td>
                      <td className="px-4 py-3 font-bold text-[#091928]">{formatRWF(e.amount_rwf)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { if (globalThis.confirm('Delete this expense?')) deleteMutation.mutate(e.id) }}
                          className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recurring expenses */}
      {tab === 'recurring' && (
        <div className="space-y-3">
          {recLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" /></div>}
          {!recLoading && recurring.length === 0 && (
            <div className="card text-center py-12 text-gray-400">No recurring expenses set up</div>
          )}
          {recurring.map(r => (
            <div key={r.id} className={cn('card p-4 flex items-center gap-4', r.is_overdue && r.is_active && 'border-red-200 bg-red-50')}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800">{r.name}</p>
                  <span className={cn('badge', CATEGORY_COLORS[r.category])}>{r.category_display}</span>
                  {!r.is_active && <span className="badge bg-gray-100 text-gray-400">Inactive</span>}
                  {r.is_overdue && r.is_active && <span className="badge bg-red-100 text-red-600">Overdue</span>}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {r.frequency_display} · Next due: {formatDate(r.next_due_date)}
                </p>
              </div>
              <p className="font-bold text-[#091928] text-lg">{formatRWF(r.amount_rwf)}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => markPaidMutation.mutate(r.id)}
                  disabled={markPaidMutation.isPending}
                  className="btn-outline text-xs py-1.5 px-3 text-green-700 border-green-200 hover:bg-green-50"
                >
                  {markPaidMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Mark Paid
                </button>
                <button
                  onClick={() => { if (globalThis.confirm('Delete this recurring expense?')) deleteRecurringMutation.mutate(r.id) }}
                  className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {tab === 'summary' && summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <p className="section-title">Total Expenses {summaryData.year}</p>
            <p className="text-3xl font-bold text-[#091928] mt-2">{formatRWF(summaryData.grand_total)}</p>
            {summaryData.overdue_recurring > 0 && (
              <p className="text-sm text-red-500 mt-1">{summaryData.overdue_recurring} recurring overdue</p>
            )}
          </div>
          <div className="card p-6">
            <p className="section-title">By Category</p>
            <div className="space-y-2 mt-3">
              {summaryData.by_category.map((row: { category: string; total: number }) => (
                <div key={row.category} className="flex items-center justify-between text-sm">
                  <span className={cn('badge', CATEGORY_COLORS[row.category] ?? 'bg-gray-100 text-gray-600')}>
                    {CATEGORIES.find(c => c.value === row.category)?.label ?? row.category}
                  </span>
                  <span className="font-semibold text-[#091928]">{formatRWF(row.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* One-time expense form */}
      {showForm && (
        <ExpenseFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['expenses'] })
            qc.invalidateQueries({ queryKey: ['expense-summary'] })
            setShowForm(false)
          }}
        />
      )}

      {/* Recurring expense form */}
      {showRecurringForm && (
        <RecurringFormModal
          onClose={() => setShowRecurringForm(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['recurring-expenses'] })
            setShowRecurringForm(false)
          }}
        />
      )}
    </div>
  )
}

function ExpenseFormModal({ onClose, onSaved }: { readonly onClose: () => void; readonly onSaved: () => void }) {
  const [description, setDescription] = useState('')
  const [category, setCategory]       = useState<ExpenseCategory>('other')
  const [amount, setAmount]           = useState('')
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes]             = useState('')

  const mutation = useMutation({
    mutationFn: () => expensesApi.create({ description, category, amount_rwf: Number(amount), date, notes }),
    onSuccess: () => { toast.success('Expense recorded'); onSaved() },
    onError: () => toast.error('Failed to record expense'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Record Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="exp-desc" className="label">Description *</label>
            <input id="exp-desc" className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Office rent — June" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-cat" className="label">Category</label>
              <select id="exp-cat" className="input" value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="exp-date" className="label">Date</label>
              <input id="exp-date" type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="exp-amount" className="label">Amount (RWF) *</label>
            <input id="exp-amount" type="number" className="input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label htmlFor="exp-notes" className="label">Notes</label>
            <textarea id="exp-notes" className="input resize-none text-sm" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !description || !amount}
              className="btn-primary flex-1 justify-center"
            >
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Record
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RecurringFormModal({ onClose, onSaved }: { readonly onClose: () => void; readonly onSaved: () => void }) {
  const [name, setName]           = useState('')
  const [category, setCategory]   = useState<ExpenseCategory>('rent')
  const [amount, setAmount]       = useState('')
  const [frequency, setFrequency] = useState<ExpenseFrequency>('monthly')
  const [nextDue, setNextDue]     = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes]         = useState('')

  const mutation = useMutation({
    mutationFn: () => expensesApi.recurring.create({
      name, category, amount_rwf: Number(amount), frequency, next_due_date: nextDue, notes,
    }),
    onSuccess: () => { toast.success('Recurring expense added'); onSaved() },
    onError: () => toast.error('Failed to add recurring expense'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Add Recurring Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="rec-name" className="label">Name *</label>
            <input id="rec-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Office Rent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="rec-cat" className="label">Category</label>
              <select id="rec-cat" className="input" value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="rec-freq" className="label">Frequency</label>
              <select id="rec-freq" className="input" value={frequency} onChange={e => setFrequency(e.target.value as ExpenseFrequency)}>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="rec-amount" className="label">Amount (RWF) *</label>
              <input id="rec-amount" type="number" className="input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label htmlFor="rec-due" className="label">Next Due Date</label>
              <input id="rec-due" type="date" className="input" value={nextDue} onChange={e => setNextDue(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="rec-notes" className="label">Notes</label>
            <textarea id="rec-notes" className="input resize-none text-sm" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !name || !amount}
              className="btn-primary flex-1 justify-center"
            >
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add Recurring
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
