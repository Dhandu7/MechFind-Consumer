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

/* ── Google Maps fixed colour palette ──────────────────────── */
const GM = {
  land:        '#e8e0d8',   // warm parchment — Google's land base
  landDark:    '#ddd5cc',   // slightly darker fill variant
  park:        '#c8dab0',   // muted sage green — Google park
  parkStroke:  '#b5c89a',
  water:       '#a8d5f0',   // sky-blue — Google water
  waterDeep:   '#89c4e8',
  hwy:         '#f8c84a',   // amber-yellow — Google highway
  hwyStroke:   '#e0a830',
  road:        '#ffffff',   // white arterial
  roadStroke:  '#d8d0c8',   // pale warm-gray outline
  minor:       '#f2ede6',   // minor road fill
  minorStroke: '#d0c8be',
  label:       '#5c544e',   // dark warm-gray label
  labelPark:   '#4a7040',   // dark green park label
  labelWater:  '#2c78b0',   // blue water label
  labelHwy:    '#8a5a00',   // brown highway label
}

/* ── Road network (approximate Calgary NW coords) ─────────── */
const HIGHWAYS = [
  // 16 Ave NW (Trans-Canada) — E-W ~lat 51.057
  { name: '16 Ave NW', pts: [[-114.265, 51.057], [-114.220, 51.057], [-114.150, 51.059], [-114.090, 51.057]], color: GM.hwy, stroke: GM.hwyStroke, w: 5 },
  // John Laurie Blvd — E-W ~lat 51.106
  { name: 'John Laurie Blvd', pts: [[-114.265, 51.106], [-114.220, 51.106], [-114.170, 51.107], [-114.135, 51.106], [-114.090, 51.106]], color: GM.hwy, stroke: GM.hwyStroke, w: 4 },
  // Crowfoot Trail — shorter E-W ~lat 51.115
  { name: 'Crowfoot Trail', pts: [[-114.230, 51.115], [-114.190, 51.115], [-114.150, 51.115]], color: GM.hwy, stroke: GM.hwyStroke, w: 3.5 },
]

