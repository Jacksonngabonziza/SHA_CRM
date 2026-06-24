'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { whatsappApi } from '@/lib/api'
import { WAConversation, WAConversationDetail, WAMessage } from '@/types'
import {
  Search, RefreshCw, Send, CheckCheck, Check, Bot, User2,
  ExternalLink, CircleCheck, Info, X, MapPin, Home,
  Building2, Zap, Sun, Wallet, MessageSquare, ArrowLeft,
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'

// ── Demo preview data (shown when API has no conversations yet) ───────────────

const _t = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
const _d = (days: number, h = 0, mins = 0) => new Date(Date.now() - (days * 1440 + h * 60 + mins) * 60_000).toISOString()

const DEMO_CONVS: WAConversation[] = [
  {
    id: 9001, wa_id: '250788123456', display_name: 'Jean Paul Nkurunziza',
    status: 'human', language: 'en', bot_step: 9, unread_count: 2,
    last_message_at: _t(8), created_at: _t(42),
    client: null, client_name: null, assigned_to: null, assigned_to_name: null,
    last_message_preview: 'Hi, when can I expect a call from your team?',
  },
  {
    id: 9002, wa_id: '250722334455', display_name: 'Uwimana Marie',
    status: 'bot', language: 'fr', bot_step: 4, unread_count: 1,
    last_message_at: _t(23), created_at: _t(30),
    client: null, client_name: null, assigned_to: null, assigned_to_name: null,
    last_message_preview: '→ Got it! Is the solar system for your home or business?',
  },
  {
    id: 9003, wa_id: '250789654321', display_name: 'Kamanzi Alexis',
    status: 'transferred', language: 'rw', bot_step: 9, unread_count: 0,
    last_message_at: _d(1, 3), created_at: _d(1, 5),
    client: null, client_name: null, assigned_to: null, assigned_to_name: null,
    last_message_preview: '→ Transferred to your main WhatsApp',
  },
  {
    id: 9004, wa_id: '250784112233', display_name: 'Amina Hassan',
    status: 'resolved', language: 'en', bot_step: 9, unread_count: 0,
    last_message_at: _d(2, 1), created_at: _d(2, 3),
    client: 42, client_name: 'Amina Hassan', assigned_to: null, assigned_to_name: null,
    last_message_preview: 'Perfect, thank you! Looking forward to the visit 🙏',
  },
  {
    id: 9005, wa_id: '250791234567', display_name: 'Patrick Habimana',
    status: 'bot', language: 'en', bot_step: 2, unread_count: 1,
    last_message_at: _t(45), created_at: _t(46),
    client: null, client_name: null, assigned_to: null, assigned_to_name: null,
    last_message_preview: '→ What\'s your name?',
  },
]

const _msg = (id: number, waMsgId: string | null, dir: 'inbound' | 'outbound', body: string, ts: string, sentBy: number | null = null, sentByName: string | null = null): WAMessage => ({
  id, wa_message_id: waMsgId, direction: dir, message_type: 'text', body,
  sent_by: sentBy, sent_by_name: sentByName, status: dir === 'outbound' ? 'read' : 'sent', timestamp: ts,
})

const DEMO_DETAILS: Record<number, WAConversationDetail> = {
  9001: {
    ...DEMO_CONVS[0],
    bot_data: {
      name: 'Jean Paul', location: 'Gasabo, Kigali', place_type: 'home',
      power_situation: 'unreliable', has_power: true, solar_goal: 'backup',
      bill_rwf: 48000, estimated_daily_kwh: 7.8, budget: '2_5m',
    },
    messages: [
      _msg(1, 'wamid.001', 'inbound',  'Hello',                                                                     _t(42)),
      _msg(2, null,         'outbound', 'Hello! 👋 Welcome to *SolarHope Africa*.\nPlease choose your language / Hitamo ururimi / Choisissez votre langue:\n\n*1* — English\n*2* — Kinyarwanda\n*3* — Français', _t(41)),
      _msg(3, 'wamid.003', 'inbound',  '1',                                                                          _t(40)),
      _msg(4, null,         'outbound', "Great! 😊 I'm *SHA*, your solar assistant. One of our experts will follow up with you shortly — just a few quick questions first.\n\nWhat's your name?", _t(40)),
      _msg(5, 'wamid.005', 'inbound',  'Jean Paul',                                                                  _t(39)),
      _msg(6, null,         'outbound', 'Nice to meet you, *Jean Paul*! 😊 Which district or area are you located in?', _t(39)),
      _msg(7, 'wamid.007', 'inbound',  'Gasabo, Kigali',                                                             _t(38)),
      _msg(8, null,         'outbound', "Got it! Is the solar system for your *home* or your *business*?\n\n*1* — Home 🏠\n*2* — Business 🏢", _t(38)),
      _msg(9, 'wamid.009', 'inbound',  '1',                                                                          _t(37)),
      _msg(10, null,        'outbound', "Do you currently have electricity at your place?\n\n*1* — Yes, I have electricity (REG / RURA connected)\n*2* — No electricity at all\n*3* — I have electricity but it's very unreliable", _t(37)),
      _msg(11, 'wamid.011', 'inbound', '3',                                                                          _t(36)),
      _msg(12, null,        'outbound', "Understood! Are you looking for solar to *work alongside* your electricity, or go *fully off-grid*?\n\n*1* — Backup only — solar kicks in when power goes off\n*2* — Full solar — stop paying electricity bills completely\n*3* — Not sure yet, I need advice", _t(36)),
      _msg(13, 'wamid.013', 'inbound', '1',                                                                          _t(35)),
      _msg(14, null,        'outbound', "This helps us recommend the right size for you 👇\n\nHow much do you spend on electricity per month approximately? _(just type the amount in RWF — your best guess is fine!)_", _t(35)),
      _msg(15, 'wamid.015', 'inbound', '48000',                                                                      _t(34)),
      _msg(16, null,        'outbound', "Almost done! 😊 Do you have a rough budget in mind for the solar installation?\n\n*1* — Under 2 million RWF\n*2* — 2 to 5 million RWF\n*3* — Above 5 million RWF\n*4* — No idea yet — I need guidance", _t(34)),
      _msg(17, 'wamid.017', 'inbound', '2',                                                                          _t(33)),
      _msg(18, null,        'outbound', "Thank you, *Jean Paul*! ✅\n\nYou're all set. One of our solar experts will reach out to you on this WhatsApp within *2 hours* to give you a free personalised recommendation and quote.\n\nIf it's after hours, expect a message first thing tomorrow morning! 🌞\n\n_SolarHope Africa — Light Up Dreams, The Solar Way_", _t(33)),
      _msg(19, 'wamid.019', 'inbound', 'Okay thank you!',                                                            _t(20)),
      _msg(20, 'wamid.020', 'inbound', 'Hi, when can I expect a call from your team?',                               _t(8)),
    ],
  },
  9002: {
    ...DEMO_CONVS[1],
    bot_data: { name: 'Marie', location: 'Nyamirambo, Kigali' },
    messages: [
      _msg(30, 'wamid.030', 'inbound',  'Bonjour',                                _t(30)),
      _msg(31, null,         'outbound', "Bonjour! 👋 Bienvenue chez *SolarHope Africa*.\nPlease choose your language / Hitamo ururimi / Choisissez votre langue:\n\n*1* — English\n*2* — Kinyarwanda\n*3* — Français", _t(30)),
      _msg(32, 'wamid.032', 'inbound',  '3',                                       _t(29)),
      _msg(33, null,         'outbound', "Super! 😊 Je suis *SHA*, votre assistant solaire. Je vais vous mettre en contact avec notre équipe rapidement — juste quelques questions d'abord.\n\nComment vous appelez-vous?", _t(29)),
      _msg(34, 'wamid.034', 'inbound',  'Marie Uwimana',                           _t(27)),
      _msg(35, null,         'outbound', 'Ravi de vous connaître, *Marie*! 😊 Dans quel district ou quelle zone vous trouvez-vous?', _t(27)),
      _msg(36, 'wamid.036', 'inbound',  'Nyamirambo, Kigali',                      _t(25)),
      _msg(37, null,         'outbound', "Compris! Le système solaire est pour votre *maison* ou votre *entreprise*?\n\n*1* — Maison 🏠\n*2* — Entreprise 🏢", _t(23)),
    ],
  },
  9003: {
    ...DEMO_CONVS[2],
    bot_data: {
      name: 'Alexis', location: 'Musanze, Northern', place_type: 'business',
      power_situation: 'no_power', has_power: false, usage: 'full_house', budget: 'above_5m',
    },
    messages: [
      _msg(50, 'wamid.050', 'inbound',  'Muraho',                                  _d(1, 5)),
      _msg(51, null,         'outbound', "Muraho! 👋 Murakaza neza kuri *SolarHope Africa*.\nPlease choose your language / Hitamo ururimi / Choisissez votre langue:\n\n*1* — English\n*2* — Kinyarwanda\n*3* — Français", _d(1, 5)),
      _msg(52, 'wamid.052', 'inbound',  '2',                                       _d(1, 4, 58)),
      _msg(53, null,         'outbound', "Neza! 😊 Nitwa *SHA*, umufasha wawe wa solar. Nzaguhuza n'itsinda ryacu vuba — ibibazo bike gusa mbere.\n\nUwitwa nde?", _d(1, 4, 57)),
      _msg(54, 'wamid.054', 'inbound',  'Kamanzi Alexis',                          _d(1, 4, 55)),
      _msg(55, null,         'outbound', "Ni byiza kukumenya, *Alexis*! 😊 Uri ahe? (Akarere / Umujyi)", _d(1, 4, 55)),
      _msg(56, 'wamid.056', 'inbound',  'Musanze, uturere tw\'amajyaruguru',       _d(1, 4, 53)),
      _msg(57, null,         'outbound', "Byumvikane! Solar ni ya *nyumba* cyangwa ya *bikorwa*?\n\n*1* — Inzu 🏠\n*2* — Bikorwa 🏢", _d(1, 4, 52)),
      _msg(58, 'wamid.058', 'inbound',  '2',                                       _d(1, 4, 50)),
      _msg(59, null,         'outbound', "Mufite amashanyarazi muri iki gihe?\n\n*1* — Yego, mufite amashanyarazi (REG / RURA)\n*2* — Oya, nta mashanyarazi dufite\n*3* — Mufite ariko ntabwo akora neza", _d(1, 4, 49)),
      _msg(60, 'wamid.060', 'inbound',  '2',                                       _d(1, 4, 47)),
      _msg(61, null,         'outbound', "Nta kibazo — solar ni iy'ingirakamaro cyane! 🌞 Murashaka gutera inkunga iki cyane?\n\n*1* — Amadora n'ibyuma byo gutoza telephone\n*2* — Amadora, televiziyo n'firigo\n*3* — Amadora, televiziyo, firigo n'ibindi\n*4* — Inzu yose cyangwa bureau — byose", _d(1, 4, 46)),
      _msg(62, 'wamid.062', 'inbound',  '4',                                       _d(1, 4, 44)),
      _msg(63, null,         'outbound', "Hafi turi kumwe! 😊 Mufite ingengo y'imari mu mutwe ku isimba rya solar?\n\n*1* — Munsi ya miliyoni 2 RWF\n*2* — Miliyoni 2 kugeza 5 RWF\n*3* — Hejuru ya miliyoni 5 RWF\n*4* — Ntabwo mzi — nkeneye ubuyobozi", _d(1, 4, 44)),
      _msg(64, 'wamid.064', 'inbound',  '3',                                       _d(1, 4, 42)),
      _msg(65, null,         'outbound', "Murakoze, *Alexis*! ✅\n\nMurateguye. Umwe mu nzobere zacu za solar azabatumanahira kuri ino WhatsApp mu masaha *2* azabahe inama y'ubuntu n'igiciro.\n\nNiba ari nijoro, tegereza ubutumwa bwa kare ejo! 🌞\n\n_SolarHope Africa — Tuze Inzozi, Inzira ya Solar_", _d(1, 4, 41)),
      _msg(66, null,         'outbound', 'Conversation transferred to our main WhatsApp line. Our team will reach out shortly! 👋', _d(1, 3, 5), 1, 'Eric M.'),
    ],
  },
  9004: {
    ...DEMO_CONVS[3],
    bot_data: {
      name: 'Amina', location: 'Remera, Kigali', place_type: 'home',
      power_situation: 'has_power', has_power: true, solar_goal: 'off_grid',
      bill_rwf: 62000, estimated_daily_kwh: 10.08, budget: '2_5m',
    },
    messages: [
      _msg(80, 'wamid.080', 'inbound',  'Hi',                                          _d(2, 3)),
      _msg(81, null,         'outbound', "Hello! 👋 Welcome to *SolarHope Africa*.\nPlease choose your language / Hitamo ururimi / Choisissez votre langue:\n\n*1* — English\n*2* — Kinyarwanda\n*3* — Français", _d(2, 3)),
      _msg(82, 'wamid.082', 'inbound',  '1',                                            _d(2, 2, 58)),
      _msg(83, null,         'outbound', "Great! 😊 I'm *SHA*, your solar assistant. One of our experts will follow up shortly.\n\nWhat's your name?", _d(2, 2, 57)),
      _msg(84, 'wamid.084', 'inbound',  'Amina Hassan',                                _d(2, 2, 55)),
      _msg(85, null,         'outbound', 'Nice to meet you, *Amina*! 😊 Which district or area are you located in?',  _d(2, 2, 54)),
      _msg(86, 'wamid.086', 'inbound',  'Remera',                                      _d(2, 2, 52)),
      _msg(87, null,         'outbound', "Got it! Is the solar system for your *home* or your *business*?\n\n*1* — Home 🏠\n*2* — Business 🏢", _d(2, 2, 51)),
      _msg(88, 'wamid.088', 'inbound',  '1',                                            _d(2, 2, 49)),
      _msg(89, null,         'outbound', "Do you currently have electricity at your place?\n\n*1* — Yes, I have electricity (REG / RURA connected)\n*2* — No electricity at all\n*3* — I have electricity but it's very unreliable", _d(2, 2, 48)),
      _msg(90, 'wamid.090', 'inbound',  '1',                                            _d(2, 2, 46)),
      _msg(91, null,         'outbound', "Understood! Are you looking for solar to *work alongside* your electricity, or go *fully off-grid*?\n\n*1* — Backup only\n*2* — Full solar — stop paying electricity bills completely\n*3* — Not sure yet", _d(2, 2, 45)),
      _msg(92, 'wamid.092', 'inbound',  '2',                                            _d(2, 2, 43)),
      _msg(93, null,         'outbound', "This helps us recommend the right size 👇\n\nHow much do you spend on electricity per month? _(RWF — best guess is fine!)_", _d(2, 2, 42)),
      _msg(94, 'wamid.094', 'inbound',  '62000',                                       _d(2, 2, 40)),
      _msg(95, null,         'outbound', "Almost done! 😊 Budget in mind for the solar installation?\n\n*1* — Under 2 million RWF\n*2* — 2 to 5 million RWF\n*3* — Above 5 million RWF\n*4* — No idea yet", _d(2, 2, 39)),
      _msg(96, 'wamid.096', 'inbound',  '2',                                            _d(2, 2, 37)),
      _msg(97, null,         'outbound', "Thank you, *Amina*! ✅\n\nYou're all set. One of our solar experts will reach out to you within *2 hours*.\n\n_SolarHope Africa — Light Up Dreams, The Solar Way_", _d(2, 2, 36)),
      _msg(98, null,         'outbound', "Hi Amina! 😊 This is Sarah from SolarHope Africa. I reviewed your details and I'd love to schedule a quick site visit. Are you available this week?", _d(2, 1, 30), 2, 'Sarah K.'),
      _msg(99, 'wamid.099', 'inbound',  'Yes! Thursday afternoon works for me 😊',     _d(2, 1, 15)),
      _msg(100, null,        'outbound', 'Perfect, thank you! Our technician will visit you Thursday at 2pm. See you then! 🙌', _d(2, 1, 5), 2, 'Sarah K.'),
      _msg(101, 'wamid.101','inbound',  'Perfect, thank you! Looking forward to the visit 🙏', _d(2, 1)),
    ],
  },
  9005: {
    ...DEMO_CONVS[4],
    bot_data: {},
    messages: [
      _msg(110, 'wamid.110', 'inbound',  'Hello i want to know about solar',       _t(46)),
      _msg(111, null,         'outbound', "Hello! 👋 Welcome to *SolarHope Africa*.\nPlease choose your language / Hitamo ururimi / Choisissez votre langue:\n\n*1* — English\n*2* — Kinyarwanda\n*3* — Français", _t(46)),
      _msg(112, 'wamid.112', 'inbound',  '1',                                       _t(45)),
      _msg(113, null,         'outbound', "Great! 😊 I'm *SHA*, your solar assistant. One of our experts will follow up with you shortly — just a few quick questions first.\n\nWhat's your name?", _t(45)),
    ],
  },
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  bot:         { label: 'Bot Active',      dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700 border-violet-100'   },
  human:       { label: 'Needs Attention', dot: 'bg-amber-400',  chip: 'bg-amber-50 text-amber-700 border-amber-100'      },
  transferred: { label: 'Transferred',     dot: 'bg-blue-500',   chip: 'bg-blue-50 text-blue-700 border-blue-100'        },
  resolved:    { label: 'Resolved',        dot: 'bg-emerald-500',chip: 'bg-emerald-50 text-emerald-700 border-emerald-100'},
}

const LANG_FLAGS: Record<string, string> = { en: '🇬🇧', rw: '🇷🇼', fr: '🇫🇷' }
const PALETTE = ['#091928', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626']
function avatarBg(id: string) {
  let n = 0; for (const c of id) n += c.charCodeAt(0)
  return PALETTE[n % PALETTE.length]
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function shortTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Yest.'
  return format(d, 'd MMM')
}

function sepLabel(key: string) {
  const d = new Date(key)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMMM d, yyyy')
}

function groupByDate(msgs: WAMessage[]) {
  const out: { key: string; msgs: WAMessage[] }[] = []
  for (const m of msgs) {
    const key = new Date(m.timestamp).toDateString()
    const last = out[out.length - 1]
    if (last?.key === key) last.msgs.push(m)
    else out.push({ key, msgs: [m] })
  }
  return out
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Av({ label, waId, px }: { label: string; waId: string; px: number }) {
  return (
    <div
      style={{ width: px, height: px, background: avatarBg(waId), borderRadius: '50%', flexShrink: 0, fontSize: px * 0.38 }}
      className="flex items-center justify-center text-white font-bold select-none"
    >
      {(label || waId)[0].toUpperCase()}
    </div>
  )
}

// ── Status chip ───────────────────────────────────────────────────────────────

function StatusChip({ status, short = false }: { status: string; short?: boolean }) {
  const c = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.bot
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${c.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {short ? <span className={`w-1.5 h-1.5 rounded-full ${c.dot} -ml-1`} /> : null}
      {!short && c.label}
    </span>
  )
}

// ── Conversation row ──────────────────────────────────────────────────────────

function ConvRow({ conv, active, onClick }: { conv: WAConversation; active: boolean; onClick: () => void }) {
  const name = conv.display_name || `+${conv.wa_id}`
  const bold = conv.unread_count > 0
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors border-b border-gray-50/80 ${active ? 'bg-[#091928]/[0.04]' : 'hover:bg-gray-50 active:bg-gray-100'}`}
    >
      {active && <span className="absolute left-0 inset-y-0 w-[3px] bg-[#EA9D13] rounded-r" />}
      <Av label={name} waId={conv.wa_id} px={42} />
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span className={`text-sm truncate ${bold ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>{name}</span>
          <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">{shortTime(conv.last_message_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <p className={`text-xs truncate flex-1 ${bold ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
            {conv.last_message_preview || '…'}
          </p>
          {conv.unread_count > 0 && (
            <span className="shrink-0 bg-[#EA9D13] text-white font-bold text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
              {conv.unread_count}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <StatusChip status={conv.status} />
          <span className="text-xs">{LANG_FLAGS[conv.language] ?? ''}</span>
        </div>
      </div>
    </button>
  )
}

// ── Tick icon ─────────────────────────────────────────────────────────────────

function Tick({ status }: { status: string }) {
  if (status === 'read') return <CheckCheck size={12} className="text-[#53bdeb]" />
  if (status === 'delivered') return <CheckCheck size={12} className="text-white/40" />
  if (status === 'failed') return <span className="text-red-400 text-[10px] font-bold">!</span>
  return <Check size={12} className="text-white/40" />
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: WAMessage }) {
  const isOut = msg.direction === 'outbound'
  const isBot = isOut && !msg.sent_by
  const t = format(new Date(msg.timestamp), 'HH:mm')

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} px-3 sm:px-4 py-[3px]`}>
      <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[68%]">
        {isOut && (
          <div className="flex items-center gap-1 mb-1 justify-end">
            {isBot
              ? <><Bot size={10} className="text-[#EA9D13]" /><span className="text-[10px] text-[#EA9D13] font-semibold">SHA Bot</span></>
              : <><User2 size={10} className="text-gray-400" /><span className="text-[10px] text-gray-400">{msg.sent_by_name}</span></>
            }
          </div>
        )}
        <div className={`rounded-2xl px-3.5 py-2.5 shadow-sm ${
          isBot
            ? 'bg-white border border-gray-100 text-gray-800 rounded-tr-sm'
            : isOut
            ? 'bg-[#091928] text-white rounded-tr-sm'
            : 'bg-white border border-gray-100 text-gray-900 rounded-tl-sm'
        }`}>
          {msg.body
            ? <p className="text-[13px] sm:text-[13.5px] leading-[1.55] whitespace-pre-wrap break-words">{msg.body}</p>
            : <p className="text-xs italic opacity-40">[{msg.message_type}]</p>
          }
          <div className={`flex items-center gap-1 mt-1.5 ${isOut ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-[10px] tabular-nums ${isOut ? 'text-white/40' : 'text-gray-400'}`}>{t}</span>
            {isOut && <Tick status={msg.status} />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Date separator ────────────────────────────────────────────────────────────

function DateSep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex-1 h-px bg-gray-200/60" />
      <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 bg-[#eae6df]/80 px-3 py-1 rounded-full whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-200/60" />
    </div>
  )
}

// ── Lead info panel ───────────────────────────────────────────────────────────

function LeadPanel({ detail, onClose }: { detail: WAConversationDetail; onClose: () => void }) {
  const d = detail.bot_data
  const name = detail.display_name || `+${detail.wa_id}`

  const facts = [
    { Icon: MapPin,     key: 'Location',      val: d.location },
    { Icon: d.place_type === 'business' ? Building2 : Home, key: 'Place type', val: d.place_type },
    { Icon: Zap,        key: 'Power',         val: d.power_situation?.toString().replace(/_/g, ' ') },
    { Icon: Sun,        key: 'Solar goal',    val: d.solar_goal?.toString().replace(/_/g, ' ')     },
    { Icon: Zap,        key: 'Usage pref.',   val: d.usage?.toString().replace(/_/g, ' ')          },
    { Icon: Wallet,     key: 'Monthly bill',  val: d.bill_rwf ? `${Number(d.bill_rwf).toLocaleString()} RWF` : null },
    { Icon: Zap,        key: 'Est. load',     val: d.estimated_daily_kwh ? `${d.estimated_daily_kwh} kWh/day` : null },
    { Icon: Wallet,     key: 'Budget',        val: d.budget?.toString().replace(/_/g, ' ')         },
  ].filter(f => f.val)

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#091928] shrink-0">
        <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Lead Profile</span>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Contact card */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <Av label={name} waId={detail.wa_id} px={44} />
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-tight truncate">{name}</p>
              <p className="text-xs text-gray-400 mt-0.5">+{detail.wa_id}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusChip status={detail.status} />
            <span className="text-[10px] border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
              {LANG_FLAGS[detail.language]} {detail.language.toUpperCase()}
            </span>
            {detail.bot_step > 0 && (
              <span className="text-[10px] border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                Step {Math.min(detail.bot_step, 8)}/8
              </span>
            )}
          </div>
          {detail.client_name && (
            <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              <CircleCheck size={13} className="text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-600 font-semibold">Linked to CRM</p>
                <p className="text-xs font-bold text-emerald-800 truncate">{detail.client_name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Qualification data */}
        <div className="p-4">
          {facts.length > 0 ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#EA9D13] mb-3">Qualification Data</p>
              <div className="space-y-3">
                {facts.map(({ Icon, key, val }) => (
                  <div key={key} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#091928]/5 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={12} className="text-[#091928]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5 leading-none">{key}</p>
                      <p className="text-xs font-semibold text-gray-800 capitalize">{String(val)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Bot size={24} className="mx-auto text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">Bot is still collecting lead data…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── WhatsApp icon SVG ─────────────────────────────────────────────────────────

function WAIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.855L.057 23.986l6.305-1.654A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.869 0-3.628-.487-5.153-1.34l-.369-.219-3.846 1.008 1.025-3.74-.241-.385A9.929 9.929 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WhatsAppInboxPage() {
  // Mobile: show either list or chat, not both at once
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [text, setText] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: apiConvs = [], refetch: refetchList } = useQuery<WAConversation[]>({
    queryKey: ['wa-conversations', filterStatus],
    queryFn: async () => (await whatsappApi.conversations(filterStatus ? { status: filterStatus } : {})).data,
    refetchInterval: 10_000,
  })

  // Fall back to demo data when backend has no conversations yet
  const isDemo = apiConvs.length === 0
  const convs = isDemo ? DEMO_CONVS : apiConvs

  const isDemoSelected = isDemo && !!selectedId && selectedId >= 9000
  const { data: apiDetail, refetch: refetchDetail } = useQuery<WAConversationDetail>({
    queryKey: ['wa-conversation', selectedId],
    queryFn: async () => (await whatsappApi.get(selectedId!)).data,
    enabled: !!selectedId && !isDemoSelected,
    refetchInterval: isDemoSelected ? false : 5_000,
  })
  const detail = isDemoSelected ? (DEMO_DETAILS[selectedId!] ?? null) : (apiDetail ?? null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [detail?.messages?.length])

  useEffect(() => { setShowInfo(false) }, [selectedId])

  const selectConv = (id: number) => {
    setSelectedId(id)
    setMobileView('chat')
  }

  const sendMutation = useMutation({
    mutationFn: ({ id, msg }: { id: number; msg: string }) => whatsappApi.send(id, msg),
    onSuccess: () => { setText(''); refetchDetail(); refetchList() },
  })

  const transferMutation = useMutation({
    mutationFn: (id: number) => whatsappApi.transfer(id),
    onSuccess: (res) => { window.open(res.data.link, '_blank'); refetchDetail(); refetchList() },
  })

  const resolveMutation = useMutation({
    mutationFn: (id: number) => whatsappApi.update(id, { status: 'resolved' }),
    onSuccess: () => { refetchDetail(); refetchList() },
  })

  const handleSend = useCallback(() => {
    if (!selectedId || !text.trim() || sendMutation.isPending || isDemoSelected) return
    sendMutation.mutate({ id: selectedId, msg: text.trim() })
  }, [selectedId, text, sendMutation, isDemoSelected])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const filtered = convs.filter(c => {
    if (!search) return true
    return (c.display_name || c.wa_id).toLowerCase().includes(search.toLowerCase())
  })

  const totalUnread = convs.reduce((n, c) => n + c.unread_count, 0)
  const canReply = detail && detail.status !== 'transferred' && detail.status !== 'resolved' && !isDemoSelected
  const dateGroups = detail ? groupByDate(detail.messages) : []
  const convName = detail ? (detail.display_name || `+${detail.wa_id}`) : ''

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden relative">

      {/* ─── LEFT: conversation list ─── */}
      <div className={`
        ${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex
        w-full md:w-[280px] lg:w-[320px] shrink-0
        flex-col border-r border-gray-200 bg-white
      `}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                <WAIcon />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-[13px] leading-none">WhatsApp Inbox</h1>
                {totalUnread > 0
                  ? <p className="text-[10px] text-[#EA9D13] font-semibold mt-0.5">{totalUnread} unread</p>
                  : <p className="text-[10px] text-gray-400 mt-0.5">{convs.length} conversations</p>
                }
              </div>
            </div>
            <button onClick={() => refetchList()} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or number…"
              className="w-full bg-gray-100 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#091928]/20"
            />
          </div>

          {/* Filter tabs — scrollable on small widths */}
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {(['', 'bot', 'human', 'transferred', 'resolved'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  filterStatus === s ? 'bg-[#091928] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {s === '' ? 'All' : STATUS_CFG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {/* Demo banner */}
        {isDemo && (
          <div className="mx-3 mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-[10px] text-amber-700">
              <strong>Preview mode</strong> · Sample conversations. Connect your WhatsApp to see real leads.
            </span>
          </div>
        )}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <MessageSquare size={28} className="mb-2 opacity-30" />
              <p className="text-xs">{search ? 'No matches found' : 'No conversations yet'}</p>
            </div>
          ) : (
            filtered.map(c => <ConvRow key={c.id} conv={c} active={c.id === selectedId} onClick={() => selectConv(c.id)} />)
          )}
        </div>
      </div>

      {/* ─── CENTER: chat area ─── */}
      <div className={`
        ${mobileView === 'list' ? 'hidden' : 'flex'} md:flex
        flex-1 flex-col min-w-0 bg-[#eae6df]/30
      `}>
        {/* No conversation selected (desktop only since mobile shows list) */}
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#091928]/5 flex items-center justify-center mb-5">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                  stroke="#091928" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".25"/>
              </svg>
            </div>
            <h2 className="font-bold text-gray-700 text-base sm:text-lg mb-1">SHA WhatsApp CRM</h2>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              Select a conversation from the list to read and reply to messages.
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between shrink-0 shadow-sm gap-2">
              {/* Left: back + avatar + info */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Mobile back button */}
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
                >
                  <ArrowLeft size={18} />
                </button>
                {detail && <Av label={convName} waId={detail.wa_id} px={36} />}
                {detail ? (
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 text-sm truncate">{convName}</p>
                      <StatusChip status={detail.status} />
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate">
                      +{detail.wa_id}
                      <span className="hidden sm:inline">
                        {' · '}{LANG_FLAGS[detail.language] ?? ''} {detail.language.toUpperCase()}
                        {detail.client_name && <span className="text-emerald-600"> · ✓ {detail.client_name}</span>}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="w-28 h-4 bg-gray-200 animate-pulse rounded" />
                )}
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Transfer — full text on lg+, icon+short on sm, icon-only on xs */}
                {detail?.status === 'human' && (
                  <button
                    onClick={() => transferMutation.mutate(detail.id)}
                    disabled={transferMutation.isPending}
                    className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba58] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-sm px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs"
                  >
                    <ExternalLink size={13} className="shrink-0" />
                    <span className="hidden sm:inline">Transfer</span>
                    <span className="hidden lg:inline"> to WhatsApp</span>
                  </button>
                )}

                {/* Resolve — text on sm+, icon-only on xs */}
                {detail && detail.status !== 'resolved' && (
                  <button
                    onClick={() => resolveMutation.mutate(detail.id)}
                    disabled={resolveMutation.isPending}
                    className="flex items-center gap-1 text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold"
                  >
                    <Check size={13} className="shrink-0" />
                    <span className="hidden sm:inline">Resolve</span>
                  </button>
                )}

                {/* Info toggle */}
                <button
                  onClick={() => setShowInfo(v => !v)}
                  className={`p-1.5 sm:p-2 rounded-xl transition-colors ${showInfo ? 'bg-[#091928] text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                  title="Lead info"
                >
                  <Info size={15} />
                </button>

                {/* Refresh */}
                <button onClick={() => refetchDetail()} className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-2">
              {!detail ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 border-2 border-[#091928]/20 border-t-[#091928] rounded-full animate-spin" />
                    <p className="text-xs text-gray-400">Loading messages…</p>
                  </div>
                </div>
              ) : dateGroups.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">No messages yet</div>
              ) : (
                dateGroups.map(({ key, msgs }) => (
                  <div key={key}>
                    <DateSep label={sepLabel(key)} />
                    {msgs.map(m => <Bubble key={m.id} msg={m} />)}
                  </div>
                ))
              )}
              <div ref={bottomRef} className="h-2" />
            </div>

            {/* Input area */}
            {canReply ? (
              <div className="bg-white border-t border-gray-200 p-2.5 sm:p-3 shrink-0">
                {detail?.status === 'bot' && (
                  <div className="flex items-start sm:items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-2">
                    <Bot size={12} className="text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
                    <p className="text-[11px] text-amber-700">
                      <strong>SHA Bot</strong> is handling this. Sending a message will take over.
                    </p>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKey}
                    rows={1}
                    placeholder="Type a message…"
                    className="flex-1 resize-none bg-gray-100 rounded-2xl px-3.5 sm:px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#091928]/20 max-h-24 overflow-y-auto"
                    style={{ lineHeight: '1.5' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!text.trim() || sendMutation.isPending}
                    className="w-10 h-10 shrink-0 bg-[#091928] hover:bg-[#0f2a45] disabled:opacity-30 text-white rounded-2xl flex items-center justify-center transition-colors shadow-sm"
                  >
                    {sendMutation.isPending
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Send size={15} />
                    }
                  </button>
                </div>
                <p className="hidden sm:block text-[10px] text-gray-400 mt-1.5 pl-1">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            ) : isDemoSelected ? (
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 text-center shrink-0">
              <p className="text-xs text-gray-400">
                <strong className="text-gray-500">Preview mode</strong> · Connect WhatsApp to send real messages
              </p>
            </div>
          ) : detail?.status === 'transferred' ? (
              <div className="bg-blue-50 border-t border-blue-100 px-4 py-3 sm:py-4 text-center shrink-0">
                <p className="text-sm font-semibold text-blue-700">Transferred to main WhatsApp</p>
                <p className="text-xs text-blue-500 mt-0.5">Continue on +250 780 348 624</p>
              </div>
            ) : detail?.status === 'resolved' ? (
              <div className="bg-emerald-50 border-t border-emerald-100 px-4 py-3 sm:py-4 text-center shrink-0">
                <p className="text-sm font-semibold text-emerald-700">Conversation resolved ✓</p>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ─── RIGHT: lead profile panel ─── */}
      {showInfo && detail && (
        <>
          {/* Mobile/tablet backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]"
            onClick={() => setShowInfo(false)}
          />
          {/* Panel */}
          <div className={`
            fixed lg:static
            inset-y-0 right-0 z-50
            w-[88vw] sm:w-80 lg:w-[268px]
            shrink-0 flex flex-col
            border-l border-gray-200
            shadow-2xl lg:shadow-none
          `}>
            <LeadPanel detail={detail} onClose={() => setShowInfo(false)} />
          </div>
        </>
      )}
    </div>
  )
}
