'use client'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, companySettingsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { CompanySettings } from '@/types'
import { Loader2, Save, KeyRound, User, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const qc = useQueryClient()
  const { user, setUser } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const profileMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => authApi.updateMe(d),
    onSuccess: async () => {
      const { data } = await authApi.me()
      setUser(data)
      qc.invalidateQueries({ queryKey: ['me'] })
      toast.success('Profile updated')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  const passwordMutation = useMutation({
    mutationFn: (d: { old_password: string; new_password: string }) => authApi.changePassword(d),
    onSuccess: () => {
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password changed')
    },
    onError: () => toast.error('Current password is incorrect'),
  })

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    profileMutation.mutate({ first_name: firstName, last_name: lastName, email, phone })
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    passwordMutation.mutate({ old_password: oldPassword, new_password: newPassword })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1>Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile and account security</p>
      </div>

      {/* Company Settings — admin only */}
      {isAdmin && <CompanySettingsCard />}

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><User size={18} /></div>
          <h2 className="text-base font-semibold text-gray-900">Profile Information</h2>
        </div>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-firstname" className="label">First Name</label>
              <input id="settings-firstname" value={firstName} onChange={e => setFirstName(e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="settings-lastname" className="label">Last Name</label>
              <input id="settings-lastname" value={lastName} onChange={e => setLastName(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="settings-email" className="label">Email</label>
            <input id="settings-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="settings-phone" className="label">Phone</label>
            <input id="settings-phone" value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="+250 7xx xxx xxx" />
          </div>
          <div className="pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-3">Username: <span className="font-mono text-gray-600">{user?.username}</span> · Role: <span className="capitalize text-gray-600">{user?.role}</span></p>
            <button type="submit" disabled={profileMutation.isPending} className="btn-primary">
              {profileMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Profile
            </button>
          </div>
        </form>
      </div>

      {/* Password card */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><KeyRound size={18} /></div>
          <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="settings-old-pw" className="label">Current Password</label>
            <input id="settings-old-pw" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="input" required />
          </div>
          <div>
            <label htmlFor="settings-new-pw" className="label">New Password</label>
            <input id="settings-new-pw" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input" required minLength={8} />
          </div>
          <div>
            <label htmlFor="settings-confirm-pw" className="label">Confirm New Password</label>
            <input
              id="settings-confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={`input ${confirmPassword && confirmPassword !== newPassword ? 'border-red-400 focus:ring-red-400' : ''}`}
              required
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>
          <button type="submit" disabled={passwordMutation.isPending} className="btn-amber">
            {passwordMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            Change Password
          </button>
        </form>
      </div>
    </div>
  )
}

function CompanySettingsCard() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<CompanySettings>({
    queryKey: ['company-settings'],
    queryFn: async () => (await companySettingsApi.get()).data,
  })

  const [form, setForm] = useState<Partial<CompanySettings>>({})

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const mutation = useMutation({
    mutationFn: (d: Partial<CompanySettings>) => companySettingsApi.update(d as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-settings'] })
      toast.success('Company settings saved')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const set = (field: keyof CompanySettings, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }))

  if (isLoading) return (
    <div className="card p-6 flex items-center justify-center py-10">
      <Loader2 size={20} className="animate-spin text-gray-300" />
    </div>
  )

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-green-100 rounded-lg text-green-600"><Building2 size={18} /></div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Company Settings</h2>
          <p className="text-xs text-gray-400">Used in PDFs, public quote pages, and the calculation engine</p>
        </div>
      </div>

      <div className="space-y-5">

        {/* ── Company Identity ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Company Identity</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cs-name" className="label">Company Name</label>
              <input id="cs-name" value={form.company_name ?? ''} onChange={e => set('company_name', e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="cs-tagline" className="label">Tagline</label>
              <input id="cs-tagline" value={form.company_tagline ?? ''} onChange={e => set('company_tagline', e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="cs-phone" className="label">Phone</label>
              <input id="cs-phone" value={form.company_phone ?? ''} onChange={e => set('company_phone', e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="cs-email" className="label">Email</label>
              <input id="cs-email" type="email" value={form.company_email ?? ''} onChange={e => set('company_email', e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="cs-website" className="label">Website</label>
              <input id="cs-website" value={form.company_website ?? ''} onChange={e => set('company_website', e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="cs-address" className="label">Address</label>
              <input id="cs-address" value={form.company_address ?? ''} onChange={e => set('company_address', e.target.value)} className="input" placeholder="e.g. KG 123 St, Kigali" />
            </div>
          </div>
        </div>

        {/* ── Payment & Banking ── */}
        <div className="border-t border-gray-100 pt-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment & Banking</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cs-bank-name" className="label">Bank Name</label>
              <input id="cs-bank-name" value={form.bank_name ?? ''} onChange={e => set('bank_name', e.target.value)} className="input" placeholder="e.g. Bank of Kigali" />
            </div>
            <div>
              <label htmlFor="cs-bank-account" className="label">Bank Account Number</label>
              <input id="cs-bank-account" value={form.bank_account ?? ''} onChange={e => set('bank_account', e.target.value)} className="input" placeholder="e.g. 100229629799" />
            </div>
            <div>
              <label htmlFor="cs-momo-number" className="label">MoMo Number</label>
              <input id="cs-momo-number" value={form.momo_number ?? ''} onChange={e => set('momo_number', e.target.value)} className="input" placeholder="+250 7xx xxx xxx" />
            </div>
            <div>
              <label htmlFor="cs-momo-name" className="label">MoMo Registered Name</label>
              <input id="cs-momo-name" value={form.momo_name ?? ''} onChange={e => set('momo_name', e.target.value)} className="input" placeholder="e.g. SolarHope Africa Ltd" />
            </div>
            <div className="col-span-full">
              <label htmlFor="cs-pay-instructions" className="label">
                Payment Instructions
                <span className="text-gray-400 font-normal ml-1">(shown on installation reports — leave blank to auto-build from bank/MoMo above)</span>
              </label>
              <textarea
                id="cs-pay-instructions"
                value={form.payment_instructions ?? ''}
                onChange={e => set('payment_instructions', e.target.value)}
                className="input resize-none"
                rows={3}
                placeholder="Leave blank to auto-generate from bank and MoMo details above"
              />
            </div>
          </div>
        </div>

        {/* ── Quote / Proposal ── */}
        <div className="border-t border-gray-100 pt-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quote & Proposal</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cs-lifespan" className="label">System Lifespan</label>
              <input id="cs-lifespan" value={form.system_lifespan ?? ''} onChange={e => set('system_lifespan', e.target.value)} className="input" placeholder="e.g. 25–30 years" />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="cs-terms" className="label">
              Terms & Conditions
              <span className="text-gray-400 font-normal ml-1">(printed at the bottom of every quote PDF)</span>
            </label>
            <textarea
              id="cs-terms"
              value={form.quote_terms ?? ''}
              onChange={e => set('quote_terms', e.target.value)}
              className="input resize-none"
              rows={4}
              placeholder="e.g. Prices are valid for the period stated. Installation subject to site assessment..."
            />
          </div>
        </div>

        {/* ── Calculation Defaults ── */}
        <div className="border-t border-gray-100 pt-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Calculation Defaults</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cs-tariff" className="label">Grid Tariff (RWF/kWh)</label>
              <input id="cs-tariff" type="number" step="1" value={form.grid_tariff_rwf_kwh ?? ''} onChange={e => set('grid_tariff_rwf_kwh', Number(e.target.value))} className="input" />
            </div>
            <div>
              <label htmlFor="cs-install-pct" className="label">Installation % of hardware</label>
              <input id="cs-install-pct" type="number" step="0.01" min="0" max="1" value={form.installation_pct ?? ''} onChange={e => set('installation_pct', Number(e.target.value))} className="input" />
              <p className="text-xs text-gray-400 mt-1">e.g. 0.10 = 10%</p>
            </div>
            <div>
              <label htmlFor="cs-acc-pct" className="label">Accessories % of hardware</label>
              <input id="cs-acc-pct" type="number" step="0.01" min="0" max="1" value={form.accessories_pct ?? ''} onChange={e => set('accessories_pct', Number(e.target.value))} className="input" />
              <p className="text-xs text-gray-400 mt-1">e.g. 0.08 = 8%</p>
            </div>
            <div>
              <label htmlFor="cs-safety-pct" className="label">Safety Margin %</label>
              <input id="cs-safety-pct" type="number" step="0.01" min="0" max="1" value={form.safety_margin_pct ?? ''} onChange={e => set('safety_margin_pct', Number(e.target.value))} className="input" />
              <p className="text-xs text-gray-400 mt-1">e.g. 0.20 = 20%</p>
            </div>
            <div>
              <label htmlFor="cs-sun-hours" className="label">Peak Sun Hours (hrs/day)</label>
              <input id="cs-sun-hours" type="number" step="0.1" value={form.default_peak_sun_hours ?? ''} onChange={e => set('default_peak_sun_hours', Number(e.target.value))} className="input" />
            </div>
            <div>
              <label htmlFor="cs-backup" className="label">Default Backup (hours)</label>
              <input id="cs-backup" type="number" step="1" value={form.default_backup_hours ?? ''} onChange={e => set('default_backup_hours', Number(e.target.value))} className="input" />
            </div>
            <div>
              <label htmlFor="cs-valid-days" className="label">Quote Valid Days</label>
              <input id="cs-valid-days" type="number" step="1" value={form.default_valid_days ?? ''} onChange={e => set('default_valid_days', Number(e.target.value))} className="input" />
            </div>
          </div>
        </div>

        <div className="pt-1 border-t border-gray-100">
          <button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Company Settings
          </button>
        </div>
      </div>
    </div>
  )
}
