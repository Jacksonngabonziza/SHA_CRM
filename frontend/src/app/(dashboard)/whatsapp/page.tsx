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

// ── Demo preview data ─────────────────────────────────────────────────────────

const _t = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
const _d = (days: number, h = 0, mins = 0) =>
  new Date(Date.now() - (days * 1440 + h * 60 + mins) * 60_000).toISOString()

const DEMO_CONVS: WAConversation[] = [
  { id: 9001, wa_id: '250788123456', display_name: 'Jean Paul Nkurunziza', status: 'human',       language: 'en', bot_step: 9, unread_count: 2, last_message_at: _t(8),     created_at: _t(42),   client: null, client_name: null,       assigned_to: null, assigned_to_name: null, last_message_preview: 'Hi, when can I expect a call from your team?' },
  { id: 9002, wa_id: '250722334455', display_name: 'Uwimana Marie',         status: 'bot',        language: 'fr', bot_step: 4, unread_count: 1, last_message_at: _t(23),    created_at: _t(30),   client: null, client_name: null,       assigned_to: null, assigned_to_name: null, last_message_preview: '→ Is the solar system for your home or business?' },
  { id: 9003, wa_id: '250789654321', display_name: 'Kamanzi Alexis',        status: 'transferred',language: 'rw', bot_step: 9, unread_count: 0, last_message_at: _d(1, 3),  created_at: _d(1, 5), client: null, client_name: null,       assigned_to: null, assigned_to_name: null, last_message_preview: 'Transferred to your main WhatsApp' },
  { id: 9004, wa_id: '250784112233', display_name: 'Amina Hassan',          status: 'resolved',   language: 'en', bot_step: 9, unread_count: 0, last_message_at: _d(2, 1),  created_at: _d(2, 3), client: 42,   client_name: 'Amina Hassan', assigned_to: null, assigned_to_name: null, last_message_preview: 'Perfect, thank you! Looking forward to the visit 🙏' },
  { id: 9005, wa_id: '250791234567', display_name: 'Patrick Habimana',      status: 'bot',        language: 'en', bot_step: 2, unread_count: 1, last_message_at: _t(45),    created_at: _t(46),   client: null, client_name: null,       assigned_to: null, assigned_to_name: null, last_message_preview: "→ What's your name?" },
]

const _msg = (id: number, dir: 'inbound'|'outbound', body: string, ts: string, sentBy: number|null = null, name: string|null = null): WAMessage =>
  ({ id, wa_message_id: `demo-${id}`, direction: dir, message_type: 'text', body, sent_by: sentBy, sent_by_name: name, status: 'read', timestamp: ts })