const ARTERIALS = [
  // Shaganappi Trail
  { pts: [[-114.163, 51.038], [-114.163, 51.075], [-114.165, 51.098], [-114.168, 51.118]], w: 3 },
  // Crowchild Trail
  { pts: [[-114.130, 51.038], [-114.130, 51.060], [-114.131, 51.085], [-114.133, 51.108]], w: 3 },
  // Sarcee Trail
  { pts: [[-114.215, 51.045], [-114.215, 51.080], [-114.216, 51.110], [-114.218, 51.125]], w: 3 },
  // 14 St NW
  { pts: [[-114.094, 51.050], [-114.094, 51.080], [-114.095, 51.108]], w: 2.5 },
  // Bowness Rd
  { pts: [[-114.240, 51.085], [-114.210, 51.085], [-114.190, 51.086], [-114.175, 51.086]], w: 2.5 },
  // Nose Hill Dr
  { pts: [[-114.140, 51.090], [-114.140, 51.105], [-114.141, 51.120], [-114.142, 51.130]], w: 2.5 },
  // Northland Dr
  { pts: [[-114.175, 51.102], [-114.155, 51.102], [-114.140, 51.102], [-114.120, 51.102], [-114.095, 51.101]], w: 2.5 },
  // Varsity Dr
  { pts: [[-114.200, 51.091], [-114.180, 51.091], [-114.160, 51.092], [-114.145, 51.091]], w: 2.5 },
  // Brentwood Blvd
  { pts: [[-114.140, 51.097], [-114.120, 51.097], [-114.095, 51.096]], w: 2 },
  // Silver Springs Blvd
  { pts: [[-114.215, 51.098], [-114.205, 51.098], [-114.200, 51.102], [-114.205, 51.108], [-114.215, 51.108]], w: 2 },
  // Market Mall / Crowfoot Ave
  { pts: [[-114.190, 51.108], [-114.175, 51.108], [-114.160, 51.108]], w: 2 },
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

    // ── Google Maps style background ──────────────────────────

    // Land base — warm parchment
    ctx.fillStyle = GM.land
    ctx.fillRect(-2000, -2000, 6000, 6000)
    ctx.fillRect(0, 0, BASE_W, BASE_H)

    // Nose Hill Park — sage green polygon
    ctx.beginPath()
    const noseFirst = latLng(NOSE_HILL[0][1], NOSE_HILL[0][0])
    ctx.moveTo(...noseFirst)
    NOSE_HILL.forEach(([lng, lat]) => { const [x, y] = latLng(lat, lng); ctx.lineTo(x, y) })
    ctx.closePath()
    ctx.fillStyle = GM.park
    ctx.fill()
    ctx.strokeStyle = GM.parkStroke
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Park texture — subtle stipple dots
    ctx.fillStyle = GM.parkStroke + '88'
    for (let i = 0; i < 60; i++) {
      const dotX = 390 + Math.sin(i * 1.3) * 70 + (i % 8) * 12
      const dotY = 120 + Math.cos(i * 0.9) * 50 + Math.floor(i / 8) * 14
      ctx.beginPath()
      ctx.arc(dotX, dotY, 1.2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Bow River — Google Maps water blue
    ctx.beginPath()
    const [bx0, by0] = latLng(BOW_RIVER[0][1], BOW_RIVER[0][0])
    ctx.moveTo(bx0, by0)
    for (let i = 1; i < BOW_RIVER.length - 1; i++) {
      const [x1, y1] = latLng(BOW_RIVER[i][1], BOW_RIVER[i][0])
      const [x2, y2] = latLng(BOW_RIVER[i+1][1], BOW_RIVER[i+1][0])
      ctx.quadraticCurveTo(x1, y1, (x1+x2)/2, (y1+y2)/2)
    }
    const [blx, bly] = latLng(BOW_RIVER[BOW_RIVER.length-1][1], BOW_RIVER[BOW_RIVER.length-1][0])
    ctx.lineTo(blx, bly)
    ctx.strokeStyle = GM.waterDeep
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.strokeStyle = GM.water
    ctx.lineWidth = 7
    ctx.stroke()
    ctx.lineCap = 'butt'

    // "Bow River" italic label
    const [brx, bry] = latLng(51.063, -114.190)
    ctx.save()
    ctx.font = `italic 600 9px Inter, sans-serif`
    ctx.fillStyle = GM.labelWater
    ctx.fillText('Bow River', brx - 20, bry - 7)
    ctx.restore()

    // Arterials — white roads with warm-gray outline
    ARTERIALS.forEach(r => {
      const coords = r.pts.map(([lng, lat]) => [lng, lat])
      drawPath(ctx, coords, GM.roadStroke, r.w + 2)   // outline
      drawPath(ctx, coords, GM.road, r.w)              // fill
    })

    // Highways — drawn as outline + amber fill (Google style)
    HIGHWAYS.forEach(h => {
      const coords = h.pts.map(([lng, lat]) => [lng, lat])
      drawPath(ctx, coords, h.stroke, h.w + 3)    // dark outline
      drawPath(ctx, coords, h.color, h.w)         // amber fill
    })

    // Highway labels
    ctx.font = `bold 9px Inter, sans-serif`
    ctx.fillStyle = GM.labelHwy
    const [h16x, h16y] = latLng(51.057, -114.230)
    ctx.fillText('16 Ave NW', h16x, h16y - 6)
    const [jlx, jly] = latLng(51.106, -114.245)
    ctx.fillText('John Laurie Blvd', jlx, jly - 6)

    // Neighbourhood labels
    LABELS.forEach(l => {
      const [lx, ly] = latLng(l.lat, l.lng)
      const lines = l.name.split('\n')
      const ispark = l.name.includes('Hill')
      ctx.font = `600 9px Inter, sans-serif`
      ctx.fillStyle = ispark ? GM.labelPark : GM.label
      lines.forEach((line, i) => ctx.fillText(line.toUpperCase(), lx, ly + i * 12))
    })

    // Pulse animation tick
    const pulse = pulseRef.current
    const pulseFactor = 0.5 + 0.5 * Math.sin(pulse * 0.08)

    // User location pin — Google Maps blue dot style
    const [ulx, uly] = latLng(MY_LOCATION.lat, MY_LOCATION.lng)
    // Accuracy ring (pulse)
    ctx.beginPath()
    ctx.arc(ulx, uly, 18 + pulseFactor * 8, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(66,133,244,${0.10 + pulseFactor * 0.08})`
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ulx, uly, 12 + pulseFactor * 4, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(66,133,244,${0.18 + pulseFactor * 0.08})`
    ctx.fill()
    // White halo
    ctx.beginPath()
    ctx.arc(ulx, uly, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 4
    ctx.fill()
    ctx.shadowBlur = 0
    // Blue core
    ctx.beginPath()
    ctx.arc(ulx, uly, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#4285f4'
    ctx.fill()
    // Label
    ctx.font = 'bold 9px Inter, sans-serif'
    ctx.fillStyle = '#1a73e8'
    ctx.fillText('You', ulx + 10, uly + 4)

    // Shop pins — Google Maps teardrop style
    vendors.forEach(v => {
      const [px, py] = latLng(v.lat, v.lng)
      const isSelected = v.id === selectedVendorId
      // Google Maps red for unselected, blue for selected
      const pinColor  = isSelected ? '#1a73e8' : '#ea4335'
      const pinStroke = isSelected ? '#1557b0' : '#c5221f'
      const labelBg   = isSelected ? 'rgba(26,115,232,0.95)' : 'rgba(234,67,53,0.95)'

      // Drop shadow
      ctx.beginPath()
      ctx.arc(px, py + 2, 11, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.20)'
      ctx.fill()

      // Pin body
      ctx.beginPath()
      ctx.arc(px, py, 10, 0, Math.PI * 2)
      ctx.fillStyle = pinColor
      ctx.fill()
      ctx.strokeStyle = pinStroke
      ctx.lineWidth = 1.5
      ctx.stroke()

      // White ring inside
      ctx.beginPath()
      ctx.arc(px, py, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      // Rating label bubble
      const name = v.businessName.length > 14 ? v.businessName.slice(0, 13) + '…' : v.businessName
      const labelW = 88, labelH = 26
      const labelX = px + 13, labelY = py - labelH / 2

      // Bubble shadow
      ctx.shadowColor = 'rgba(0,0,0,0.18)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetY = 2
      ctx.beginPath()
      ctx.roundRect(labelX, labelY, labelW, labelH, 5)
      ctx.fillStyle = labelBg
      ctx.fill()
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0

      ctx.font = 'bold 8px Inter, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(name, labelX + 5, labelY + 11)
      ctx.font = '7px Inter, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.88)'
      ctx.fillText(`${v.distance}km · ★${v.rating}`, labelX + 5, labelY + 21)
    })

    ctx.restore()

    // Compass rose (top-right, fixed)
    const cx2 = W - 36, cy2 = 36
    ctx.save()
    ctx.font = 'bold 9px Inter, sans-serif'
    ctx.fillStyle = '#5c544e'
    ctx.textAlign = 'center'
    ctx.fillText('N', cx2, cy2 - 14)
    ctx.fillStyle = '#ea4335aa'
    ctx.beginPath(); ctx.moveTo(cx2, cy2 - 10); ctx.lineTo(cx2 - 5, cy2 + 10); ctx.lineTo(cx2, cy2 + 6); ctx.lineTo(cx2 + 5, cy2 + 10); ctx.closePath(); ctx.fill()
    ctx.restore()

    // Scale bar (bottom-left, fixed)
    ctx.save()
    ctx.strokeStyle = '#8a807888'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(16, H - 20); ctx.lineTo(66, H - 20); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(16, H - 20); ctx.lineTo(16, H - 14); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(66, H - 20); ctx.lineTo(66, H - 14); ctx.stroke()
    ctx.font = '9px Inter, sans-serif'
    ctx.fillStyle = '#8a8078bb'
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
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden', background: GM.land, border: '1px solid rgba(0,0,0,0.12)' }}>
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
      <div style={{ position: 'absolute', top: 12, left: 12, fontSize: 11, fontWeight: 600, letterSpacing: '0.4px', color: '#5c544e', background: 'rgba(255,255,255,0.92)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(0,0,0,0.12)', boxShadow: '0 1px 4px rgba(0,0,0,0.14)', backdropFilter: 'blur(4px)' }}>
        📍 Calgary, AB — NW Zone
      </div>

      {/* Zoom controls — Google Maps style */}
      <div style={{ position: 'absolute', bottom: 48, right: 12, display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 4, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.22)', border: '1px solid rgba(0,0,0,0.12)' }}>
        {[{ label: '+', fn: zoomIn }, { label: '−', fn: zoomOut }, { label: '⊙', fn: resetView }].map(({ label, fn }, i) => (
          <button key={label} onClick={fn} style={{
            width: 34, height: 34, border: 'none',
            borderTop: i > 0 ? '1px solid rgba(0,0,0,0.10)' : 'none',
            background: '#ffffff', color: '#5c544e',
            fontSize: label === '⊙' ? 13 : 19,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, lineHeight: 1, transition: 'background 0.12s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f2ec'}
            onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
          >{label}</button>
        ))}
      </div>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 10, fontSize: 10, color: '#6b6460', background: 'rgba(255,255,255,0.92)', padding: '5px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.10)', boxShadow: '0 1px 4px rgba(0,0,0,0.10)', backdropFilter: 'blur(4px)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ea4335', display: 'inline-block' }} />Shop</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a73e8', display: 'inline-block' }} />Selected</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4285f4', display: 'inline-block' }} />You</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 3, background: '#a8d5f0', display: 'inline-block', borderRadius: 2 }} />Bow River</span>
      </div>
    </div>
  )
}
