import { useState, useContext, createContext, useEffect } from 'react'
import './App.css'
import { vendors, myVehicle, myBookings, aiConversation } from './data.js'
import CalgaryMap from './CalgaryMap.jsx'

/* ── Theme context ── */
const ThemeCtx = createContext({ dark: true, toggle: () => {} })

const statusMap = { requested: 'Pending', accepted: 'Accepted', inProgress: 'In Progress', done: 'Completed', rejected: 'Rejected' }
const servicePrices = { 'Oil Change': 79, 'Brake Inspection': 49, 'Brake Pad Replacement': 220, 'Engine Diagnostic': 120, 'Tire Rotation': 55, 'Battery Test & Replace': 160, 'Transmission Service': 280, 'AC Service': 180, 'Fluid Top-Up': 45 }

function Badge({ status, label }) {
  return <span className={`badge badge-${status}`}>{label || statusMap[status] || status}</span>
}

function Avatar({ name }) {
  return <div className="avatar">{(name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
}

const NAV = [
  { key: 'home',    icon: '🔍', label: 'Find' },
  { key: 'ai',      icon: '🤖', label: 'AI Chat' },
  { key: 'book',    icon: '📅', label: 'Bookings' },
  { key: 'tracker', icon: '📍', label: 'Tracker' },
  { key: 'vehicle', icon: '🚗', label: 'Vehicle' },
  { key: 'profile', icon: '👤', label: 'Profile' },
]

const NAV_FULL = [
  { key: 'home',    icon: '🔍', label: 'Find a Mechanic' },
  { key: 'ai',      icon: '🤖', label: 'AI Diagnostic' },
  { key: 'book',    icon: '📅', label: 'My Bookings' },
  { key: 'tracker', icon: '📍', label: 'Job Tracker' },
  { key: 'vehicle', icon: '🚗', label: 'My Vehicle' },
  { key: 'profile', icon: '👤', label: 'Profile' },
]

function Sidebar({ page, setPage, open, onClose }) {
  return (
    <>
      <div className={`sidebar-overlay${open ? ' visible' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="brand">⚙️ MechFind</div>
          <span className="role-badge">DRIVER APP</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_FULL.map(n => (
            <div key={n.key} className={`nav-item${page === n.key ? ' active' : ''}`}
              onClick={() => { setPage(n.key); onClose() }}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-name">Sarah Chen</div>
          <div className="user-loc">📍 Calgary, AB · NW</div>
        </div>
      </aside>
    </>
  )
}

function BottomNav({ page, setPage }) {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-items">
        {NAV.map(n => (
          <div key={n.key} className={`bottom-nav-item${page === n.key ? ' active' : ''}`} onClick={() => setPage(n.key)}>
            <span className="bn-icon">{n.icon}</span>
            <span>{n.label}</span>
          </div>
        ))}
      </div>
    </nav>
  )
}

function ThemeToggle() {
  const { dark, toggle } = useContext(ThemeCtx)
  return (
    <button onClick={toggle} className="btn btn-ghost btn-sm theme-toggle" title={dark ? 'Switch to light mode' : 'Switch to dark mode'} style={{ fontSize: 16, padding: '6px 9px', lineHeight: 1 }}>
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

function Topbar({ title, subtitle, onMenu, children }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="hamburger" onClick={onMenu}>☰</button>
        <div>
          <div className="topbar-title">{title}</div>
          {subtitle && <div className="topbar-sub">{subtitle}</div>}
        </div>
      </div>
      <div className="topbar-actions">
        {children}
        <ThemeToggle />
        <div className="notif-btn">
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 18, padding: '6px 8px' }}>🔔</button>
          <div className="notification-dot" />
        </div>
        <Avatar name="Sarah Chen" />
      </div>
    </div>
  )
}

/* ── Home / Search ───────────────────────────────────────── */
function Home({ setPage, setSelectedVendor, onMenu }) {
  const [search, setSearch] = useState('')
  const [serviceFilter, setServiceFilter] = useState(null)
  const [modeFilter, setModeFilter] = useState(null)
  const [maxPrice, setMaxPrice] = useState(500)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [mapHighlight, setMapHighlight] = useState(null)

  const filtered = vendors.filter(v => {
    if (search && !v.businessName.toLowerCase().includes(search.toLowerCase()) && !v.services.some(s => s.toLowerCase().includes(search.toLowerCase()))) return false
    if (serviceFilter && !v.services.includes(serviceFilter)) return false
    if (modeFilter && !v.modes.includes(modeFilter)) return false
    if (v.priceRange[0] > maxPrice) return false
    return true
  })

  function handleMapSelect(v) {
    setMapHighlight(v.id)
    setSelectedVendor(v)
    // scroll to card
    setTimeout(() => {
      const el = document.getElementById(`vendor-card-${v.id}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  return (
    <>
      <Topbar title="Find a Mechanic" subtitle="📍 NW Calgary — nearby vendors" onMenu={onMenu}>
        <button className="btn btn-primary btn-sm" onClick={() => setPage('ai')}>🤖 AI Diag</button>
      </Topbar>
      <div className="content">
        <div className="search-bar">
          <span style={{ color: 'var(--text-2)' }}>🔍</span>
          <input placeholder="Search by shop name or service..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => setSearch('')}>✕</button>}
        </div>

        <div className="filter-row">
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Service</span>
          {['Oil Change', 'Brake Inspection', 'Engine Diagnostic', 'Tire Rotation', 'Battery Test & Replace'].map(s => (
            <div key={s} className={`filter-chip${serviceFilter === s ? ' active' : ''}`} onClick={() => setServiceFilter(serviceFilter === s ? null : s)}>{s}</div>
          ))}
        </div>
        <div className="filter-row" style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mode</span>
          {['instore','mobile'].map(m => (
            <div key={m} className={`filter-chip${modeFilter === m ? ' active' : ''}`} onClick={() => setModeFilter(modeFilter === m ? null : m)}>
              {m === 'mobile' ? '🚗 Mobile' : '🏪 In-Store'}
            </div>
          ))}
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginLeft: 4 }}>Max</span>
          <select className="form-input" style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}>
            {[100, 150, 200, 350, 500].map(p => <option key={p} value={p}>${p}</option>)}
          </select>
        </div>

        {/* ── Interactive Calgary Map ── */}
        <div style={{
          height: mapExpanded ? 520 : 280,
          marginBottom: 16,
          borderRadius: 14,
          overflow: 'hidden',
          transition: 'height 0.35s cubic-bezier(0.4,0,0.2,1)',
          position: 'relative',
        }}>
          <CalgaryMap onSelectVendor={handleMapSelect} selectedVendorId={mapHighlight} />
          <button
            onClick={() => setMapExpanded(e => !e)}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(8,13,26,0.88)', border: '1px solid rgba(139,92,246,0.3)',
              color: '#c4b5fd', borderRadius: 8, padding: '5px 11px',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.3px',
              backdropFilter: 'blur(4px)',
            }}
          >{mapExpanded ? '⊟ Collapse' : '⊞ Expand'}</button>
        </div>

        {mapHighlight && (
          <div style={{ marginBottom: 14, fontSize: 12, color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📍 Map pin selected:</span>
            <span style={{ color: 'var(--text)' }}>{vendors.find(v => v.id === mapHighlight)?.businessName}</span>
            <button onClick={() => setMapHighlight(null)} style={{ marginLeft: 4, background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13 }}>✕</button>
          </div>
        )}

        <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
          {filtered.length} shop{filtered.length !== 1 ? 's' : ''} near you — tap a pin or card to book
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(v => (
            <div
              key={v.id}
              id={`vendor-card-${v.id}`}
              className="vendor-card"
              style={mapHighlight === v.id ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 2px rgba(139,92,246,0.25)' } : {}}
              onClick={() => { setSelectedVendor(v); setPage('vendor-detail') }}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{v.emoji}</div>
                  <div>
                    <div className="fw-700" style={{ fontSize: 15, color: 'var(--text)' }}>{v.businessName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{v.neighbourhood} · {v.yearsOpen}yr established</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>⭐ {v.rating}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{v.reviewCount} reviews</div>
                </div>
              </div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>
                    {v.distance} km · {v.nextAvailable}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>{v.modes.map(m => <span key={m} className={`badge badge-${m}`}>{m === 'mobile' ? '🚗 Mobile' : '🏪 In-Store'}</span>)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>From</div>
                  <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>${v.priceRange[0]}</div>
                </div>
              </div>
              <div>
                {v.services.slice(0, 4).map(s => <span key={s} className="service-tag">{s}</span>)}
                {v.services.length > 4 && <span className="service-tag">+{v.services.length - 4} more</span>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="icon">🔍</div>
              <div>No vendors match your filters.</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Vendor Detail / Booking ─────────────────────────────── */
function VendorDetail({ vendor, setPage, onMenu }) {
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedMode, setSelectedMode] = useState(vendor.modes[0])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [booked, setBooked] = useState(false)

  const availSlots = [
    { id: 1, time: '11:00 AM', date: 'Today, Jun 9' },
    { id: 2, time: '1:30 PM',  date: 'Today, Jun 9' },
    { id: 3, time: '9:00 AM',  date: 'Tomorrow, Jun 10' },
    { id: 4, time: '11:00 AM', date: 'Tomorrow, Jun 10' },
  ]

  const stepLabels = ['Select Service', 'Choose Slot', 'Confirm']

  if (booked) return (
    <>
      <Topbar title="Booking Confirmed" onMenu={onMenu} />
      <div className="content" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Booking Requested!</div>
        <div style={{ color: 'var(--text-2)', marginBottom: 24 }}>Sent to {vendor.businessName}. You&apos;ll get a push notification once they accept.</div>
        <div className="card mb-4" style={{ textAlign: 'left' }}>
          {[['Vendor', vendor.businessName], ['Service', selectedService], ['Mode', selectedMode], ['Slot', selectedSlot], ['Vehicle', `${myVehicle.year} ${myVehicle.make} ${myVehicle.model}`], ['Est. Price', `$${servicePrices[selectedService] || 79}`]].map(([k, v]) => (
            <div key={k} className="info-row"><span className="info-label">{k}</span><span className="info-value">{v}</span></div>
          ))}
        </div>
        <div className="flex gap-2 justify-between">
          <button className="btn btn-primary" onClick={() => setPage('tracker')}>📍 Track Job</button>
          <button className="btn btn-secondary" onClick={() => setPage('home')}>Back to Search</button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <Topbar title={vendor.businessName} subtitle={`${vendor.distance === 0 ? 'Mobile' : `${vendor.distance} km away`} · ${vendor.nextAvailable}`} onMenu={onMenu}>
        <button className="btn btn-secondary btn-sm" onClick={() => setPage('home')}>← Back</button>
      </Topbar>
      <div className="content" style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="booking-steps mb-4">
          {stepLabels.map((l, i) => (
            <div key={l} className="bstep">
              <div className={`bstep-circle${i + 1 < step ? ' done' : i + 1 === step ? ' active' : ''}`}>{i + 1 < step ? '✓' : i + 1}</div>
              <div className={`bstep-label${i + 1 === step ? ' active' : ''}`}>{l}</div>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="card">
            <div className="card-title mb-3">Select a Service</div>
            <div className="form-group">
              <label className="form-label">Mode</label>
              <div className="flex gap-2">
                {vendor.modes.map(m => (
                  <button key={m} className={`btn btn-sm ${selectedMode === m ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSelectedMode(m)}>
                    {m === 'mobile' ? '🚗 Mobile' : '🏪 In-Store'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0' }}>
              {vendor.services.map(s => (
                <div key={s} onClick={() => setSelectedService(s)} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px',
                  border: `1.5px solid ${selectedService === s ? 'var(--accent)' : 'var(--border-2)'}`,
                  borderRadius: 10, cursor: 'pointer',
                  background: selectedService === s ? 'var(--accent-dim)' : 'var(--surface)',
                  transition: 'all 0.15s',
                }}>
                  <span className="fw-600" style={{ color: selectedService === s ? 'var(--accent)' : 'var(--text)' }}>{s}</span>
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>${servicePrices[s] || '—'}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-full" disabled={!selectedService} onClick={() => setStep(2)} style={{ opacity: selectedService ? 1 : 0.4 }}>Continue →</button>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <div className="card-title mb-3">Choose an Available Slot</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {availSlots.map(s => {
                const val = `${s.date} at ${s.time}`
                const sel = selectedSlot === val
                return (
                  <div key={s.id} onClick={() => setSelectedSlot(val)} style={{
                    padding: 16, border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border-2)'}`,
                    borderRadius: 10, cursor: 'pointer',
                    background: sel ? 'var(--accent-dim)' : 'var(--surface)',
                    textAlign: 'center', transition: 'all 0.15s',
                  }}>
                    <div className="fw-700" style={{ color: sel ? 'var(--accent)' : 'var(--text)' }}>{s.time}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{s.date}</div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" disabled={!selectedSlot} onClick={() => setStep(3)} style={{ opacity: selectedSlot ? 1 : 0.4 }}>Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card">
            <div className="card-title mb-3">Confirm Your Booking</div>
            {[['Vendor', vendor.businessName], ['Service', selectedService], ['Mode', selectedMode === 'mobile' ? '🚗 Mobile' : '🏪 In-Store'], ['Slot', selectedSlot], ['Vehicle', `${myVehicle.year} ${myVehicle.make} ${myVehicle.model}`], ['VIN', myVehicle.vin], ['Est. Price', `$${servicePrices[selectedService] || 79}`]].map(([k, v]) => (
              <div key={k} className="info-row"><span className="info-label">{k}</span><span className="info-value">{v}</span></div>
            ))}
            <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--accent)', margin: '16px 0' }}>
              Estimate only — final price confirmed on acceptance.
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-success" onClick={() => setBooked(true)}>✓ Request Booking</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ── AI Diagnostic ───────────────────────────────────────── */
function AIDiagnostic({ setPage, onMenu }) {
  const [messages, setMessages] = useState(aiConversation)
  const [input, setInput] = useState('')

  function send() {
    if (!input.trim()) return
    const userMsg = { role: 'user', text: input }
    setInput('')
    setMessages(prev => [...prev, userMsg])
    const lower = input.toLowerCase()
    setTimeout(() => {
      let reply
      if (lower.includes('start') || lower.includes('battery')) {
        reply = { role: 'assistant', text: "⚠️ **Severity: Safety-Critical** — A no-start condition can indicate a dead battery, failed starter, or fuel system issue.\n\nI've found vendors near you who can diagnose this today.", vendors: true }
      } else if (lower.includes('oil') || lower.includes('change')) {
        reply = { role: 'assistant', text: "Routine maintenance for your 2021 Honda Civic. Full synthetic oil change recommended every 8,000–10,000 km.\n\n**DIY difficulty: Easy** — or book a nearby pro below.", vendors: true }
      } else if (lower.includes('engine') || lower.includes('check') || lower.includes('light')) {
        reply = { role: 'assistant', text: "🔴 **Check Engine Light** — Could be minor (loose gas cap) or serious (O2 sensor, misfire). A diagnostic scan is needed.\n\n**Do not ignore** if the light is flashing.", vendors: true }
      } else {
        reply = { role: 'assistant', text: "Thanks. Based on your 2021 Honda Civic, let me dig into that — can you tell me when this happens? At startup, while driving, or under specific conditions?", vendors: false }
      }
      setMessages(prev => [...prev, reply])
    }, 800)
  }

  return (
    <>
      <Topbar title="AI Diagnostic" subtitle="Claude (Anthropic) · Server-side · Not a substitute for inspection" onMenu={onMenu} />
      <div className="chat-wrap">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role}`}>
              {m.text.split('\n').map((line, j) => (
                <div key={j} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} style={{ marginBottom: 2 }} />
              ))}
              {m.vendors && (
                <div className="chat-vendor-suggest">
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text)' }}>Nearby vendors available:</div>
                  {vendors.slice(0, 2).map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(139,92,246,0.2)', fontSize: 13 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{v.emoji} {v.businessName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{v.nextAvailable} · ⭐{v.rating}</div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => setPage('home')}>Book →</button>
                    </div>
                  ))}
                  <button className="btn btn-outline btn-sm btn-full" style={{ marginTop: 10 }} onClick={() => setPage('home')}>See all vendors →</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="chat-input-row">
          <input placeholder="Describe your car issue... e.g. 'grinding when I brake'" value={input}
            onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
          <button className="btn btn-primary" onClick={send}>Send</button>
        </div>
      </div>
    </>
  )
}

/* ── My Bookings ─────────────────────────────────────────── */
function MyBookings({ setPage, onMenu }) {
  return (
    <>
      <Topbar title="My Bookings" subtitle="Upcoming and past appointments" onMenu={onMenu} />
      <div className="content">
        {myBookings.map(b => (
          <div key={b.id} className="card mb-3">
            <div className="flex justify-between items-center mb-3">
              <div className="fw-700" style={{ fontSize: 15 }}>{b.service}</div>
              <Badge status={b.status} label={statusMap[b.status]} />
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
              <div>🏪 {b.vendorName}</div>
              <div>📅 {b.date} at {b.time}</div>
              <div>🚗 {b.vehicle} · <span className={`badge badge-${b.mode}`}>{b.mode}</span></div>
              <div>💰 ${b.price}</div>
            </div>
            {b.status === 'accepted' && <button className="btn btn-primary btn-sm" onClick={() => setPage('tracker')}>📍 Track Job →</button>}
            {b.status === 'done' && <button className="btn btn-secondary btn-sm">Leave Review</button>}
          </div>
        ))}
        <button className="btn btn-primary" onClick={() => setPage('home')}>+ Book New Service</button>
      </div>
    </>
  )
}

/* ── Job Tracker ─────────────────────────────────────────── */
function JobTracker({ onMenu }) {
  const steps = ['requested','accepted','inProgress','done']
  const stepLabel = { requested: 'Requested', accepted: 'Accepted', inProgress: 'In Progress', done: 'Completed' }
  const active = myBookings.find(b => b.status === 'accepted')
  const idx = steps.indexOf(active?.status || 'requested')

  return (
    <>
      <Topbar title="Job Tracker" subtitle="Live status of your current job" onMenu={onMenu} />
      <div className="content" style={{ maxWidth: 580, margin: '0 auto' }}>
        {active ? (
          <div className="card">
            <div className="fw-700" style={{ fontSize: 16, marginBottom: 4 }}>{active.service}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 18 }}>{active.vendorName} · {active.date} at {active.time}</div>
            <div className="tracker-steps" style={{ marginBottom: 20 }}>
              {steps.map((s, i) => (
                <div key={s} className="tracker-step">
                  <div className={`step-circle${i < idx ? ' done' : i === idx ? ' active' : ''}`}>{i < idx ? '✓' : i + 1}</div>
                  <div className={`step-label${i === idx ? ' active' : ''}`}>{stepLabel[s]}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>✓ Booking Accepted</div>
              <div style={{ fontSize: 13, color: 'var(--success)' }}>Head to Calgary Auto Experts 5 min before {active.time}.</div>
            </div>
            {[['Vendor', active.vendorName], ['Address', '1428 Centre St NW, Calgary, AB'], ['Service', active.service], ['Price', `$${active.price}`], ['Vehicle', active.vehicle]].map(([k, v]) => (
              <div key={k} className="info-row"><span className="info-label">{k}</span><span className="info-value">{v}</span></div>
            ))}
          </div>
        ) : (
          <div className="card empty-state"><div className="icon">📍</div><div>No active jobs right now.</div></div>
        )}
      </div>
    </>
  )
}

/* ── My Vehicle ──────────────────────────────────────────── */
function MyVehicle({ onMenu }) {
  const [vin, setVin] = useState(myVehicle.vin)
  const [decoded, setDecoded] = useState(myVehicle.decoded)

  const maintenance = [
    { svc: 'Oil Change',       interval: 'Every 8,000 km',  urgency: 'Due soon', badge: 'warn' },
    { svc: 'Brake Inspection', interval: 'Every 20,000 km', urgency: 'Up to date', badge: 'ok' },
    { svc: 'Tire Rotation',    interval: 'Every 10,000 km', urgency: 'Due',       badge: 'warn' },
    { svc: 'Cabin Air Filter', interval: 'Every 20,000 km', urgency: 'Up to date', badge: 'ok' },
  ]

  return (
    <>
      <Topbar title="My Vehicle" subtitle="VIN decode and maintenance schedule" onMenu={onMenu} />
      <div className="content" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="card mb-4">
          <div className="card-title mb-3">VIN Entry</div>
          <div className="flex gap-2">
            <input className="form-input" placeholder="Enter 17-digit VIN" value={vin} onChange={e => setVin(e.target.value)} style={{ fontFamily: 'monospace', letterSpacing: 1 }} />
            <button className="btn btn-primary" onClick={() => setDecoded(true)}>Decode</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 8 }}>NHTSA vPIC API — free, no key required</div>
        </div>

        {decoded && (
          <div className="vin-box mb-4">
            <div className="vin-label">Decoded Vehicle</div>
            <div className="vin-vehicle">{myVehicle.year} {myVehicle.make} {myVehicle.model}</div>
            <div className="vin-detail">{myVehicle.trim} · {myVehicle.engine}</div>
            <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>VIN: {myVehicle.vin}</div>
          </div>
        )}

        {decoded && (
          <div className="card">
            <div className="card-title mb-3">Maintenance Schedule</div>
            {maintenance.map(r => (
              <div key={r.svc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="fw-600" style={{ fontSize: 14 }}>{r.svc}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{r.interval}</div>
                </div>
                <span style={{
                  background: r.badge === 'warn' ? 'var(--warn-dim)' : 'var(--success-dim)',
                  color: r.badge === 'warn' ? 'var(--warn)' : 'var(--success)',
                  border: `1px solid ${r.badge === 'warn' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                }}>{r.urgency}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ── Profile ─────────────────────────────────────────────── */
function Profile({ onMenu }) {
  return (
    <>
      <Topbar title="Profile" subtitle="Your account and preferences" onMenu={onMenu} />
      <div className="content" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="card mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div style={{ width: 56, height: 56, borderRadius: 50, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', fontWeight: 800 }}>SC</div>
            <div>
              <div className="card-title">Sarah Chen</div>
              <div className="card-sub">Member since January 2026</div>
            </div>
          </div>
          <hr className="divider" />
          {[['Email', 'sarah.chen@gmail.com'], ['Phone', '(403) 555-0241'], ['Location', 'NW Calgary, AB'], ['Vehicle', '2021 Honda Civic']].map(([k, v]) => (
            <div key={k} className="info-row"><span className="info-label">{k}</span><span className="info-value">{v}</span></div>
          ))}
        </div>
        <div className="card mb-4">
          <div className="card-title mb-3">Edit Profile</div>
          <div className="form-group"><label className="form-label">Name</label><input className="form-input" defaultValue="Sarah Chen" /></div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-input" defaultValue="(403) 555-0241" /></div>
          <div className="form-group"><label className="form-label">Location</label><input className="form-input" defaultValue="NW Calgary, AB" /></div>
          <button className="btn btn-primary">Save Changes</button>
        </div>
        <div className="card">
          <div className="card-title mb-3">Booking History</div>
          {myBookings.map(b => (
            <div key={b.id} className="info-row">
              <div><div className="fw-600">{b.service}</div><div style={{ fontSize: 12, color: 'var(--text-2)' }}>{b.vendorName} · {b.date}</div></div>
              <Badge status={b.status} label={statusMap[b.status]} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/* ── Login ───────────────────────────────────────────────── */
function Login({ onLogin }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">⚙️ MechFind</div>
        <div className="auth-sub">Find trusted mechanics near you in Calgary</div>
        <div className="form-group">
          <label className="form-label">Email or Phone</label>
          <input className="form-input" type="email" defaultValue="sarah.chen@gmail.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" defaultValue="••••••••" />
        </div>
        <button className="btn btn-primary btn-full" onClick={onLogin}>Sign In</button>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-2)' }}>
          New to MechFind?{' '}
          <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={onLogin}>Create Account →</span>
        </div>
        <hr className="divider" />
        <div className="auth-demo">
          <strong>Demo:</strong> Click &ldquo;Sign In&rdquo; to explore the driver app
        </div>
      </div>
    </div>
  )
}

/* ── App Root ────────────────────────────────────────────── */
export default function App() {
  const [authed, setAuthed] = useState(false)
  const [page, setPage] = useState('home')
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('mf-consumer-theme') !== 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('mf-consumer-theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggle = () => setDark(d => !d)

  if (!authed) return (
    <ThemeCtx.Provider value={{ dark, toggle }}>
      <Login onLogin={() => setAuthed(true)} />
    </ThemeCtx.Provider>
  )

  const onMenu = () => setSidebarOpen(o => !o)
  const onClose = () => setSidebarOpen(false)
  const navPage = page === 'vendor-detail' ? 'home' : page

  const pages = {
    home:          <Home setPage={setPage} setSelectedVendor={setSelectedVendor} onMenu={onMenu} />,
    'vendor-detail': selectedVendor ? <VendorDetail vendor={selectedVendor} setPage={setPage} onMenu={onMenu} /> : null,
    ai:            <AIDiagnostic setPage={setPage} onMenu={onMenu} />,
    book:          <MyBookings setPage={setPage} onMenu={onMenu} />,
    tracker:       <JobTracker onMenu={onMenu} />,
    vehicle:       <MyVehicle onMenu={onMenu} />,
    profile:       <Profile onMenu={onMenu} />,
  }

  return (
    <ThemeCtx.Provider value={{ dark, toggle }}>
      <div className="layout">
        <Sidebar page={navPage} setPage={setPage} open={sidebarOpen} onClose={onClose} />
        <main className="main">{pages[page] || pages.home}</main>
        <BottomNav page={navPage} setPage={p => { setPage(p); onClose() }} />
      </div>
    </ThemeCtx.Provider>
  )
}