const DEMO_DETAILS: Record<number, WAConversationDetail> = {
  9001: { ...DEMO_CONVS[0], bot_data: { name:'Jean Paul', location:'Gasabo, Kigali', place_type:'home', power_situation:'unreliable', has_power:true, solar_goal:'backup', bill_rwf:48000, estimated_daily_kwh:7.8, budget:'2_5m' }, messages:[
    _msg(1,'inbound','Hello',_t(42)),
    _msg(2,'outbound',"Hello! 👋 Welcome to *SolarHope Africa*.\nPlease choose your language:\n\n*1* — English\n*2* — Kinyarwanda\n*3* — Français",_t(41)),
    _msg(3,'inbound','1',_t(40)),
    _msg(4,'outbound',"Great! 😊 I'm *SHA*, your solar assistant. One of our experts will follow up shortly.\n\nWhat's your name?",_t(40)),
    _msg(5,'inbound','Jean Paul',_t(39)),
    _msg(6,'outbound','Nice to meet you, *Jean Paul*! 😊 Which district or area are you located in?',_t(39)),
    _msg(7,'inbound','Gasabo, Kigali',_t(38)),
    _msg(8,'outbound',"Got it! Is the solar system for your *home* or your *business*?\n\n*1* — Home 🏠\n*2* — Business 🏢",_t(38)),
    _msg(9,'inbound','1',_t(37)),
    _msg(10,'outbound',"Do you currently have electricity at your place?\n\n*1* — Yes, I have electricity (REG / RURA)\n*2* — No electricity at all\n*3* — I have electricity but it's very unreliable",_t(37)),
    _msg(11,'inbound','3',_t(36)),
    _msg(12,'outbound',"Understood! Are you looking for solar to *work alongside* your electricity, or go *fully off-grid*?\n\n*1* — Backup only\n*2* — Full solar — stop paying bills\n*3* — Not sure yet",_t(36)),
    _msg(13,'inbound','1',_t(35)),
    _msg(14,'outbound',"How much do you spend on electricity per month? _(RWF — best guess is fine!)_",_t(35)),
    _msg(15,'inbound','48000',_t(34)),
    _msg(16,'outbound',"Almost done! 😊 Budget in mind for the solar installation?\n\n*1* — Under 2 million RWF\n*2* — 2 to 5 million RWF\n*3* — Above 5 million RWF\n*4* — No idea yet",_t(34)),
    _msg(17,'inbound','2',_t(33)),
    _msg(18,'outbound',"Thank you, *Jean Paul*! ✅\n\nYou're all set. One of our solar experts will reach out within *2 hours* with a free personalised quote.\n\n_SolarHope Africa — Light Up Dreams, The Solar Way_",_t(33)),
    _msg(19,'inbound','Okay thank you!',_t(20)),
    _msg(20,'inbound','Hi, when can I expect a call from your team?',_t(8)),
  ]},
  9002: { ...DEMO_CONVS[1], bot_data:{ name:'Marie', location:'Nyamirambo, Kigali' }, messages:[
    _msg(30,'inbound','Bonjour',_t(30)),
    _msg(31,'outbound',"Bonjour! 👋 Bienvenue chez *SolarHope Africa*.\nChoisissez votre langue:\n\n*1* — English\n*2* — Kinyarwanda\n*3* — Français",_t(30)),
    _msg(32,'inbound','3',_t(29)),
    _msg(33,'outbound',"Super! 😊 Je suis *SHA*, votre assistant solaire.\n\nComment vous appelez-vous?",_t(29)),
    _msg(34,'inbound','Marie Uwimana',_t(27)),
    _msg(35,'outbound',"Ravi de vous connaître, *Marie*! 😊 Dans quel district vous trouvez-vous?",_t(27)),
    _msg(36,'inbound','Nyamirambo, Kigali',_t(25)),
    _msg(37,'outbound',"Compris! Le système solaire est pour votre *maison* ou votre *entreprise*?\n\n*1* — Maison 🏠\n*2* — Entreprise 🏢",_t(23)),
  ]},
  9003: { ...DEMO_CONVS[2], bot_data:{ name:'Alexis', location:'Musanze, Northern', place_type:'business', power_situation:'no_power', usage:'full_house', budget:'above_5m' }, messages:[
    _msg(50,'inbound','Muraho',_d(1,5)),
    _msg(51,'outbound',"Muraho! 👋 Murakaza neza kuri *SolarHope Africa*.\n\n*1* — English\n*2* — Kinyarwanda\n*3* — Français",_d(1,5)),
    _msg(52,'inbound','2',_d(1,4,58)),
    _msg(53,'outbound',"Neza! 😊 Nitwa *SHA*, umufasha wawe wa solar.\n\nUwitwa nde?",_d(1,4,57)),
    _msg(54,'inbound','Kamanzi Alexis',_d(1,4,55)),
    _msg(55,'outbound',"Ni byiza kukumenya, *Alexis*! 😊 Uri ahe?",_d(1,4,55)),
    _msg(56,'inbound','Musanze',_d(1,4,53)),
    _msg(57,'outbound',"Byumvikane! Solar ni ya nyumba cyangwa bikorwa?\n\n*1* — Inzu 🏠\n*2* — Bikorwa 🏢",_d(1,4,52)),
    _msg(58,'inbound','2',_d(1,4,50)),
    _msg(59,'outbound',"Mufite amashanyarazi?\n\n*1* — Yego\n*2* — Oya\n*3* — Ntabwo akora neza",_d(1,4,49)),
    _msg(60,'inbound','2',_d(1,4,47)),
    _msg(61,'outbound',"Murashaka gutera inkunga iki?\n\n*1* — Amadora\n*2* — Televiziyo n'firigo\n*3* — Ibindi\n*4* — Byose",_d(1,4,46)),
    _msg(62,'inbound','4',_d(1,4,44)),
    _msg(63,'outbound',"Ingengo y'imari?\n\n*1* — Munsi ya 2M\n*2* — 2–5M\n*3* — Hejuru ya 5M\n*4* — Ntabwo mzi",_d(1,4,44)),
    _msg(64,'inbound','3',_d(1,4,42)),
    _msg(65,'outbound',"Murakoze, *Alexis*! ✅\n\nUmwe mu nzobere zacu azabatumanahira kuri ino WhatsApp mu masaha *2*.\n\n_SolarHope Africa — Tuze Inzozi_",_d(1,4,41)),
    _msg(66,'outbound','Hi Alexis! Transferring you to our main line now. Our team will reach out shortly! 👋',_d(1,3,5),1,'Eric M.'),
  ]},
  9004: { ...DEMO_CONVS[3], bot_data:{ name:'Amina', location:'Remera, Kigali', place_type:'home', power_situation:'has_power', solar_goal:'off_grid', bill_rwf:62000, estimated_daily_kwh:10.08, budget:'2_5m' }, messages:[
    _msg(80,'inbound','Hi',_d(2,3)),
    _msg(81,'outbound',"Hello! 👋 Welcome to *SolarHope Africa*.\n\n*1* — English\n*2* — Kinyarwanda\n*3* — Français",_d(2,3)),
    _msg(82,'inbound','1',_d(2,2,58)),
    _msg(83,'outbound',"Great! 😊 What's your name?",_d(2,2,57)),
    _msg(84,'inbound','Amina Hassan',_d(2,2,55)),
    _msg(85,'outbound','Nice to meet you, *Amina*! 😊 Which district are you in?',_d(2,2,54)),
    _msg(86,'inbound','Remera, Kigali',_d(2,2,52)),
    _msg(87,'outbound',"Got it! Home or business?\n\n*1* — Home 🏠\n*2* — Business 🏢",_d(2,2,51)),
    _msg(88,'inbound','1',_d(2,2,49)),
    _msg(89,'outbound',"Do you have electricity?\n\n*1* — Yes\n*2* — No\n*3* — Unreliable",_d(2,2,48)),
    _msg(90,'inbound','1',_d(2,2,46)),
    _msg(91,'outbound',"Monthly electricity spend? _(RWF)_",_d(2,2,45)),
    _msg(92,'inbound','62000',_d(2,2,43)),
    _msg(93,'outbound',"Budget range?\n\n*1* — Under 2M\n*2* — 2–5M\n*3* — Above 5M\n*4* — Not sure",_d(2,2,39)),
    _msg(94,'inbound','2',_d(2,2,37)),
    _msg(95,'outbound',"Thank you, *Amina*! ✅\n\nOur solar expert will reach out within *2 hours*.\n\n_SolarHope Africa — Light Up Dreams, The Solar Way_",_d(2,2,36)),
    _msg(96,'outbound',"Hi Amina! 😊 This is Sarah from SolarHope Africa. I reviewed your details — shall we schedule a free site visit this week?",_d(2,1,30),2,'Sarah K.'),
    _msg(97,'inbound','Yes! Thursday afternoon works 😊',_d(2,1,15)),
    _msg(98,'outbound',"Perfect! Our technician will visit Thursday at 2pm. See you then! 🙌",_d(2,1,5),2,'Sarah K.'),
    _msg(99,'inbound','Perfect, thank you! Looking forward to the visit 🙏',_d(2,1)),
  ]},
  9005: { ...DEMO_CONVS[4], bot_data:{}, messages:[
    _msg(110,'inbound','Hello i want to know about solar',_t(46)),
    _msg(111,'outbound',"Hello! 👋 Welcome to *SolarHope Africa*.\n\n*1* — English\n*2* — Kinyarwanda\n*3* — Français",_t(46)),
    _msg(112,'inbound','1',_t(45)),
    _msg(113,'outbound',"Great! 😊 I'm *SHA*, your solar assistant.\n\nWhat's your name?",_t(45)),
  ]},
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  bot:         { label: 'Bot Active',      dot: 'bg-violet-400', chip: 'bg-violet-50 text-violet-700 border-violet-200'   },
  human:       { label: 'Needs Attention', dot: 'bg-amber-400',  chip: 'bg-amber-50 text-amber-700 border-amber-200'      },
  transferred: { label: 'Transferred',     dot: 'bg-sky-400',    chip: 'bg-sky-50 text-sky-700 border-sky-200'            },
  resolved:    { label: 'Resolved',        dot: 'bg-emerald-400',chip: 'bg-emerald-50 text-emerald-700 border-emerald-200'},
}

