import { useRef, useEffect, useState, useCallback } from 'react'
import { vendors, MY_LOCATION } from './data.js'

/* ── Geo bounds for NW Calgary ───────────────────────────── */
const BOUNDS = {
  minLat: 51.030, maxLat: 51.135,
  minLng: -114.270, maxLng: -114.035,
}
const BASE_W = 900
const BASE_H = 680

function latLng(lat, lng) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * BASE_W
  const y = (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * BASE_H
  return [x, y]
}

/* ── Road network (approximate Calgary NW coords) ─────────── */
const HIGHWAYS = [
  // 16 Ave NW (Trans-Canada) — E-W ~lat 51.057
  { name: '16 Ave NW', pts: [[-114.265, 51.057], [-114.220, 51.057], [-114.150, 51.059], [-114.090, 51.057]], color: '#e8a020', w: 3 },
  // John Laurie Blvd — E-W ~lat 51.106
  { name: 'John Laurie Blvd', pts: [[-114.265, 51.106], [-114.220, 51.106], [-114.170, 51.107], [-114.135, 51.106], [-114.090, 51.106]], color: '#c97c18', w: 2.5 },
  // Crowfoot Trail — shorter E-W ~lat 51.115
  { name: 'Crowfoot Trail', pts: [[-114.230, 51.115], [-114.190, 51.115], [-114.150, 51.115]], color: '#c97c18', w: 2 },
]

const ARTERIALS = [
  // Shaganappi Trail — N-S ~lng -114.163
  { pts: [[-114.163, 51.038], [-114.163, 51.075], [-114.165, 51.098], [-114.168, 51.118]], w: 2 },
  // Crowchild Trail — N-S ~lng -114.130
  { pts: [[-114.130, 51.038], [-114.130, 51.060], [-114.131, 51.085], [-114.133, 51.108]], w: 2 },
  // Sarcee Trail — N-S ~lng -114.215
  { pts: [[-114.215, 51.045], [-114.215, 51.080], [-114.216, 51.110], [-114.218, 51.125]], w: 2 },
  // 14 St NW — N-S ~lng -114.094
  { pts: [[-114.094, 51.050], [-114.094, 51.080], [-114.095, 51.108]], w: 1.5 },
  // Bowness Rd — E-W ~lat 51.085
  { pts: [[-114.240, 51.085], [-114.210, 51.085], [-114.190, 51.086], [-114.175, 51.086]], w: 1.5 },
  // Nose Hill Dr — N-S ~lng -114.140
  { pts: [[-114.140, 51.090], [-114.140, 51.105], [-114.141, 51.120], [-114.142, 51.130]], w: 1.5 },
  // Northland Dr — E-W ~lat 51.102
  { pts: [[-114.175, 51.102], [-114.155, 51.102], [-114.140, 51.102], [-114.120, 51.102], [-114.095, 51.101]], w: 1.5 },
  // Varsity Dr — E-W ~lat 51.091
  { pts: [[-114.200, 51.091], [-114.180, 51.091], [-114.160, 51.092], [-114.145, 51.091]], w: 1.5 },
  // Brentwood Blvd — E-W ~lat 51.097
  { pts: [[-114.140, 51.097], [-114.120, 51.097], [-114.095, 51.096]], w: 1 },
  // Silver Springs Blvd — loop ~lat 51.098-51.108
  { pts: [[-114.215, 51.098], [-114.205, 51.098], [-114.200, 51.102], [-114.205, 51.108], [-114.215, 51.108]], w: 1 },
  // Market Mall / Crowfoot Ave area
  { pts: [[-114.190, 51.108], [-114.175, 51.108], [-114.160, 51.108]], w: 1 },
]

/* ── Bow River (sinuous E-W path across south portion) ─────── */
const BOW_RIVER = [
  [-114.265, 51.068], [-114.240, 51.066], [-114.220, 51.063],
  [-114.200, 51.062], [-114.180, 51.065], [-114.160, 51.063],
  [-114.140, 51.060], [-114.120, 51.058], [-114.095, 51.058],
]

