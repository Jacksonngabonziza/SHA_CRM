'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { clientsApi, quotesApi, productsApi } from '@/lib/api'
import { Appliance, CalculateResult, Client, Product, ProductsByCategory, ProductSummary, Quote } from '@/types'
import { formatRWF } from '@/lib/utils'
import {
  Plus, Trash2, Zap, ArrowLeft, Loader2,
  Sun, Battery, Calculator, Save, Cpu, AlertTriangle, RotateCcw, Pencil,
} from 'lucide-react'
import toast from 'react-hot-toast'

type Preset = { name: string; wattage: number; hours_per_day: number }
type PresetGroup = { label: string; items: Preset[] }

const PRESET_GROUPS: Record<string, PresetGroup[]> = {
  Home: [
    {
      label: 'Lighting',
      items: [
        { name: 'LED Bulb',            wattage: 10,  hours_per_day: 6  },
        { name: 'CFL Bulb',            wattage: 15,  hours_per_day: 6  },
        { name: 'Fluorescent Tube',    wattage: 36,  hours_per_day: 8  },
        { name: 'Security/Yard Light', wattage: 20,  hours_per_day: 10 },
        { name: 'LED Floodlight',      wattage: 50,  hours_per_day: 8  },
      ],
    },
    {
      label: 'Entertainment',
      items: [
        { name: 'LED TV 32"',     wattage: 50,  hours_per_day: 5 },
        { name: 'LED TV 43"',     wattage: 80,  hours_per_day: 5 },
        { name: 'LED TV 55"',     wattage: 120, hours_per_day: 5 },
        { name: 'DSTV Decoder',   wattage: 15,  hours_per_day: 5 },
        { name: 'Radio / Stereo', wattage: 30,  hours_per_day: 4 },
        { name: 'Home Theatre',   wattage: 200, hours_per_day: 3 },
      ],
    },
    {
      label: 'Kitchen',
      items: [
        { name: 'Refrigerator',    wattage: 150,  hours_per_day: 24  },
        { name: 'Chest Freezer',   wattage: 100,  hours_per_day: 24  },
        { name: 'Microwave',       wattage: 1000, hours_per_day: 0.5 },
        { name: 'Electric Kettle', wattage: 2000, hours_per_day: 0.3 },
        { name: 'Blender',         wattage: 300,  hours_per_day: 0.3 },
        { name: 'Rice Cooker',     wattage: 700,  hours_per_day: 1   },
        { name: 'Electric Stove',  wattage: 2000, hours_per_day: 1.5 },
        { name: 'Toaster',         wattage: 800,  hours_per_day: 0.3 },
        { name: 'Food Processor',  wattage: 400,  hours_per_day: 0.5 },
      ],
    },
    {
      label: 'Comfort',
      items: [
        { name: 'Ceiling Fan',   wattage: 75,   hours_per_day: 8 },
        { name: 'Standing Fan',  wattage: 60,   hours_per_day: 8 },
        { name: 'AC 1 HP',       wattage: 750,  hours_per_day: 8 },
        { name: 'AC 1.5 HP',     wattage: 1200, hours_per_day: 8 },
        { name: 'AC 2 HP',       wattage: 1500, hours_per_day: 8 },
      ],
    },
    {
      label: 'Laundry',
      items: [
        { name: 'Washing Machine', wattage: 500,  hours_per_day: 1 },
        { name: 'Electric Iron',   wattage: 1000, hours_per_day: 1 },
        { name: 'Clothes Dryer',   wattage: 3000, hours_per_day: 1 },
      ],
    },
    {
      label: 'Water & Heating',
      items: [
        { name: 'Water Pump',       wattage: 750,  hours_per_day: 2   },
        { name: 'Submersible Pump', wattage: 1500, hours_per_day: 2   },
        { name: 'Water Heater',     wattage: 3000, hours_per_day: 1   },
        { name: 'Instant Shower',   wattage: 3000, hours_per_day: 0.5 },
      ],
    },
    {
      label: 'Tech & Security',
      items: [
        { name: 'Phone Charger',  wattage: 15,  hours_per_day: 3  },
        { name: 'Laptop',         wattage: 65,  hours_per_day: 6  },
        { name: 'Desktop PC',     wattage: 150, hours_per_day: 8  },
        { name: 'Printer',        wattage: 50,  hours_per_day: 2  },
        { name: 'WiFi Router',    wattage: 15,  hours_per_day: 24 },
        { name: 'CCTV (4 cams)',  wattage: 50,  hours_per_day: 24 },
      ],
    },
  ],
  School: [
    {
      label: 'Lighting',
      items: [
        { name: 'Classroom Fluorescent', wattage: 72,  hours_per_day: 10 },
        { name: 'Corridor Light',        wattage: 20,  hours_per_day: 12 },
        { name: 'Outdoor Security',      wattage: 50,  hours_per_day: 12 },
      ],
    },
    {
      label: 'Classrooms & Labs',
      items: [
        { name: 'Projector',      wattage: 300, hours_per_day: 6 },
        { name: 'Smart Board',    wattage: 100, hours_per_day: 6 },
        { name: 'Desktop PC',     wattage: 150, hours_per_day: 6 },
        { name: 'Laptop',         wattage: 65,  hours_per_day: 6 },
        { name: 'Lab Equipment',  wattage: 500, hours_per_day: 4 },
        { name: 'PA System',      wattage: 200, hours_per_day: 6 },
      ],
    },
    {
      label: 'Admin & Office',
      items: [
        { name: 'Photocopier',       wattage: 1000, hours_per_day: 2  },
        { name: 'Printer',           wattage: 50,   hours_per_day: 4  },
        { name: 'Server / NAS',      wattage: 200,  hours_per_day: 24 },
        { name: 'WiFi Access Point', wattage: 15,   hours_per_day: 24 },
        { name: 'CCTV System',       wattage: 100,  hours_per_day: 24 },
        { name: 'Intercom System',   wattage: 30,   hours_per_day: 24 },
      ],
    },
    {
      label: 'Comfort',
      items: [
        { name: 'Ceiling Fan',  wattage: 75,   hours_per_day: 8  },
        { name: 'AC 1.5 HP',    wattage: 1200, hours_per_day: 8  },
        { name: 'Water Cooler', wattage: 100,  hours_per_day: 8  },
      ],
    },
  ],
  'Hotel / Apt': [
    {
      label: 'Guest Room (per room)',
      items: [
        { name: 'AC 1.5 HP',       wattage: 1200, hours_per_day: 10 },
        { name: 'LED TV 43"',      wattage: 80,   hours_per_day: 5  },
        { name: 'Mini Fridge',     wattage: 60,   hours_per_day: 24 },
        { name: 'LED Bulb',        wattage: 10,   hours_per_day: 6  },
        { name: 'Bathroom Heater', wattage: 2000, hours_per_day: 0.5},
        { name: 'Hair Dryer',      wattage: 1800, hours_per_day: 0.3},
        { name: 'Phone Charger',   wattage: 15,   hours_per_day: 3  },
      ],
    },
    {
      label: 'Common Areas',
      items: [
        { name: 'Elevator',         wattage: 5000, hours_per_day: 4  },
        { name: 'Lobby AC',         wattage: 2000, hours_per_day: 12 },
        { name: 'Pool Pump',        wattage: 1500, hours_per_day: 6  },
        { name: 'Water Heater',     wattage: 3000, hours_per_day: 4  },
        { name: 'WiFi Router',      wattage: 15,   hours_per_day: 24 },
        { name: 'CCTV System',      wattage: 150,  hours_per_day: 24 },
        { name: 'Corridor Lights',  wattage: 20,   hours_per_day: 12 },
      ],
    },
    {
      label: 'Commercial Kitchen',
      items: [
        { name: 'Commercial Fridge',    wattage: 500,  hours_per_day: 24 },
        { name: 'Commercial Freezer',   wattage: 600,  hours_per_day: 24 },
        { name: 'Microwave (large)',    wattage: 2000, hours_per_day: 2  },
        { name: 'Electric Cooker',      wattage: 3000, hours_per_day: 3  },
        { name: 'Food Warmer',          wattage: 1000, hours_per_day: 4  },
        { name: 'Dishwasher',           wattage: 2000, hours_per_day: 2  },
        { name: 'Exhaust Fan',          wattage: 100,  hours_per_day: 8  },
      ],
    },
    {
      label: 'Laundry',
      items: [
        { name: 'Commercial Washer',  wattage: 2000, hours_per_day: 4 },
        { name: 'Commercial Dryer',   wattage: 4000, hours_per_day: 4 },
        { name: 'Electric Iron',      wattage: 1000, hours_per_day: 4 },
      ],
    },
  ],
}