const LANG_FLAGS: Record<string, string> = { en: '🇬🇧', rw: '🇷🇼', fr: '🇫🇷' }
const PALETTE = ['#091928','#4f46e5','#0891b2','#059669','#b45309','#be185d']
function avatarBg(id: string) { let n=0; for(const c of id) n+=c.charCodeAt(0); return PALETTE[n%PALETTE.length] }

// ── Utilities ─────────────────────────────────────────────────────────────────

function shortTime(iso: string|null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isToday(d)) return format(d,'HH:mm')
  if (isYesterday(d)) return 'Yest.'
  return format(d,'d MMM')
}
function sepLabel(key: string) {
  const d = new Date(key)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d,'MMMM d, yyyy')
}

interface MsgGroup { direction: 'inbound'|'outbound'; isBot: boolean; agentName: string|null; msgs: WAMessage[] }

function buildGroups(msgs: WAMessage[]): MsgGroup[] {
  const out: MsgGroup[] = []
  for (const m of msgs) {
    const isBot = m.direction === 'outbound' && !m.sent_by
    const agentName = m.direction === 'outbound' && m.sent_by ? m.sent_by_name : null
    const last = out[out.length - 1]
    const dt = last ? new Date(m.timestamp).getTime() - new Date(last.msgs[last.msgs.length-1].timestamp).getTime() : Infinity
    if (last && last.direction === m.direction && last.isBot === isBot && last.agentName === agentName && dt < 5*60*1000)
      last.msgs.push(m)
    else
      out.push({ direction: m.direction, isBot, agentName, msgs: [m] })
  }
  return out
}