/* ── Nose Hill Park (large green polygon) ───────────────────── */
const NOSE_HILL = [
  [-114.175, 51.088], [-114.130, 51.088], [-114.125, 51.095],
  [-114.120, 51.105], [-114.125, 51.118], [-114.130, 51.128],
  [-114.140, 51.133], [-114.160, 51.132], [-114.170, 51.128],
  [-114.178, 51.118], [-114.178, 51.105], [-114.175, 51.095],
]

/* ── Neighbourhood labels ───────────────────────────────────── */
const LABELS = [
  { name: 'Bowness',       lat: 51.086, lng: -114.210 },
  { name: 'Silver Springs', lat: 51.102, lng: -114.226 },
  { name: 'Varsity',       lat: 51.095, lng: -114.180 },
  { name: 'Dalhousie',     lat: 51.103, lng: -114.152 },
  { name: 'Brentwood',     lat: 51.096, lng: -114.125 },
  { name: 'Nose Hill\nPark', lat: 51.110, lng: -114.152 },
  { name: 'Capitol Hill',  lat: 51.057, lng: -114.094 },
  { name: 'Crowfoot',      lat: 51.115, lng: -114.196 },
]

/* ── Draw helpers ───────────────────────────────────────────── */
function drawPath(ctx, pts, color, lineWidth, closed = false, fillStyle = null) {
  if (!pts.length) return
  ctx.beginPath()
  const [x0, y0] = latLng(pts[0][1], pts[0][0])
  ctx.moveTo(x0, y0)
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = latLng(pts[i][1], pts[i][0])
    ctx.lineTo(x, y)
  }
  if (closed) ctx.closePath()
  if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill() }
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

function drawRiverSmooth(ctx, pts) {
  ctx.beginPath()
  const [x0, y0] = latLng(pts[0][1], pts[0][0])
  ctx.moveTo(x0, y0)
  for (let i = 1; i < pts.length - 1; i++) {
    const [x1, y1] = latLng(pts[i][1], pts[i][0])
    const [x2, y2] = latLng(pts[i + 1][1], pts[i + 1][0])
    ctx.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2)
  }
  const last = pts[pts.length - 1]
  const [lx, ly] = latLng(last[1], last[0])
  ctx.lineTo(lx, ly)
  ctx.strokeStyle = '#2563eb44'
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.strokeStyle = '#3b82f688'
  ctx.lineWidth = 4
  ctx.stroke()
}

