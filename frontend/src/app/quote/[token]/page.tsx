'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { quotesApi } from '@/lib/api'
import { Quote } from '@/types'
import { formatRWF, formatDate, cn } from '@/lib/utils'
import { Sun, Battery, Zap, CheckCircle, XCircle, MessageSquare, Loader2, Cpu } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SharedQuotePage({ params }: { params: { token: string } }) {
  const { token } = params
  const [message, setMessage] = useState('')
  const [feedbackStatus, setFeedbackStatus] = useState<'approved' | 'rejected' | 'pending'>('pending')
  const [submitted, setSubmitted] = useState(false)

  const { data: quote, isLoading, error } = useQuery<Quote>({
    queryKey: ['shared-quote', token],
    queryFn: async () => (await quotesApi.shared(token)).data,
  })

  const feedbackMutation = useMutation({
    mutationFn: () => quotesApi.submitFeedback(token, {
      message, status: feedbackStatus,
      client_name: quote?.client_detail?.name || '',
    }),
    onSuccess: () => {
      setSubmitted(true)
      toast.success('Feedback submitted!')
    },
    onError: () => toast.error('Failed to submit feedback'),
  })

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 size={24} className="animate-spin text-gray-400" />
    </div>
  )

  if (error || !quote) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-500 text-lg">Quote not found</p>
        <p className="text-gray-400 text-sm mt-1">This link may have expired</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#091928] text-white">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">
                Solar<span className="text-[#71AA1F]">Hope</span>
                <span className="text-[#EA9D13]"> Africa</span>
              </p>
              <p className="text-white/50 text-xs">Light Up Dreams, The Solar Way</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-bold text-[#EA9D13]">{quote.ref_number}</p>
              <p className="text-xs text-white/50">Valid until {formatDate(quote.valid_until)}</p>
            </div>
          </div>
        </div>
        {/* Color bars */}
        <div className="h-1 bg-[#EA9D13]" />
        <div className="h-0.5 bg-[#71AA1F]" />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hello, {quote.client_detail?.name} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Here is your personalized solar system proposal from SolarHope Africa.
          </p>
        </div>

        {/* System highlight */}
        <div className="bg-[#091928] rounded-2xl p-6 text-white">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-4">Your Proposed System</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'System Size', val: `${quote.system_size_kwp} kWp` },
              { label: 'Daily Energy', val: `${quote.total_daily_kwh} kWh` },
              { label: 'Solar Panels', val: `${quote.num_panels} pcs` },
              { label: 'Battery Backup', val: `${quote.backup_hours}h` },
            ].map(({ label, val }) => (
              <div key={label} className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-xs text-white/40 mb-1">{label}</p>
                <p className="font-bold text-[#EA9D13] text-lg">{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Components */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900">System Components</h2>
          </div>
          <div className="divide-y divide-gray-50 p-5 space-y-4">
            {quote.panel_detail && (
              <PubCompRow icon={<Sun size={20} className="text-[#EA9D13]" />}
                title="Solar Panels" brand={`${quote.panel_detail.brand} ${quote.panel_detail.model}`}
                spec={`${quote.num_panels} × ${quote.panel_detail.wattage_wp}Wp`}
                warranty={`${quote.panel_detail.warranty_years} years warranty`} />
            )}
            {quote.generator_detail && (
              <PubCompRow icon={<Cpu size={20} className="text-purple-500" />}
                title="All-in-One Generator" brand={`${quote.generator_detail.brand} ${quote.generator_detail.model}`}
                spec={[`${quote.generator_detail.power_kw}kW`, quote.generator_detail.capacity_kwh ? `${quote.generator_detail.capacity_kwh}kWh` : ''].filter(Boolean).join(' · ')}
                warranty={`${quote.generator_detail.warranty_years} years warranty`} />
            )}
            {!quote.is_all_in_one_mode && quote.inverter_detail && (
              <PubCompRow icon={<Zap size={20} className="text-blue-500" />}
                title={quote.num_inverters > 1 ? `Hybrid Inverter ×${quote.num_inverters}` : 'Hybrid Inverter'}
                brand={`${quote.inverter_detail.brand} ${quote.inverter_detail.model}`}
                spec={`${quote.num_inverters > 1 ? quote.num_inverters + '× ' : ''}${quote.inverter_detail.power_kw ?? 0}kW${quote.num_inverters > 1 ? ' = ' + (quote.num_inverters * (quote.inverter_detail.power_kw ?? 0)) + 'kW total' : ''}`}
                warranty={`${quote.inverter_detail.warranty_years} years warranty`} />
            )}
            {!quote.is_all_in_one_mode && quote.battery_detail && (
              <PubCompRow icon={<Battery size={20} className="text-[#71AA1F]" />}
                title={quote.num_batteries > 1 ? `Battery Storage ×${quote.num_batteries}` : 'Battery Storage'}
                brand={`${quote.battery_detail.brand} ${quote.battery_detail.model}`}
                spec={`${quote.num_batteries > 1 ? quote.num_batteries + '× ' : ''}${quote.battery_detail.capacity_kwh ?? 0}kWh${quote.num_batteries > 1 ? ' = ' + (quote.num_batteries * (quote.battery_detail.capacity_kwh ?? 0)).toFixed(1) + 'kWh total' : ''}`}
                warranty={`${quote.battery_detail.warranty_years} years warranty`} />
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Investment Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Solar Panels</span>
              <span className="font-medium">{formatRWF(quote.panels_cost)}</span>
            </div>
            {quote.is_all_in_one_mode ? (
              <div className="flex justify-between text-gray-600">
                <span>All-in-One Generator</span>
                <span className="font-medium">{formatRWF(quote.generator_cost)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Inverter</span>
                  <span className="font-medium">{formatRWF(quote.inverter_cost)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Battery Storage</span>
                  <span className="font-medium">{formatRWF(quote.battery_cost)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Cables &amp; BOS</span>
              <span className="font-medium">{formatRWF(quote.accessories_cost)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Professional Installation</span>
              <span className="font-medium">{formatRWF(quote.installation_cost)}</span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t-2 border-gray-900">
            <span className="font-bold text-lg text-gray-900">Total Investment</span>
            <span className="font-bold text-2xl text-[#EA9D13]">{formatRWF(quote.total_price_rwf)}</span>
          </div>
        </div>

        {/* ROI */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h2 className="font-semibold text-green-800 mb-3">Why solar makes sense for you</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-green-600 text-sm">Annual electricity savings</p>
              <p className="text-2xl font-bold text-green-800">{formatRWF(quote.annual_savings_rwf)}</p>
            </div>
            <div>
              <p className="text-green-600 text-sm">Payback period</p>
              <p className="text-2xl font-bold text-green-800">{quote.payback_years} years</p>
            </div>
          </div>
          {/* <p className="text-xs text-green-600 mt-3">
            Based on RWF {quote.grid_tariff_rwf_kwh}/kWh grid tariff. Your system lasts 25–30 years.
          </p> */}
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-2">Notes from SolarHope</h2>
            <p className="text-sm text-gray-600">{quote.notes}</p>
          </div>
        )}

        {/* Feedback */}
        {quote.status === 'approved' ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <CheckCircle size={32} className="text-green-600 mx-auto mb-3" />
            <h2 className="font-semibold text-green-800">You have approved this quote</h2>
            <p className="text-sm text-green-600 mt-1">Our team will be in touch to schedule your installation.</p>
          </div>
        ) : quote.status === 'rejected' ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <XCircle size={32} className="text-gray-400 mx-auto mb-3" />
            <h2 className="font-semibold text-gray-700">This quote has been declined</h2>
            <p className="text-sm text-gray-500 mt-1">Contact us if you&apos;d like to discuss a revised proposal.</p>
          </div>
        ) : quote.status === 'expired' ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="font-semibold text-amber-700">This quote has expired</p>
            <p className="text-sm text-amber-600 mt-1">Please contact us for an updated quotation.</p>
          </div>
        ) : !submitted ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-gray-500" />
              <h2 className="font-semibold text-gray-900">Your Response</h2>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setFeedbackStatus('approved')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
                  feedbackStatus === 'approved'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-500 hover:border-green-300'
                )}
              >
                <CheckCircle size={18} /> I approve this quote
              </button>
              <button
                onClick={() => setFeedbackStatus('rejected')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
                  feedbackStatus === 'rejected'
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-500 hover:border-red-300'
                )}
              >
                <XCircle size={18} /> Not right for me
              </button>
            </div>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA9D13] resize-none"
              rows={4}
              placeholder="Any questions or comments? We'll get back to you within 24 hours..."
            />
            <button
              onClick={() => feedbackMutation.mutate()}
              disabled={feedbackMutation.isPending || !message.trim()}
              className="mt-3 w-full bg-[#091928] text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {feedbackMutation.isPending && <Loader2 size={16} className="animate-spin" />}
              Submit Response
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <CheckCircle size={32} className="text-green-600 mx-auto mb-3" />
            <h2 className="font-semibold text-green-800">Thank you for your response!</h2>
            <p className="text-sm text-green-600 mt-1">Our team will be in touch with you shortly.</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm font-semibold text-[#091928]">
            Solar<span className="text-[#71AA1F]">Hope</span> Africa
          </p>
          <p className="text-xs text-gray-400 mt-1">+250 780 348 624 · info@solarhopeafrica.com</p>
          <p className="text-xs text-gray-300 mt-1">Light Up Dreams, The Solar Way</p>
        </div>
      </div>
    </div>
  )
}

function PubCompRow({ icon, title, brand, spec, warranty }: {
  icon: React.ReactNode, title: string, brand: string, spec: string, warranty: string
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{title}</p>
        <p className="font-semibold text-gray-900">{brand}</p>
        <p className="text-xs text-gray-400">{spec} · {warranty}</p>
      </div>
    </div>
  )
}