function groupByDate(msgs: WAMessage[]) {
  const out: { key: string; msgs: WAMessage[] }[] = []
  for (const m of msgs) {
    const key = new Date(m.timestamp).toDateString()
    const last = out[out.length-1]
    if (last?.key === key) last.msgs.push(m)
    else out.push({ key, msgs: [m] })
  }
  return out
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Av({ label, waId, px }: { label: string; waId: string; px: number }) {
  return (
    <div
      style={{ width: px, height: px, background: avatarBg(waId), borderRadius: '50%', flexShrink: 0, fontSize: px * 0.4 }}
      className="flex items-center justify-center text-white font-bold select-none"
    >
      {(label || waId)[0].toUpperCase()}
    </div>
  )
}

// ── Status chip ───────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const c = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.bot
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${c.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

// ── Conversation row ──────────────────────────────────────────────────────────

function ConvRow({ conv, active, onClick }: { conv: WAConversation; active: boolean; onClick: () => void }) {
  const name = conv.display_name || `+${conv.wa_id}`
  const bold = conv.unread_count > 0
  const dot = STATUS_CFG[conv.status as keyof typeof STATUS_CFG]?.dot ?? 'bg-gray-300'

  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left flex items-center gap-3 px-4 py-3.5 transition-all duration-150 border-b border-gray-100/70 ${
        active ? 'bg-[#FFFBEB]' : 'hover:bg-gray-50/80 active:bg-gray-100/60'
      }`}
    >
      {active && <span className="absolute left-0 inset-y-0 w-[3px] bg-[#EA9D13] rounded-r-full" />}
      {/* Avatar + status dot */}
      <div className="relative shrink-0">
        <Av label={name} waId={conv.wa_id} px={44} />
        <span className={`absolute bottom-0 right-0 w-3 h-3 ${dot} rounded-full border-2 border-white`} />
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span className={`text-[13px] truncate ${bold ? 'font-bold text-gray-900' : 'font-semibold text-gray-600'}`}>{name}</span>
          <span className={`text-[11px] shrink-0 tabular-nums ${bold ? 'font-semibold text-[#EA9D13]' : 'text-gray-400'}`}>
            {shortTime(conv.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[12px] truncate leading-snug ${bold ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
            {conv.last_message_preview || '…'}
          </p>
          {bold && (
            <span className="shrink-0 bg-[#EA9D13] text-white font-bold text-[10px] min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5">
              {conv.unread_count}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <StatusChip status={conv.status} />
          <span className="text-xs">{LANG_FLAGS[conv.language] ?? ''}</span>
        </div>
      </div>
    </button>
  )
}

// ── Tick icon ─────────────────────────────────────────────────────────────────

function Tick({ status }: { status: string }) {
  if (status === 'read') return <CheckCheck size={13} className="text-[#53bdeb]" />
  if (status === 'delivered') return <CheckCheck size={13} className="text-white/40" />
  if (status === 'failed') return <span className="text-red-400 text-xs font-bold">!</span>
  return <Check size={13} className="text-white/40" />
}

// ── Message group (consecutive bubbles from same sender) ───────────────────────

function MsgGroupBubbles({ group }: { group: MsgGroup }) {
  const { direction, isBot, agentName, msgs } = group
  const isOut = direction === 'outbound'

  return (
    <div className={`flex flex-col gap-0.5 ${isOut ? 'items-end' : 'items-start'} px-3 sm:px-5 py-1`}>
      {/* Sender label — only once per group */}
      {isOut && (
        <div className="flex items-center gap-1.5 mb-1 pr-1">
          {isBot
            ? <><div className="w-4 h-4 rounded-full bg-[#EA9D13]/15 flex items-center justify-center"><Bot size={9} className="text-[#EA9D13]" /></div><span className="text-[10px] font-bold text-[#EA9D13] tracking-wide">SHA BOT</span></>
            : <><div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center"><User2 size={9} className="text-gray-500" /></div><span className="text-[10px] font-semibold text-gray-400">{agentName}</span></>
          }
        </div>
      )}

      {msgs.map((msg, i) => {
        const isFirst = i === 0
        const isLast = i === msgs.length - 1
        const showTime = isLast

        // Bubble shape: tail only on first (inbound) or last (outbound) of group
        const bubbleRadius = isOut
          ? isFirst && msgs.length > 1 ? 'rounded-2xl rounded-tr-md'
          : isLast ? 'rounded-2xl rounded-tr-[4px]'
          : 'rounded-xl rounded-r-md'
          : isFirst && msgs.length > 1 ? 'rounded-2xl rounded-tl-md'
          : isLast ? 'rounded-2xl rounded-tl-[4px]'
          : 'rounded-xl rounded-l-md'

        return (
          <div key={msg.id} className={`max-w-[82%] sm:max-w-[70%] md:max-w-[62%] ${isOut ? 'self-end' : 'self-start'}`}>
            <div className={`px-4 py-2.5 shadow-sm ${bubbleRadius} ${
              isBot
                ? 'bg-white border border-[#EA9D13]/20 text-gray-800'
                : isOut
                ? 'bg-[#091928] text-white'
                : 'bg-white text-gray-900 border border-gray-100'
            }`}>
              {msg.body
                ? <p className="text-[13px] sm:text-[13.5px] leading-[1.6] whitespace-pre-wrap break-words">{msg.body}</p>
                : <p className="text-xs italic opacity-40">[{msg.message_type}]</p>
              }
              {showTime && (
                <div className={`flex items-center gap-1.5 mt-2 ${isOut ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-[10px] tabular-nums ${isOut ? 'text-white/40' : 'text-gray-400'}`}>
                    {format(new Date(msg.timestamp), 'HH:mm')}
                  </span>
                  {isOut && <Tick status={msg.status} />}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Date separator ────────────────────────────────────────────────────────────

function DateSep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="flex-1 h-px bg-gray-200/50" />
      <span className="bg-[#091928]/80 text-white/90 text-[10px] font-semibold uppercase tracking-[0.12em] px-3 py-1 rounded-full">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-200/50" />
    </div>
  )
}

// ── Lead info panel ───────────────────────────────────────────────────────────

function LeadPanel({ detail, onClose }: { detail: WAConversationDetail; onClose: () => void }) {
  const d = detail.bot_data
  const name = detail.display_name || `+${detail.wa_id}`
  const facts = [
    { Icon: MapPin,    label: 'Location',     val: d.location },
    { Icon: d.place_type==='business' ? Building2 : Home, label: 'Place type', val: d.place_type },
    { Icon: Zap,       label: 'Power',        val: d.power_situation?.toString().replace(/_/g,' ') },
    { Icon: Sun,       label: 'Solar goal',   val: d.solar_goal?.toString().replace(/_/g,' ') },
    { Icon: Zap,       label: 'Usage',        val: d.usage?.toString().replace(/_/g,' ') },
    { Icon: Wallet,    label: 'Monthly bill', val: d.bill_rwf ? `${Number(d.bill_rwf).toLocaleString()} RWF` : null },
    { Icon: Zap,       label: 'Est. load',    val: d.estimated_daily_kwh ? `${d.estimated_daily_kwh} kWh/day` : null },
    { Icon: Wallet,    label: 'Budget',       val: d.budget?.toString().replace(/_/g,' ') },
  ].filter(f => f.val)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#091928] to-[#0d2438] px-4 py-3.5 flex items-center justify-between shrink-0">
        <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Lead Profile</span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Contact card */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <Av label={name} waId={detail.wa_id} px={46} />
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{name}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">+{detail.wa_id}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
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
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mt-2">
              <CircleCheck size={13} className="text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-600 font-semibold">Linked to CRM client</p>
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
              <div className="space-y-2.5">
                {facts.map(({ Icon, label, val }) => (
                  <div key={label} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-[#091928]/8 flex items-center justify-center shrink-0">
                      <Icon size={12} className="text-[#091928]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 leading-none mb-0.5">{label}</p>
                      <p className="text-[12px] font-semibold text-gray-800 capitalize">{String(val)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Bot size={20} className="text-gray-300" />
              </div>
              <p className="text-xs text-gray-400">Bot is collecting lead data…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── WhatsApp icon ─────────────────────────────────────────────────────────────

function WAIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.855L.057 23.986l6.305-1.654A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.869 0-3.628-.487-5.153-1.34l-.369-.219-3.846 1.008 1.025-3.74-.241-.385A9.929 9.929 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WhatsAppInboxPage() {
  const [mobileView, setMobileView] = useState<'list'|'chat'>('list')
  const [selectedId, setSelectedId] = useState<number|null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [text, setText] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: apiConvs = [], refetch: refetchList } = useQuery<WAConversation[]>({
    queryKey: ['wa-conversations', filterStatus],
    queryFn: async () => (await whatsappApi.conversations(filterStatus ? { status: filterStatus } : {})).data,
    refetchInterval: 10_000,
  })

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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [detail?.messages?.length])
  useEffect(() => { setShowInfo(false) }, [selectedId])

  const selectConv = (id: number) => { setSelectedId(id); setMobileView('chat') }

  const sendMutation = useMutation({
    mutationFn: ({ id, msg }: { id: number; msg: string }) => whatsappApi.send(id, msg),
    onSuccess: () => { setText(''); refetchDetail(); refetchList() },
  })
  const transferMutation = useMutation({
    mutationFn: (id: number) => whatsappApi.transfer(id),
    onSuccess: (res) => { window.open(res.data.link,'_blank'); refetchDetail(); refetchList() },
  })
  const resolveMutation = useMutation({
    mutationFn: (id: number) => whatsappApi.update(id, { status:'resolved' }),
    onSuccess: () => { refetchDetail(); refetchList() },
  })

  const handleSend = useCallback(() => {
    if (!selectedId || !text.trim() || sendMutation.isPending || isDemoSelected) return
    sendMutation.mutate({ id: selectedId, msg: text.trim() })
  }, [selectedId, text, sendMutation, isDemoSelected])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const filtered = convs.filter(c => {
    const pass = !filterStatus || c.status === filterStatus
    const q = search.toLowerCase()
    const match = !search || (c.display_name||c.wa_id).toLowerCase().includes(q)
    return pass && match
  })

  const totalUnread = convs.reduce((n,c)=>n+c.unread_count,0)
  const canReply = detail && detail.status!=='transferred' && detail.status!=='resolved' && !isDemoSelected
  const convName = detail ? (detail.display_name||`+${detail.wa_id}`) : ''

  const dateGroups = detail ? groupByDate(detail.messages) : []

  return (
    <div className="flex h-full overflow-hidden">

      {/* ─────────────── LEFT SIDEBAR ─────────────── */}
      <div className={`${mobileView==='chat' ? 'hidden' : 'flex'} md:flex w-full md:w-[300px] lg:w-[330px] shrink-0 flex-col border-r border-gray-200`}>

        {/* Sidebar header — navy gradient */}
        <div className="bg-gradient-to-b from-[#091928] to-[#0d2438] px-4 pt-4 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center shadow-md shrink-0">
                <WAIcon />
              </div>
              <div>
                <h1 className="font-bold text-white text-[14px] leading-none tracking-tight">WhatsApp CRM</h1>
                {totalUnread > 0
                  ? <p className="text-[11px] text-[#EA9D13] font-semibold mt-0.5">{totalUnread} unread</p>
                  : <p className="text-[11px] text-white/35 mt-0.5">{convs.length} conversations</p>
                }
              </div>
            </div>
            <button onClick={()=>refetchList()} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Search — dark style */}
          <div className="relative mb-3">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
            <input
              value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search name or number…"
              className="w-full bg-white/10 rounded-xl pl-8 pr-3 py-2 text-[12px] text-white placeholder:text-white/35 focus:outline-none focus:bg-white/15 transition-colors"
            />
          </div>

          {/* Filter tabs — gold active */}
          <div className="flex gap-1 overflow-x-auto" style={{scrollbarWidth:'none'}}>
            {(['','bot','human','transferred','resolved'] as const).map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)}
                className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  filterStatus===s ? 'bg-[#EA9D13] text-white shadow-sm' : 'bg-white/10 text-white/55 hover:bg-white/20 hover:text-white'
                }`}
              >
                {s==='' ? 'All' : STATUS_CFG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {/* Demo banner */}
        {isDemo && (
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-2">
            <span className="text-[11px] text-amber-700">
              <strong>Preview</strong> · Sample conversations shown
            </span>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-white">
          {filtered.length===0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <MessageSquare size={28} className="mb-2 opacity-25" />
              <p className="text-xs">{search ? 'No matches' : 'No conversations'}</p>
            </div>
          ) : filtered.map(c=>(
            <ConvRow key={c.id} conv={c} active={c.id===selectedId} onClick={()=>selectConv(c.id)} />
          ))}
        </div>
      </div>

      {/* ─────────────── CHAT AREA ─────────────── */}
      <div className={`${mobileView==='list' ? 'hidden' : 'flex'} md:flex flex-1 flex-col min-w-0`}>

        {!selectedId ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#F0F2F5] text-center p-8">
            <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center mb-5">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                  stroke="#091928" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".2"/>
              </svg>
            </div>
            <h2 className="font-bold text-gray-600 text-lg mb-2">SHA WhatsApp CRM</h2>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              Select a conversation to view messages and reply to leads.
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-gray-100 px-3 sm:px-5 py-3 flex items-center justify-between shrink-0" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button onClick={()=>setMobileView('list')} className="md:hidden p-1.5 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0">
                  <ArrowLeft size={18} />
                </button>
                {detail && <Av label={convName} waId={detail.wa_id} px={38} />}
                {detail ? (
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 text-sm">{convName}</p>
                      <StatusChip status={detail.status} />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      +{detail.wa_id}
                      <span className="hidden sm:inline">
                        {' · '}{LANG_FLAGS[detail.language]} {detail.language.toUpperCase()}
                        {detail.client_name && <span className="text-emerald-600 font-medium"> · ✓ {detail.client_name}</span>}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="w-28 h-4 bg-gray-100 animate-pulse rounded" />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {detail?.status==='human' && (
                  <button onClick={()=>transferMutation.mutate(detail.id)} disabled={transferMutation.isPending||isDemoSelected}
                    className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#22c55e] disabled:opacity-50 text-white font-semibold text-xs px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                  >
                    <ExternalLink size={12} className="shrink-0" />
                    <span className="hidden sm:inline">Transfer</span>
                    <span className="hidden lg:inline"> to WhatsApp</span>
                  </button>
                )}
                {detail && detail.status!=='resolved' && (
                  <button onClick={()=>resolveMutation.mutate(detail.id)} disabled={resolveMutation.isPending||isDemoSelected}
                    className="flex items-center gap-1 text-gray-500 border border-gray-200 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Check size={12} />
                    <span className="hidden sm:inline ml-0.5">Resolve</span>
                  </button>
                )}
                <button onClick={()=>setShowInfo(v=>!v)}
                  className={`p-2 rounded-xl transition-colors ${showInfo ? 'bg-[#091928] text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  <Info size={15} />
                </button>
                <button onClick={()=>refetchDetail()} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-2" style={{background:'#F0F2F5'}}>
              {!detail ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-[3px] border-[#091928]/15 border-t-[#091928] rounded-full animate-spin" />
                    <p className="text-xs text-gray-400">Loading…</p>
                  </div>
                </div>
              ) : dateGroups.length===0 ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">No messages yet</div>
              ) : (
                dateGroups.map(({ key, msgs }) => (
                  <div key={key}>
                    <DateSep label={sepLabel(key)} />
                    {buildGroups(msgs).map((group, gi) => (
                      <MsgGroupBubbles key={gi} group={group} />
                    ))}
                  </div>
                ))
              )}
              <div ref={bottomRef} className="h-3" />
            </div>

            {/* Input */}
            {canReply ? (
              <div className="bg-white border-t border-gray-100 px-3 sm:px-4 py-3 shrink-0">
                {detail?.status==='bot' && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-2.5">
                    <Bot size={12} className="text-[#EA9D13] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700">
                      <strong>SHA Bot</strong> is handling this — sending will take over the conversation.
                    </p>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={handleKey} rows={1}
                    placeholder="Type a message…"
                    className="flex-1 resize-none bg-[#F0F2F5] rounded-2xl px-4 py-2.5 text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#091928]/15 max-h-24 overflow-y-auto"
                    style={{lineHeight:'1.5'}}
                  />
                  <button onClick={handleSend} disabled={!text.trim()||sendMutation.isPending}
                    className="w-10 h-10 shrink-0 bg-[#EA9D13] hover:bg-[#d4890f] disabled:opacity-30 text-white rounded-2xl flex items-center justify-center transition-colors shadow-sm"
                  >
                    {sendMutation.isPending
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Send size={15} />
                    }
                  </button>
                </div>
                <p className="hidden sm:block text-[10px] text-gray-400 mt-1.5 pl-1">Enter to send · Shift+Enter for new line</p>
              </div>
            ) : isDemoSelected ? (
              <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 text-center shrink-0">
                <p className="text-xs text-gray-400"><strong className="text-gray-500">Preview mode</strong> · Connect WhatsApp to send real messages</p>
              </div>
            ) : detail?.status==='transferred' ? (
              <div className="bg-sky-50 border-t border-sky-100 px-4 py-3.5 text-center shrink-0">
                <p className="text-sm font-semibold text-sky-700">Transferred to main WhatsApp ✓</p>
                <p className="text-xs text-sky-500 mt-0.5">Continue on +250 780 348 624</p>
              </div>
            ) : detail?.status==='resolved' ? (
              <div className="bg-emerald-50 border-t border-emerald-100 px-4 py-3.5 text-center shrink-0">
                <p className="text-sm font-semibold text-emerald-700">Conversation resolved ✓</p>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ─────────────── LEAD PANEL ─────────────── */}
      {showInfo && detail && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]" onClick={()=>setShowInfo(false)} />
          <div className="fixed lg:static inset-y-0 right-0 z-50 w-[88vw] sm:w-80 lg:w-[272px] shrink-0 flex flex-col border-l border-gray-200 shadow-2xl lg:shadow-none">
            <LeadPanel detail={detail} onClose={()=>setShowInfo(false)} />
          </div>
        </>
      )}
    </div>
  )
}