export default function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('client')
  const editId = searchParams.get('edit')   // present when editing an existing quote

  const [presetCategory, setPresetCategory] = useState<keyof typeof PRESET_GROUPS>('Home')
  const [clientId, setClientId] = useState(preselectedClientId || '')
  const [appliances, setAppliances] = useState<Appliance[]>([
    { name: 'LED Light', quantity: 4, wattage: 10, hours_per_day: 8 },
  ])
  const [backupHours, setBackupHours] = useState(8)
  const [notes, setNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [result, setResult] = useState<CalculateResult | null>(null)
  const [overridePanel, setOverridePanel] = useState('')
  const [overrideBattery, setOverrideBattery] = useState('')
  const [overrideInverter, setOverrideInverter] = useState('')
  const [overrideGenerator, setOverrideGenerator] = useState('')

  // Editable quantity overrides
  const [numPanels, setNumPanels] = useState(0)
  const [numInverters, setNumInverters] = useState(1)
  const [numBatteries, setNumBatteries] = useState(1)

  // Editable price overrides — seeded from calculation, freely editable
  const [prices, setPrices] = useState({
    panels_cost: 0, inverter_cost: 0, battery_cost: 0,
    generator_cost: 0, accessories_cost: 0, installation_cost: 0,
  })

  // Sync quantities and prices whenever a new calculation result arrives
  useEffect(() => {
    if (result) {
      setNumPanels(result.num_panels)
      setNumInverters(result.num_inverters)
      setNumBatteries(result.num_batteries)
      setPrices({
        panels_cost:      result.panels_cost,
        inverter_cost:    result.inverter_cost,
        battery_cost:     result.battery_cost,
        generator_cost:   result.generator_cost,
        accessories_cost: result.accessories_cost,
        installation_cost: result.installation_cost,
      })
    }
  }, [result])

  // Fetch existing quote when in edit mode
  const { data: editQuote } = useQuery<Quote>({
    queryKey: ['quote-edit', editId],
    queryFn: async () => (await quotesApi.get(Number.parseInt(editId!))).data,
    enabled: !!editId,
  })

  // Prefill all state once the quote is loaded
  useEffect(() => {
    if (!editQuote) return
    setClientId(String(editQuote.client))
    setAppliances(editQuote.appliances.length ? editQuote.appliances : [
      { name: 'LED Light', quantity: 4, wattage: 10, hours_per_day: 8 },
    ])
    setBackupHours(editQuote.backup_hours)
    setNotes(editQuote.notes || '')
    setInternalNotes(editQuote.internal_notes || '')
    if (editQuote.panel)     setOverridePanel(String(editQuote.panel))
    if (editQuote.battery)   setOverrideBattery(String(editQuote.battery))
    if (editQuote.inverter)  setOverrideInverter(String(editQuote.inverter))
    if (editQuote.generator) setOverrideGenerator(String(editQuote.generator))
    // Restore the previous result so prices / qty fields are editable immediately
    setResult({
      panel:           editQuote.panel_detail as unknown as ProductSummary,
      battery:         editQuote.battery_detail as unknown as ProductSummary,
      inverter:        editQuote.inverter_detail as unknown as ProductSummary,
      generator:       editQuote.generator_detail as unknown as ProductSummary,
      is_all_in_one_mode:  editQuote.is_all_in_one_mode,
      total_daily_kwh:     editQuote.total_daily_kwh,
      design_daily_kwh:    editQuote.design_daily_kwh,
      system_size_kwp:     editQuote.system_size_kwp,
      max_load_kw:         editQuote.max_load_kw,
      num_panels:          editQuote.num_panels,
      num_inverters:       editQuote.num_inverters,
      num_batteries:       editQuote.num_batteries,
      panels_cost:         Number(editQuote.panels_cost),
      inverter_cost:       Number(editQuote.inverter_cost),
      battery_cost:        Number(editQuote.battery_cost),
      generator_cost:      Number(editQuote.generator_cost),
      accessories_cost:    Number(editQuote.accessories_cost),
      installation_cost:   Number(editQuote.installation_cost),
      annual_savings_rwf:  Number(editQuote.annual_savings_rwf),
      payback_years:       Number(editQuote.payback_years),
      grid_tariff_rwf_kwh: Number(editQuote.grid_tariff_rwf_kwh),
      total_price_rwf:     Number(editQuote.total_price_rwf),
      backup_hours:        Number(editQuote.backup_hours),
      peak_sun_hours:      Number(editQuote.peak_sun_hours),
      appliances:          editQuote.appliances,
      validation_warnings: [],
      required_battery_kwh: 0,
      total_pv_w:          0,
    })
    setPrices({
      panels_cost:      Number(editQuote.panels_cost),
      inverter_cost:    Number(editQuote.inverter_cost),
      battery_cost:     Number(editQuote.battery_cost),
      generator_cost:   Number(editQuote.generator_cost),
      accessories_cost: Number(editQuote.accessories_cost),
      installation_cost: Number(editQuote.installation_cost),
    })
    setNumPanels(Number(editQuote.num_panels))
    setNumInverters(Number(editQuote.num_inverters))
    setNumBatteries(Number(editQuote.num_batteries))
  }, [editQuote])

  const setPrice = (field: string, raw: string) => {
    const val = parseFloat(raw)
    if (!Number.isNaN(val) && val >= 0) setPrices(p => ({ ...p, [field]: val }))
  }

  const changeNumPanels = (raw: string) => {
    const n = Math.max(1, parseInt(raw) || 1)
    setNumPanels(n)
    if (result?.panel?.price_rwf)
      setPrices(p => ({ ...p, panels_cost: Math.round(n * result.panel!.price_rwf) }))
  }

  const changeNumInverters = (raw: string) => {
    const n = Math.max(1, parseInt(raw) || 1)
    setNumInverters(n)
    if (result?.inverter?.price_rwf)
      setPrices(p => ({ ...p, inverter_cost: Math.round(n * result.inverter!.price_rwf) }))
  }

  const changeNumBatteries = (raw: string) => {
    const n = Math.max(1, parseInt(raw) || 1)
    setNumBatteries(n)
    if (result?.battery?.price_rwf)
      setPrices(p => ({ ...p, battery_cost: Math.round(n * result.battery!.price_rwf) }))
  }

  const resetPrices = () => {
    if (result) {
      setNumPanels(result.num_panels)
      setNumInverters(result.num_inverters)
      setNumBatteries(result.num_batteries)
      setPrices({
      panels_cost:      result.panels_cost,
      inverter_cost:    result.inverter_cost,
      battery_cost:     result.battery_cost,
      generator_cost:   result.generator_cost,
      accessories_cost: result.accessories_cost,
      installation_cost: result.installation_cost,
      })
    }
  }

  const isPriceModified = result && (
    numPanels               !== result.num_panels        ||
    numInverters            !== result.num_inverters     ||
    numBatteries            !== result.num_batteries     ||
    prices.panels_cost      !== result.panels_cost      ||
    prices.inverter_cost    !== result.inverter_cost    ||
    prices.battery_cost     !== result.battery_cost     ||
    prices.generator_cost   !== result.generator_cost   ||
    prices.accessories_cost !== result.accessories_cost ||
    prices.installation_cost !== result.installation_cost
  )

  const customTotal = result
    ? (result.is_all_in_one_mode
        ? prices.panels_cost + prices.generator_cost
        : prices.panels_cost + prices.inverter_cost + prices.battery_cost)
      + prices.accessories_cost + prices.installation_cost
    : 0

  // When a generator is selected, fetch compatible panels
  const { data: compatiblePanels } = useQuery<Product[]>({
    queryKey: ['compatible-panels', overrideGenerator],
    queryFn: async () => (await productsApi.compatiblePanels(Number.parseInt(overrideGenerator))).data,
    enabled: !!overrideGenerator,
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients-search'],
    queryFn: async () => (await clientsApi.list()).data,
  })
  const { data: products } = useQuery<ProductsByCategory>({
    queryKey: ['products-by-category'],
    queryFn: async () => (await productsApi.byCategory()).data,
  })

  const clients: Client[] = clientsData?.results || clientsData || []

  const panelOptions = overrideGenerator && compatiblePanels?.length
    ? compatiblePanels
    : products?.panels ?? []

  const calcMutation = useMutation({
    mutationFn: () => quotesApi.calculate({
      appliances: appliances.filter(a => a.name && a.wattage > 0),
      backup_hours: backupHours,
      panel_id:     overridePanel     ? Number.parseInt(overridePanel)     : null,
      battery_id:   overrideBattery   ? Number.parseInt(overrideBattery)   : null,
      inverter_id:  overrideInverter  ? Number.parseInt(overrideInverter)  : null,
      generator_id: overrideGenerator ? Number.parseInt(overrideGenerator) : null,
    }),
    onSuccess: (res) => {
      setResult(res.data)
      toast.success('System designed!')
    },
    onError: () => toast.error('Calculation failed. Check products catalogue.'),
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!result) throw new Error('Calculate first')
      const payload = {
        client:           Number.parseInt(clientId),
        appliances:       appliances.filter(a => a.name && a.wattage > 0),
        backup_hours:     backupHours,
        panel:            result.panel?.id      || null,
        battery:          result.battery?.id   || null,
        inverter:         result.inverter?.id  || null,
        generator:        result.generator?.id || null,
        is_all_in_one_mode: result.is_all_in_one_mode,
        total_daily_kwh:  result.total_daily_kwh,
        design_daily_kwh: result.design_daily_kwh,
        system_size_kwp:  result.system_size_kwp,
        max_load_kw:      result.max_load_kw,
        num_panels:       numPanels,
        num_inverters:    numInverters,
        num_batteries:    numBatteries,
        panels_cost:      prices.panels_cost,
        battery_cost:     prices.battery_cost,
        inverter_cost:    prices.inverter_cost,
        generator_cost:   prices.generator_cost,
        accessories_cost: prices.accessories_cost,
        installation_cost: prices.installation_cost,
        total_price_rwf:  customTotal,
        annual_savings_rwf: result.annual_savings_rwf,
        payback_years:    result.payback_years,
        grid_tariff_rwf_kwh: result.grid_tariff_rwf_kwh || 89,
        notes,
        internal_notes: internalNotes,
      }
      return editId
        ? quotesApi.update(Number.parseInt(editId), payload)
        : quotesApi.create(payload)
    },
    onSuccess: (res) => {
      toast.success(editId ? 'Quote updated!' : 'Quote saved!')
      router.push(`/quotes/${res.data.id}`)
    },
    onError: () => toast.error('Failed to save quote'),
  })

  const addAppliance = (preset?: Preset) => {
    setAppliances(prev => [...prev, {
      name: preset?.name || '',
      quantity: 1,
      wattage: preset?.wattage || 0,
      hours_per_day: preset?.hours_per_day || 0,
    }])
  }

  const updateAppliance = (i: number, field: keyof Appliance, value: string | number) => {
    setAppliances(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a))
  }

  const removeAppliance = (i: number) => {
    setAppliances(prev => prev.filter((_, idx) => idx !== i))
  }

  const totalDailyKwh = appliances.reduce((sum, a) =>
    sum + (Number(a.quantity) * Number(a.wattage) * Number(a.hours_per_day) / 1000), 0
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>{editId ? `Edit Quote` : 'New Quotation'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {editId && editQuote ? `${editQuote.ref_number} · ` : ''}
            {editId ? 'Update the system design and pricing' : 'Design a solar system and generate a quote'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Input */}
        <div className="lg:col-span-3 space-y-5">

          {/* Client selection */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#091928] text-white text-xs flex items-center justify-center font-bold">1</span>
              {' '}Select Client
            </h3>
            <label htmlFor="quote-client" className="sr-only">Client</label>
            <select
              id="quote-client"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="input"
              required
            >
              <option value="">— Select a client —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone}{c.location ? ` · ${c.location}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Appliances */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#091928] text-white text-xs flex items-center justify-center font-bold">2</span>
                {' '}Appliances &amp; Load
              </h3>
              <span className="text-sm font-semibold text-[#EA9D13]">
                {totalDailyKwh.toFixed(2)} kWh/day
              </span>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1.5 mb-3 border-b border-gray-100 pb-2">
              {(Object.keys(PRESET_GROUPS) as (keyof typeof PRESET_GROUPS)[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setPresetCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    presetCategory === cat
                      ? 'bg-[#091928] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grouped presets */}
            <div className="space-y-2 mb-4 max-h-52 overflow-y-auto pr-1">
              {PRESET_GROUPS[presetCategory].map(group => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{group.label}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {group.items.map(p => (
                      <button
                        key={p.name}
                        onClick={() => addAppliance(p)}
                        className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-amber-100 hover:text-amber-800 rounded-full transition-colors text-gray-600"
                      >
                        + {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {/* Table header — desktop only */}
              <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                <div className="col-span-4">Appliance</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Watts</div>
                <div className="col-span-2">Hrs/day</div>
                <div className="col-span-1">kWh</div>
                <div className="col-span-1"></div>
              </div>

              {appliances.map((a, i) => {
                const kwh = (Number(a.quantity) * Number(a.wattage) * Number(a.hours_per_day) / 1000)
                const key = `${a.name || 'item'}-${i}`
                return (
                  <div key={key}>
                    {/* Mobile: stacked card */}
                    <div className="sm:hidden grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="col-span-2 flex items-center gap-2">
                        <input value={a.name} onChange={e => updateAppliance(i, 'name', e.target.value)}
                          className="input text-sm py-1.5 flex-1" placeholder="Appliance name" />
                        <button onClick={() => removeAppliance(i)} className="text-gray-300 hover:text-red-500 shrink-0 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Qty</p>
                        <input type="number" min="1" value={a.quantity}
                          onChange={e => updateAppliance(i, 'quantity', Number(e.target.value))}
                          className="input text-sm py-1.5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Watts</p>
                        <input type="number" min="0" value={a.wattage}
                          onChange={e => updateAppliance(i, 'wattage', Number(e.target.value))}
                          className="input text-sm py-1.5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Hrs/day</p>
                        <input type="number" min="0" max="24" step="0.5" value={a.hours_per_day}
                          onChange={e => updateAppliance(i, 'hours_per_day', Number(e.target.value))}
                          className="input text-sm py-1.5" />
                      </div>
                      <div className="flex items-end pb-1">
                        <span className="text-sm font-semibold text-[#EA9D13]">{kwh.toFixed(2)} kWh</span>
                      </div>
                    </div>
                    {/* Desktop: table row */}
                    <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <input value={a.name} onChange={e => updateAppliance(i, 'name', e.target.value)}
                          className="input text-sm py-1.5" placeholder="Appliance name" />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="1" value={a.quantity}
                          onChange={e => updateAppliance(i, 'quantity', Number(e.target.value))}
                          className="input text-sm py-1.5" />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0" value={a.wattage}
                          onChange={e => updateAppliance(i, 'wattage', Number(e.target.value))}
                          className="input text-sm py-1.5" />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0" max="24" step="0.5" value={a.hours_per_day}
                          onChange={e => updateAppliance(i, 'hours_per_day', Number(e.target.value))}
                          className="input text-sm py-1.5" />
                      </div>
                      <div className="col-span-1 text-xs font-medium text-[#EA9D13] text-center">
                        {kwh.toFixed(2)}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button onClick={() => removeAppliance(i)} className="text-gray-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              <button onClick={() => addAppliance()} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 mt-2">
                <Plus size={15} /> Add appliance manually
              </button>
            </div>
          </div>

          {/* System preferences */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#091928] text-white text-xs flex items-center justify-center font-bold">3</span>
              {' '}System Preferences
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="backup-hours" className="label">Battery Backup Hours</label>
                <select id="backup-hours" value={backupHours} onChange={e => setBackupHours(Number(e.target.value))} className="input">
                  {[4, 6, 8, 10, 12, 16, 24].map(h => (
                    <option key={h} value={h}>{h}h backup</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="override-generator" className="label">Generator (optional)</label>
                <select id="override-generator" value={overrideGenerator} onChange={e => { setOverrideGenerator(e.target.value); setOverridePanel('') }} className="input">
                  <option value="">None</option>
                  {(products?.generators ?? []).map(p => (
                    <option key={p.id} value={p.id}>{p.brand} {p.model} — {p.power_kw}kW</option>
                  ))}
                </select>
                {overrideGenerator && compatiblePanels && compatiblePanels.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">{compatiblePanels.length} compatible panels available</p>
                )}
              </div>

              <div>
                <label htmlFor="override-panel" className="label">Override Panel</label>
                <select id="override-panel" value={overridePanel} onChange={e => setOverridePanel(e.target.value)} className="input">
                  <option value="">Auto-select (recommended)</option>
                  {panelOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.brand} {p.model} — {p.wattage_wp}Wp</option>
                  ))}
                </select>
              </div>

              {!overrideGenerator && (
                <div>
                  <label htmlFor="override-battery" className="label">Override Battery</label>
                  <select id="override-battery" value={overrideBattery} onChange={e => setOverrideBattery(e.target.value)} className="input">
                    <option value="">Auto-select (recommended)</option>
                    {(products?.batteries ?? []).map(p => (
                      <option key={p.id} value={p.id}>{p.brand} {p.model} — {p.capacity_kwh}kWh</option>
                    ))}
                  </select>
                </div>
              )}

              {!overrideGenerator && (
                <div>
                  <label htmlFor="override-inverter" className="label">Override Inverter</label>
                  <select id="override-inverter" value={overrideInverter} onChange={e => setOverrideInverter(e.target.value)} className="input">
                    <option value="">Auto-select (recommended)</option>
                    {(products?.inverters ?? []).map(p => (
                      <option key={p.id} value={p.id}>{p.brand} {p.model} — {p.power_kw}kW</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#091928] text-white text-xs flex items-center justify-center font-bold">4</span>
              {' '}Notes
            </h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="quote-notes" className="label">Client-facing notes (shown on PDF)</label>
                <textarea id="quote-notes" value={notes} onChange={e => setNotes(e.target.value)}
                  className="input resize-none" rows={3} placeholder="Any notes to include on the quote..." />
              </div>
              <div>
                <label htmlFor="quote-internal-notes" className="label">Internal notes (not on PDF)</label>
                <textarea id="quote-internal-notes" value={internalNotes} onChange={e => setInternalNotes(e.target.value)}
                  className="input resize-none" rows={2} placeholder="Internal observations..." />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Result */}
        <div className="lg:col-span-2 space-y-4">
          <button
            onClick={() => calcMutation.mutate()}
            disabled={calcMutation.isPending || appliances.length === 0 || !clientId}
            className="btn-amber w-full justify-center py-3 text-base"
          >
            {calcMutation.isPending
              ? <><Loader2 size={18} className="animate-spin" /> Designing...</>
              : <><Calculator size={18} /> Design System</>
            }
          </button>

          {!result && (
            <div className="card p-6 text-center text-gray-400">
              <Calculator size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Add appliances and click Design System to auto-calculate</p>
            </div>
          )}

          {result && (
            <>
              <div className="bg-[#091928] rounded-xl p-5 text-white">
                <p className="text-xs text-white/50 uppercase tracking-wider mb-3">System Design</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'System Size', val: `${result.system_size_kwp} kWp` },
                    { label: 'Daily Load',  val: `${result.total_daily_kwh} kWh` },
                    { label: 'Panels',      val: `${numPanels} pcs` },
                    { label: 'Backup',      val: `${result.backup_hours}h` },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-white/40">{label}</p>
                      <p className="font-bold text-[#EA9D13] text-sm mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {result.validation_warnings?.length > 0 && (
                <div className="card p-4 bg-amber-50 border-amber-200 space-y-1">
                  {result.validation_warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="section-title mb-0">Selected Components</p>
                  <p className="text-xs text-gray-400">Edit qty to match actual install</p>
                </div>
                {result.panel && (
                  <QtyComponentRow
                    icon={<Sun size={16} className="text-[#EA9D13]" />}
                    label="Panel"
                    value={`${result.panel.brand} ${result.panel.model}`}
                    spec={`${result.panel.wattage_wp}Wp each`}
                    qty={numPanels}
                    calcQty={result.num_panels}
                    onQtyChange={changeNumPanels}
                    price={prices.panels_cost}
                  />
                )}
                {result.generator && (
                  <ComponentRow icon={<Cpu size={16} className="text-purple-500" />}
                    label="All-in-One Generator" value={`${result.generator.brand} ${result.generator.model}`}
                    spec={`${result.generator.power_kw}kW${result.generator.builtin_capacity_kwh ? ` · ${result.generator.builtin_capacity_kwh}kWh` : ''}`}
                    price={result.generator_cost} />
                )}
                {!result.is_all_in_one_mode && result.inverter && (
                  <QtyComponentRow
                    icon={<Zap size={16} className="text-blue-500" />}
                    label="Inverter"
                    value={`${result.inverter.brand} ${result.inverter.model}`}
                    spec={`${result.inverter.power_kw ?? 0}kW each`}
                    qty={numInverters}
                    calcQty={result.num_inverters}
                    onQtyChange={changeNumInverters}
                    price={prices.inverter_cost}
                  />
                )}
                {!result.is_all_in_one_mode && result.battery && (
                  <QtyComponentRow
                    icon={<Battery size={16} className="text-[#71AA1F]" />}
                    label="Battery"
                    value={`${result.battery.brand} ${result.battery.model}`}
                    spec={`${result.battery.capacity_kwh}kWh each`}
                    qty={numBatteries}
                    calcQty={result.num_batteries}
                    onQtyChange={changeNumBatteries}
                    price={prices.battery_cost}
                  />
                )}
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="section-title mb-0">Pricing Breakdown</p>
                    <Pencil size={12} className="text-gray-400" />
                  </div>
                  {isPriceModified && (
                    <button
                      onClick={resetPrices}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <RotateCcw size={11} /> Reset
                    </button>
                  )}
                </div>
                {isPriceModified && (
                  <div className="mb-3 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center gap-1.5">
                    <Pencil size={11} /> Prices modified — saving custom total
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  <PriceRow label="Panels" field="panels_cost"
                    value={prices.panels_cost} calculated={result.panels_cost}
                    onChange={setPrice} />
                  {result.is_all_in_one_mode ? (
                    <PriceRow label="All-in-One Generator" field="generator_cost"
                      value={prices.generator_cost} calculated={result.generator_cost}
                      onChange={setPrice} />
                  ) : (
                    <>
                      <PriceRow label="Inverter" field="inverter_cost"
                        value={prices.inverter_cost} calculated={result.inverter_cost}
                        onChange={setPrice} />
                      <PriceRow label="Battery" field="battery_cost"
                        value={prices.battery_cost} calculated={result.battery_cost}
                        onChange={setPrice} />
                    </>
                  )}
                  <PriceRow label="Cables & BOS" field="accessories_cost"
                    value={prices.accessories_cost} calculated={result.accessories_cost}
                    onChange={setPrice} />
                  <PriceRow label="Installation" field="installation_cost"
                    value={prices.installation_cost} calculated={result.installation_cost}
                    onChange={setPrice} />
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100 text-gray-900">
                    <span>Total</span>
                    <div className="text-right">
                      <span className="text-[#EA9D13]">{formatRWF(customTotal)}</span>
                      {isPriceModified && (
                        <p className="text-xs text-gray-400 font-normal line-through">{formatRWF(result.total_price_rwf)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-4 bg-green-50 border-green-200">
                <p className="section-title text-green-700">Return on Investment</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <p className="text-xs text-green-600">Annual savings</p>
                    <p className="font-bold text-green-800">{formatRWF(result.annual_savings_rwf)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Payback period</p>
                    <p className="font-bold text-green-800">{result.payback_years} years</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !clientId}
                className="btn-green w-full justify-center py-3 text-base"
              >
                {saveMutation.isPending
                  ? <><Loader2 size={18} className="animate-spin" /> Saving...</>
                  : <><Save size={18} /> {editId ? 'Update Quote' : 'Save Quote'}</>
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PriceRow({ label, field, value, calculated, onChange }: {
  readonly label: string
  readonly field: string
  readonly value: number
  readonly calculated: number
  readonly onChange: (field: string, raw: string) => void
}) {
  const isModified = value !== calculated
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-600 text-sm shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        {isModified && (
          <span className="text-xs text-gray-400 line-through">{new Intl.NumberFormat('rw-RW').format(calculated)}</span>
        )}
        <input
          type="number"
          min="0"
          step="1000"
          value={value}
          onChange={e => onChange(field, e.target.value)}
          className="w-28 sm:w-36 input text-sm py-1 text-right font-semibold"
        />
      </div>
    </div>
  )
}

function ComponentRow({ icon, label, value, spec, price }: {
  readonly icon: React.ReactNode
  readonly label: string
  readonly value: string
  readonly spec: string
  readonly price: number
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-medium text-gray-800">{value}</p>
          <p className="text-xs text-gray-400">{spec}</p>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-700">{formatRWF(price)}</p>
    </div>
  )
}

function QtyComponentRow({ icon, label, value, spec, qty, calcQty, onQtyChange, price }: {
  readonly icon: React.ReactNode
  readonly label: string
  readonly value: string
  readonly spec: string
  readonly qty: number
  readonly calcQty: number
  readonly onQtyChange: (raw: string) => void
  readonly price: number
}) {
  const isModified = qty !== calcQty
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
          <p className="text-xs text-gray-400">{spec}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          {isModified && (
            <span className="text-xs text-gray-400 line-through">{calcQty}</span>
          )}
          <input
            type="number"
            min="1"
            value={qty}
            onChange={e => onQtyChange(e.target.value)}
            className="w-14 input text-sm py-1 text-center font-semibold"
            title="Adjust quantity"
          />
          <span className="text-xs text-gray-400">pcs</span>
        </div>
        <p className="text-sm font-semibold text-[#EA9D13] w-28 text-right">
          {new Intl.NumberFormat('rw-RW').format(price)} RWF
        </p>
      </div>
    </div>
  )
}