/* ── Main component ─────────────────────────────────────────── */
export default function CalgaryMap({ onSelectVendor, selectedVendorId }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const stateRef = useRef({ scale: 1, tx: 0, ty: 0, dragging: false, lastX: 0, lastY: 0 })
  const pulseRef = useRef(0)
  const rafRef = useRef(null)
  const [, forceUpdate] = useState(0)

  /* ── Convert canvas coords back to base coords ── */
  function toBase(cx, cy) {
    const s = stateRef.current
    return [(cx - s.tx) / s.scale, (cy - s.ty) / s.scale]
  }

  /* ── Draw everything ── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { scale, tx, ty } = stateRef.current
    const W = canvas.width, H = canvas.height

    ctx.clearRect(0, 0, W, H)
    ctx.save()
    ctx.translate(tx, ty)
    ctx.scale(scale, scale)

    // Background
    ctx.fillStyle = '#080d1a'
    ctx.fillRect(-2000, -2000, 6000, 6000)

    // Block fill (lighter city background)
    ctx.fillStyle = '#0d1427'
    ctx.fillRect(0, 0, BASE_W, BASE_H)

    // Nose Hill Park
    ctx.beginPath()
    const noseFirst = latLng(NOSE_HILL[0][1], NOSE_HILL[0][0])
    ctx.moveTo(...noseFirst)
    NOSE_HILL.forEach(([lng, lat]) => { const [x, y] = latLng(lat, lng); ctx.lineTo(x, y) })
    ctx.closePath()
    ctx.fillStyle = '#0f2a1a'
    ctx.fill()
    ctx.strokeStyle = '#1a4a2a'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Nose Hill label area — subtle texture dots
    ctx.fillStyle = '#1a4a2a44'
    for (let i = 0; i < 60; i++) {
      const dotX = 390 + Math.sin(i * 1.3) * 70 + (i % 8) * 12
      const dotY = 120 + Math.cos(i * 0.9) * 50 + Math.floor(i / 8) * 14
      ctx.beginPath()
      ctx.arc(dotX, dotY, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Bow River
    drawRiverSmooth(ctx, BOW_RIVER)

    // "Bow River" label
    const [brx, bry] = latLng(51.063, -114.190)
    ctx.save()
    ctx.font = `italic ${9 / scale + 8}px Inter, sans-serif`
    ctx.fillStyle = '#3b82f699'
    ctx.fillText('Bow River', brx - 20, bry - 8)
    ctx.restore()

    // Arterials
    ARTERIALS.forEach(r => {
      drawPath(ctx, r.pts.map(([lng, lat]) => [lng, lat]), '#1e2d48', r.w * 1)
      // road center line
      drawPath(ctx, r.pts.map(([lng, lat]) => [lng, lat]), '#253554', r.w * 0.4)
    })

    // Highways
    HIGHWAYS.forEach(h => {
      // glow
      ctx.shadowColor = h.color + '44'
      ctx.shadowBlur = 6
      drawPath(ctx, h.pts.map(([lng, lat]) => [lng, lat]), h.color + 'aa', h.w * 2)
      ctx.shadowBlur = 0
      drawPath(ctx, h.pts.map(([lng, lat]) => [lng, lat]), h.color, h.w)
    })

    // Highway labels
    ctx.font = `bold 9px Inter, sans-serif`
    ctx.fillStyle = '#e8a02099'
    const [h16x, h16y] = latLng(51.057, -114.230)
    ctx.fillText('16 Ave NW', h16x, h16y - 5)
    const [jlx, jly] = latLng(51.106, -114.245)
    ctx.fillText('John Laurie Blvd', jlx, jly - 5)

    // Neighbourhood labels
    LABELS.forEach(l => {
      const [lx, ly] = latLng(l.lat, l.lng)
      ctx.font = `600 10px Inter, sans-serif`
      ctx.fillStyle = '#4a6a9966'
      const lines = l.name.split('\n')
      lines.forEach((line, i) => ctx.fillText(line.toUpperCase(), lx, ly + i * 13))
    })

    // Pulse animation tick
    const pulse = pulseRef.current
    const pulseFactor = 0.5 + 0.5 * Math.sin(pulse * 0.08)

    // User location pin
    const [ulx, uly] = latLng(MY_LOCATION.lat, MY_LOCATION.lng)
    // Outer pulse ring
    ctx.beginPath()
    ctx.arc(ulx, uly, 16 + pulseFactor * 8, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(139,92,246,${0.10 + pulseFactor * 0.10})`
    ctx.fill()
    // Inner pulse ring
    ctx.beginPath()
    ctx.arc(ulx, uly, 10 + pulseFactor * 4, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(139,92,246,${0.20 + pulseFactor * 0.10})`
    ctx.fill()
    // Core dot
    ctx.beginPath()
    ctx.arc(ulx, uly, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#8b5cf6'
    ctx.shadowColor = '#8b5cf6'
    ctx.shadowBlur = 12
    ctx.fill()
    ctx.shadowBlur = 0
    // Label
    ctx.font = 'bold 10px Inter, sans-serif'
    ctx.fillStyle = '#c4b5fd'
    ctx.fillText('You', ulx + 9, uly + 4)

    // Shop pins
    vendors.forEach(v => {
      const [px, py] = latLng(v.lat, v.lng)
      const isSelected = v.id === selectedVendorId
      const pinColor = isSelected ? '#8b5cf6' : '#f97316'
      const labelBg = isSelected ? 'rgba(139,92,246,0.9)' : 'rgba(249,115,22,0.9)'

      // Pin shadow
      ctx.beginPath()
      ctx.arc(px, py + 2, 10, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fill()

      // Pin circle
      ctx.beginPath()
      ctx.arc(px, py, 10, 0, Math.PI * 2)
      ctx.fillStyle = pinColor
      ctx.shadowColor = pinColor
      ctx.shadowBlur = isSelected ? 18 : 8
      ctx.fill()
      ctx.strokeStyle = isSelected ? '#c4b5fd' : '#fed7aa'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.shadowBlur = 0

      // Rating star inside pin
      ctx.font = 'bold 8px Inter, sans-serif'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.fillText(v.rating.toFixed(1), px, py + 3)
      ctx.textAlign = 'left'

      // Label bubble
      const labelW = 90
      const labelH = 26
      const labelX = px + 14
      const labelY = py - labelH / 2

      ctx.beginPath()
      ctx.roundRect(labelX, labelY, labelW, labelH, 5)
      ctx.fillStyle = labelBg
      ctx.fill()

      ctx.font = 'bold 8px Inter, sans-serif'
      ctx.fillStyle = '#fff'
      const name = v.businessName.length > 14 ? v.businessName.slice(0, 13) + '…' : v.businessName
      ctx.fillText(name, labelX + 5, labelY + 11)
      ctx.font = '7px Inter, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillText(`${v.distance}km · ⭐${v.rating}`, labelX + 5, labelY + 21)
    })

    ctx.restore()

    // Compass rose (top-right, fixed)
    const cx2 = W - 36, cy2 = 36
    ctx.save()
    ctx.font = 'bold 9px Inter, sans-serif'
    ctx.fillStyle = '#4a6a99'
    ctx.textAlign = 'center'
    ctx.fillText('N', cx2, cy2 - 14)
    ctx.fillStyle = '#8b5cf666'
    ctx.beginPath(); ctx.moveTo(cx2, cy2 - 10); ctx.lineTo(cx2 - 5, cy2 + 10); ctx.lineTo(cx2, cy2 + 6); ctx.lineTo(cx2 + 5, cy2 + 10); ctx.closePath(); ctx.fill()
    ctx.restore()

    // Scale bar (bottom-left, fixed)
    ctx.save()
    ctx.strokeStyle = '#4a6a9988'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(16, H - 20); ctx.lineTo(66, H - 20); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(16, H - 20); ctx.lineTo(16, H - 14); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(66, H - 20); ctx.lineTo(66, H - 14); ctx.stroke()
    ctx.font = '9px Inter, sans-serif'
    ctx.fillStyle = '#4a6a99aa'
    ctx.textAlign = 'center'
    ctx.fillText('~3 km', 41, H - 8)
    ctx.restore()

    pulseRef.current += 1
  }, [selectedVendorId])

  /* ── Animation loop ── */
  useEffect(() => {
    function loop() {
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  /* ── Resize observer ── */
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    function fitCanvas() {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width || 900
      canvas.height = rect.height || 380
      // Center the map on first fit
      const s = stateRef.current
      if (s.scale === 1 && s.tx === 0 && s.ty === 0) {
        const scaleX = canvas.width / BASE_W
        const scaleY = canvas.height / BASE_H
        const scale = Math.min(scaleX, scaleY) * 0.95
        s.scale = scale
        s.tx = (canvas.width - BASE_W * scale) / 2
        s.ty = (canvas.height - BASE_H * scale) / 2
      }
    }

    fitCanvas()
    const ro = new ResizeObserver(fitCanvas)
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  /* ── Zoom helpers ── */
  function applyZoom(delta, originX, originY) {
    const s = stateRef.current
    const factor = delta > 0 ? 1.15 : 1 / 1.15
    const newScale = Math.max(0.4, Math.min(6, s.scale * factor))
    const ratio = newScale / s.scale
    s.tx = originX - ratio * (originX - s.tx)
    s.ty = originY - ratio * (originY - s.ty)
    s.scale = newScale
  }

  /* ── Mouse events ── */
  function onMouseDown(e) {
    stateRef.current.dragging = true
    stateRef.current.lastX = e.clientX
    stateRef.current.lastY = e.clientY
  }

  function onMouseMove(e) {
    const s = stateRef.current
    if (!s.dragging) return
    s.tx += e.clientX - s.lastX
    s.ty += e.clientY - s.lastY
    s.lastX = e.clientX
    s.lastY = e.clientY
  }

  function onMouseUp(e) {
    const s = stateRef.current
    if (s.dragging && Math.abs(e.clientX - s.lastX) < 4 && Math.abs(e.clientY - s.lastY) < 4) {
      handleClick(e)
    }
    s.dragging = false
  }

  function onWheel(e) {
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    applyZoom(e.deltaY < 0 ? 1 : -1, e.clientX - rect.left, e.clientY - rect.top)
  }

  /* ── Touch events ── */
  const touchRef = useRef({ dist: 0, x: 0, y: 0 })
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      stateRef.current.dragging = true
      stateRef.current.lastX = e.touches[0].clientX
      stateRef.current.lastY = e.touches[0].clientY
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchRef.current.dist = Math.hypot(dx, dy)
      touchRef.current.x = (e.touches[0].clientX + e.touches[1].clientX) / 2
      touchRef.current.y = (e.touches[0].clientY + e.touches[1].clientY) / 2
    }
  }
  function onTouchMove(e) {
    e.preventDefault()
    const s = stateRef.current
    if (e.touches.length === 1 && s.dragging) {
      s.tx += e.touches[0].clientX - s.lastX
      s.ty += e.touches[0].clientY - s.lastY
      s.lastX = e.touches[0].clientX
      s.lastY = e.touches[0].clientY
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const newDist = Math.hypot(dx, dy)
      const rect = canvasRef.current.getBoundingClientRect()
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
      applyZoom(newDist > touchRef.current.dist ? 1 : -1, midX, midY)
      touchRef.current.dist = newDist
    }
  }
  function onTouchEnd() { stateRef.current.dragging = false }

  /* ── Click to select vendor ── */
  function handleClick(e) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const [bx, by] = toBase(cx, cy)
    const s = stateRef.current

    for (const v of vendors) {
      const [px, py] = latLng(v.lat, v.lng)
      const dist = Math.hypot(bx - px, by - py)
      if (dist < 14) {
        onSelectVendor && onSelectVendor(v)
        return
      }
    }
  }

  /* ── Zoom buttons ── */
  function zoomIn() {
    const canvas = canvasRef.current
    applyZoom(1, canvas.width / 2, canvas.height / 2)
  }
  function zoomOut() {
    const canvas = canvasRef.current
    applyZoom(-1, canvas.width / 2, canvas.height / 2)
  }
  function resetView() {
    const s = stateRef.current
    s.scale = 1; s.tx = 0; s.ty = 0
    // re-center
    const canvas = canvasRef.current
    if (canvas) {
      const scaleX = canvas.width / BASE_W
      const scaleY = canvas.height / BASE_H
      s.scale = Math.min(scaleX, scaleY) * 0.95
      s.tx = (canvas.width - BASE_W * s.scale) / 2
      s.ty = (canvas.height - BASE_H * s.scale) / 2
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden', background: '#080d1a', border: '1px solid rgba(139,92,246,0.2)' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: 'grab', width: '100%', height: '100%' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />

      {/* Zone label */}
      <div style={{ position: 'absolute', top: 12, left: 12, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: '#8b92aa', background: 'rgba(8,13,26,0.85)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(4px)' }}>
        📍 Calgary, AB — NW Zone
      </div>

      {/* Zoom controls */}
      <div style={{ position: 'absolute', bottom: 48, right: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[{ label: '+', fn: zoomIn }, { label: '−', fn: zoomOut }, { label: '⊙', fn: resetView }].map(({ label, fn }) => (
          <button key={label} onClick={fn} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(139,92,246,0.3)',
            background: 'rgba(8,13,26,0.9)', color: '#c4b5fd', fontSize: label === '⊙' ? 14 : 18,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)', fontWeight: 700, lineHeight: 1,
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(8,13,26,0.9)'}
          >{label}</button>
        ))}
      </div>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 12, fontSize: 10, color: '#8b92aa', background: 'rgba(8,13,26,0.85)', padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(4px)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />Shop</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />Selected</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', opacity: 0.5, display: 'inline-block' }} />You</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 3, background: '#3b82f8', opacity: 0.6, display: 'inline-block', borderRadius: 2 }} />Bow River</span>
      </div>
    </div>
  )
}
