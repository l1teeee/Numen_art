import { useEffect, useRef } from 'react'
import styles from './LineFigures.module.css'

const TWO_PI = Math.PI * 2
const MOBILE_BREAKPOINT_PX = 810, MAX_DEVICE_PIXEL_RATIO = 2
const REDUCED_MOTION_T = 25 // a representative "centred hold" instant for the static frame

function smootherstep(x: number): number {
  const c = Math.max(0, Math.min(1, x))
  return c * c * c * (c * (c * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// scalar field: |cos*cos| cushions, peak 1 at every integer (i,j). Coordinates are warped
// a little before the field is evaluated so the lattice breathes organically instead of
// looking like a rigid grid.
function fieldAt(u: number, v: number, t: number): number {
  const wu = u + 0.03 * Math.sin(0.45 * v + t * 0.07)
  const wv = v + 0.03 * Math.cos(0.35 * u - t * 0.06)
  return Math.abs(Math.cos(Math.PI * wu) * Math.cos(Math.PI * wv))
}

// every contour is star-shaped around its cell centre: march outward with a coarse
// step, then bisect for where the field crosses the level. Cell centres stay fixed on
// the square lattice always, so neighbouring cells can never overlap or tangle.
const COARSE_STEP = 0.04, MAX_RADIUS_MULT = 0.75, BISECTION_ITERS = 10
const ESTIMATED_COARSE_STEPS = Math.ceil(MAX_RADIUS_MULT / COARSE_STEP)

function traceContour(cu: number, cv: number, level: number, angleCount: number, t: number): Float64Array {
  const radii = new Float64Array(angleCount)

  for (let k = 0; k < angleCount; k++) {
    const angle = (k / angleCount) * TWO_PI
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    let rLo = 0
    let rHi = MAX_RADIUS_MULT
    let crossed = false
    for (let r = COARSE_STEP; r <= MAX_RADIUS_MULT; r += COARSE_STEP) {
      if (fieldAt(cu + dx * r, cv + dy * r, t) < level) {
        rHi = r
        crossed = true
        break
      }
      rLo = r
    }
    if (crossed) {
      for (let iter = 0; iter < BISECTION_ITERS; iter++) {
        const mid = (rLo + rHi) / 2
        if (fieldAt(cu + dx * mid, cv + dy * mid, t) >= level) rLo = mid
        else rHi = mid
      }
    }
    radii[k] = crossed ? (rLo + rHi) / 2 : MAX_RADIUS_MULT
  }

  return radii
}

// mode blend (40s loop): mosaic hold -> transition to the centred composition -> hold -> back
const MODE_CYCLE_S = 40
const MODE_MOSAIC_HOLD_S = 10, MODE_TRANSITION_S = 7, MODE_CENTERED_HOLD_S = 16

function modeBlend(t: number): number {
  const p = ((t % MODE_CYCLE_S) + MODE_CYCLE_S) % MODE_CYCLE_S
  if (p < MODE_MOSAIC_HOLD_S) return 0
  if (p < MODE_MOSAIC_HOLD_S + MODE_TRANSITION_S) return smootherstep((p - MODE_MOSAIC_HOLD_S) / MODE_TRANSITION_S)
  if (p < MODE_MOSAIC_HOLD_S + MODE_TRANSITION_S + MODE_CENTERED_HOLD_S) return 1
  const outPos = (p - MODE_MOSAIC_HOLD_S - MODE_TRANSITION_S - MODE_CENTERED_HOLD_S) / MODE_TRANSITION_S
  return 1 - smootherstep(outPos)
}

// breathing: a global scale around the hero centre, applied to everything. Amplitude is
// larger once centred (the rings breathe more than the mosaic does). Each ring gets a
// slightly delayed phase of the SAME breath, so the pulse visibly ripples outward.
const BREATH_PERIOD_S = 10
const BREATH_AMPLITUDE_MOSAIC = 0.08, BREATH_AMPLITUDE_CENTERED = 0.16
const RING_PHASE_STEP_S = 0.35

function breathAt(t: number, phaseOffsetS: number, amplitude: number): number {
  return 1 + amplitude * Math.sin((TWO_PI * (t - phaseOffsetS)) / BREATH_PERIOD_S)
}

// the 5 concentric rings of the centred composition: radii as fractions of min(w,h), a
// squircle shape (superellipse) whose roundness slowly wobbles, and alpha for the two
// outer rings that only exist once the composition has centred
const RING_RADII_FRAC = [0.3, 0.52, 0.76, 1.02, 1.32]
const RING_ALPHA_EXTRA = [0.12, 0.09] // rings 4 and 5
const RING_STRETCH_DESKTOP = 1.3, RING_STRETCH_MOBILE = 1
const RING_N_MIN = 2.2, RING_N_MAX = 4, RING_N_PERIOD_S = 14
const RING_OUTER_START_SCALE = 0.8

function ringSuperellipseN(t: number): number {
  const wobble = (1 - Math.cos((TWO_PI * t) / RING_N_PERIOD_S)) / 2
  return lerp(RING_N_MIN, RING_N_MAX, wobble)
}

// axis-aligned superellipse ("squircle"): a circle at n=2, rounder or squarer as n moves
function superellipseRadius(n: number, theta: number): number {
  return 1 / Math.pow(Math.pow(Math.abs(Math.cos(theta)), n) + Math.pow(Math.abs(Math.sin(theta)), n), 1 / n)
}

function meanOf(values: Float64Array): number {
  let sum = 0
  for (let k = 0; k < values.length; k++) sum += values[k]
  return sum / values.length
}

// ring k's radius in centre-composition-local units (mean = RING_RADII_FRAC[k]),
// including its own outward-rippling breath phase
function ringRadii(ringIndex: number, angleCount: number, t: number, breathAmplitude: number): Float64Array {
  const n = ringSuperellipseN(t)
  const shapeVals = new Float64Array(angleCount)
  for (let k = 0; k < angleCount; k++) shapeVals[k] = superellipseRadius(n, (k / angleCount) * TWO_PI)
  const shapeMean = meanOf(shapeVals)
  const ripple = breathAt(t, ringIndex * RING_PHASE_STEP_S, breathAmplitude) / breathAt(t, 0, breathAmplitude)

  const radii = new Float64Array(angleCount)
  for (let k = 0; k < angleCount; k++) radii[k] = (RING_RADII_FRAC[ringIndex] * shapeVals[k] * ripple) / shapeMean
  return radii
}

// keeps nested levels strictly ordered (inner < outer) at every angle so a blended shape
// can never cross into the level nested inside it
function enforceMinGap(r: Float64Array, innerR: Float64Array, minGap: number) {
  for (let k = 0; k < r.length; k++) {
    const floor = innerR[k] + minGap
    if (r[k] < floor) r[k] = floor
  }
}

type Layout = { cx: number; cy: number; S: number; stretch: number }

function layoutFor(width: number, height: number, breath: number): Layout {
  const isNarrow = width < MOBILE_BREAKPOINT_PX
  const baseDim = isNarrow ? width : Math.min(width, height)
  const S = baseDim * (isNarrow ? 0.9 : 0.55) * breath
  return { cx: width / 2, cy: height / 2, S, stretch: isNarrow ? 1 : 1.15 }
}

function project(u: number, v: number, layout: Layout): [number, number] {
  return [layout.cx + u * layout.S * layout.stretch, layout.cy + v * layout.S]
}

// moves a point along the line from the hero centre, e.g. factor 1.7 pushes it 70% further out
function scaleAboutPoint(px: number, py: number, cx: number, cy: number, factor: number): [number, number] {
  return [cx + (px - cx) * factor, cy + (py - cy) * factor]
}

// maps a cell's radii into closed pixel-space points, ready to stroke
function drawContour(radii: Float64Array, cu: number, cv: number, layout: Layout): [number, number][] {
  const pts: [number, number][] = []
  for (let k = 0; k < radii.length; k++) {
    const angle = (k / radii.length) * TWO_PI
    pts.push(project(cu + radii[k] * Math.cos(angle), cv + radii[k] * Math.sin(angle), layout))
  }
  return pts
}

function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

// each point becomes a quadratic control point and the curve passes through the
// midpoints, so the hairline is solid and continuous instead of faceted or dashed
function addSmoothLoop(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  const n = pts.length
  const start = midpoint(pts[n - 1], pts[0])
  ctx.moveTo(start[0], start[1])
  for (let k = 0; k < n; k++) {
    const mid = midpoint(pts[k], pts[(k + 1) % n])
    ctx.quadraticCurveTo(pts[k][0], pts[k][1], mid[0], mid[1])
  }
}

// cursor trail: an offscreen mask accumulates soft dots along the pointer's recent
// path and fades continuously; only the portion of each contour under that fading
// mask gets redrawn bright, so the glow follows wherever the cursor has just been
// instead of latching onto a whole line.
const TRAIL_DOT_RADIUS = 70, TRAIL_DOT_SPACING = 12
const TRAIL_FADE_RATE = 0.92, TRAIL_FADE_MAX_DT_S = 0.5, TRAIL_IDLE_SKIP_MS = 1200
const TRAIL_STROKE_ALPHA = 0.95, TRAIL_LINE_WIDTH = 1.4, TRAIL_SHADOW_BLUR = 6

interface TrailState {
  maskCanvas: HTMLCanvasElement
  maskCtx: CanvasRenderingContext2D
  highlightCanvas: HTMLCanvasElement
  highlightCtx: CanvasRenderingContext2D
  prevPointer: { x: number; y: number } | null
  lastFrameMs: number | null
  lastDotMs: number
}

// soft radial dot: full white at the centre fading out to nothing at TRAIL_DOT_RADIUS
function paintTrailDot(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, TRAIL_DOT_RADIUS)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(x - TRAIL_DOT_RADIUS, y - TRAIL_DOT_RADIUS, TRAIL_DOT_RADIUS * 2, TRAIL_DOT_RADIUS * 2)
}

// stamps dots every TRAIL_DOT_SPACING px along the segment so a fast move leaves a continuous trail
function paintTrailSegment(ctx: CanvasRenderingContext2D, from: { x: number; y: number } | null, to: { x: number; y: number }) {
  if (!from) {
    paintTrailDot(ctx, to.x, to.y)
    return
  }
  const dx = to.x - from.x
  const dy = to.y - from.y
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / TRAIL_DOT_SPACING))
  for (let s = 1; s <= steps; s++) {
    paintTrailDot(ctx, from.x + (dx * s) / steps, from.y + (dy * s) / steps)
  }
}

// fades the mask by REAL elapsed time (performance.now(), not the animation's own dt,
// which is frozen under prefers-reduced-motion and only advances once per discrete
// pointer event there) - that decoupling is what keeps the fade timing correct no
// matter how often drawFrame actually gets called
function updateTrailMask(trail: TrailState, pointer: { x: number; y: number } | null, width: number, height: number) {
  const nowMs = performance.now()
  const realDt = trail.lastFrameMs === null ? 0 : Math.min(TRAIL_FADE_MAX_DT_S, (nowMs - trail.lastFrameMs) / 1000)
  trail.lastFrameMs = nowMs

  const { maskCtx } = trail
  maskCtx.globalCompositeOperation = 'destination-out'
  maskCtx.fillStyle = `rgba(0, 0, 0, ${1 - Math.pow(TRAIL_FADE_RATE, realDt * 60)})`
  maskCtx.fillRect(0, 0, width, height)
  maskCtx.globalCompositeOperation = 'source-over'

  const moved = pointer && (!trail.prevPointer || trail.prevPointer.x !== pointer.x || trail.prevPointer.y !== pointer.y)
  if (moved) {
    paintTrailSegment(maskCtx, trail.prevPointer, pointer)
    trail.lastDotMs = nowMs
  }
  trail.prevPointer = pointer
}

// only the parts of the contours the fading trail mask still covers stay visible
function buildHighlightCanvas(trail: TrailState, allPts: [number, number][][], width: number, height: number) {
  const { highlightCtx, maskCanvas } = trail
  highlightCtx.clearRect(0, 0, width, height)
  highlightCtx.globalCompositeOperation = 'source-over'
  highlightCtx.strokeStyle = `rgba(255, 255, 255, ${TRAIL_STROKE_ALPHA})`
  highlightCtx.lineWidth = TRAIL_LINE_WIDTH
  highlightCtx.lineCap = 'round'
  highlightCtx.lineJoin = 'round'
  highlightCtx.shadowBlur = TRAIL_SHADOW_BLUR
  highlightCtx.shadowColor = 'rgba(255, 255, 255, 1)'
  highlightCtx.beginPath()
  for (const pts of allPts) addSmoothLoop(highlightCtx, pts)
  highlightCtx.stroke()
  highlightCtx.shadowBlur = 0

  highlightCtx.globalCompositeOperation = 'destination-in'
  highlightCtx.drawImage(maskCanvas, 0, 0, width, height)
  highlightCtx.globalCompositeOperation = 'source-over'
}

function createTrailState(): TrailState | null {
  const maskCanvas = document.createElement('canvas')
  const highlightCanvas = document.createElement('canvas')
  const maskCtx = maskCanvas.getContext('2d')
  const highlightCtx = highlightCanvas.getContext('2d')
  if (!maskCtx || !highlightCtx) return null
  return { maskCanvas, maskCtx, highlightCanvas, highlightCtx, prevPointer: null, lastFrameMs: null, lastDotMs: -Infinity }
}

const CONTOUR_LEVELS = [0.62, 0.32, 0.1]
const CONTOUR_ALPHAS = [0.3, 0.22, 0.15]
const VISIBILITY_MARGIN_CELLS = 1.5, EVAL_BUDGET = 600_000, MIN_ANGLE_COUNT = 24
const MIN_LEVEL_GAP_PX = 2

// which mosaic cells (everything except the centre) are on screen right now
function visibleNeighbourCells(layout: Layout, width: number, height: number): { i: number; j: number }[] {
  const marginPx = VISIBILITY_MARGIN_CELLS * layout.S
  const iMax = Math.ceil((width / 2 + marginPx) / (layout.S * layout.stretch))
  const jMax = Math.ceil((height / 2 + marginPx) / layout.S)

  const cells: { i: number; j: number }[] = []
  for (let i = -iMax; i <= iMax; i++) {
    for (let j = -jMax; j <= jMax; j++) {
      if (i === 0 && j === 0) continue
      const [px, py] = project(i, j, layout)
      if (px < -marginPx || px > width + marginPx || py < -marginPx || py > height + marginPx) continue
      cells.push({ i, j })
    }
  }
  return cells
}

// mosaic cells fade out and push radially outward from the hero centre as the
// composition dissolves into the centred rings
function drawNeighbourCells(
  ctx: CanvasRenderingContext2D,
  cells: { i: number; j: number }[],
  angleCount: number,
  t: number,
  c: number,
  layout: Layout,
): [number, number][][] {
  const alphaMul = 1 - c
  const pushFactor = 1 + 0.7 * c
  const allPts: [number, number][][] = []

  for (let levelIndex = 0; levelIndex < CONTOUR_LEVELS.length; levelIndex++) {
    const levelPts = cells.map((cell) => {
      const radii = traceContour(cell.i, cell.j, CONTOUR_LEVELS[levelIndex], angleCount, t)
      return drawContour(radii, cell.i, cell.j, layout).map(([px, py]) => scaleAboutPoint(px, py, layout.cx, layout.cy, pushFactor))
    })
    ctx.strokeStyle = `rgba(255, 255, 255, ${CONTOUR_ALPHAS[levelIndex] * alphaMul})`
    ctx.beginPath()
    for (const pts of levelPts) addSmoothLoop(ctx, pts)
    ctx.stroke()
    allPts.push(...levelPts)
  }
  return allPts
}

// the central cell's 3 cushion levels blend into rings 1-3 (always fully opaque, since
// the centre never fades - only its shape changes), plus rings 4-5 which only exist once
// the composition has centred, expanding out of the middle as it blends in
function drawCentralComposition(
  ctx: CanvasRenderingContext2D,
  angleCount: number,
  t: number,
  c: number,
  breathAmplitude: number,
  layout: Layout,
  centerLayout: Layout,
): [number, number][][] {
  const allPts: [number, number][][] = []
  const minGap = MIN_LEVEL_GAP_PX / centerLayout.S
  const scaleToCenter = layout.S / centerLayout.S
  let innerR: Float64Array | null = null

  for (let levelIndex = 0; levelIndex < CONTOUR_LEVELS.length; levelIndex++) {
    const rCell = traceContour(0, 0, CONTOUR_LEVELS[levelIndex], angleCount, t)
    const rRing = ringRadii(levelIndex, angleCount, t, breathAmplitude)

    const blended = new Float64Array(angleCount)
    for (let k = 0; k < angleCount; k++) {
      const rCellCenterUnits = rCell[k] * scaleToCenter
      blended[k] = rCellCenterUnits + (rRing[k] - rCellCenterUnits) * c
    }
    if (innerR) enforceMinGap(blended, innerR, minGap)
    innerR = blended

    const pts = drawContour(blended, 0, 0, centerLayout)
    ctx.strokeStyle = `rgba(255, 255, 255, ${CONTOUR_ALPHAS[levelIndex]})`
    ctx.beginPath()
    addSmoothLoop(ctx, pts)
    ctx.stroke()
    allPts.push(pts)
  }

  const outerAlpha = smootherstep(c)
  if (outerAlpha >= 0.01) {
    const radiusScale = lerp(RING_OUTER_START_SCALE, 1, c)
    for (let ringIndex = 3; ringIndex <= 4; ringIndex++) {
      const rRing = ringRadii(ringIndex, angleCount, t, breathAmplitude)
      const scaled = new Float64Array(angleCount)
      for (let k = 0; k < angleCount; k++) scaled[k] = rRing[k] * radiusScale
      if (innerR) enforceMinGap(scaled, innerR, minGap)
      innerR = scaled

      const pts = drawContour(scaled, 0, 0, centerLayout)
      ctx.strokeStyle = `rgba(255, 255, 255, ${RING_ALPHA_EXTRA[ringIndex - 3] * outerAlpha})`
      ctx.beginPath()
      addSmoothLoop(ctx, pts)
      ctx.stroke()
      allPts.push(pts)
    }
  }

  return allPts
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  pointer: { x: number; y: number } | null,
  trail: TrailState | null,
  baseAngleCount: number,
) {
  ctx.clearRect(0, 0, width, height)
  if (width <= 0 || height <= 0) return

  const c = modeBlend(t)
  const breathAmplitude = lerp(BREATH_AMPLITUDE_MOSAIC, BREATH_AMPLITUDE_CENTERED, c)
  const breath = breathAt(t, 0, breathAmplitude)

  const layout = layoutFor(width, height, breath)
  const isNarrow = width < MOBILE_BREAKPOINT_PX
  const centerLayout: Layout = {
    cx: width / 2,
    cy: height / 2,
    S: Math.min(width, height) * breath,
    stretch: lerp(isNarrow ? 1 : 1.15, isNarrow ? RING_STRETCH_MOBILE : RING_STRETCH_DESKTOP, c),
  }

  const neighbourAlpha = 1 - c
  const neighbourCells = neighbourAlpha >= 0.01 ? visibleNeighbourCells(layout, width, height) : []

  // keep frame cost bounded: estimate cells * levels * angles * (steps + bisection), plus
  // the always-present centre, and lower angles if the estimate is too high
  const estimate = (neighbourCells.length + 1) * CONTOUR_LEVELS.length * baseAngleCount * (ESTIMATED_COARSE_STEPS + BISECTION_ITERS)
  const angleCount =
    estimate > EVAL_BUDGET ? Math.max(MIN_ANGLE_COUNT, Math.floor((baseAngleCount * EVAL_BUDGET) / estimate)) : baseAngleCount

  ctx.lineWidth = 1
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const allPts: [number, number][][] = []
  if (neighbourCells.length > 0) {
    allPts.push(...drawNeighbourCells(ctx, neighbourCells, angleCount, t, c, layout))
  }
  allPts.push(...drawCentralComposition(ctx, angleCount, t, c, breathAmplitude, layout, centerLayout))

  if (!trail) return
  updateTrailMask(trail, pointer, width, height)
  if (performance.now() - trail.lastDotMs > TRAIL_IDLE_SKIP_MS) return

  buildHighlightCanvas(trail, allPts, width, height)
  ctx.drawImage(trail.highlightCanvas, 0, 0, width, height)
}

export default function LineFigures() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointerFine = window.matchMedia('(pointer: fine)').matches
    const heroEl = canvas.parentElement

    let width = 0
    let height = 0
    let elapsed = reduceMotion ? REDUCED_MOTION_T : 0
    const pointerState: { current: { x: number; y: number } | null } = { current: null }
    const trail = pointerFine ? createTrailState() : null

    function renderCurrentFrame() {
      const baseAngleCount = width < MOBILE_BREAKPOINT_PX ? 96 : 160
      drawFrame(ctx!, width, height, elapsed, pointerState.current, trail, baseAngleCount)
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const dpr = Math.min(MAX_DEVICE_PIXEL_RATIO, Math.max(1, window.devicePixelRatio || 1))

      canvas!.width = Math.round(width * dpr)
      canvas!.height = Math.round(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (trail) {
        for (const c of [trail.maskCanvas, trail.highlightCanvas]) {
          c.width = Math.round(width * dpr)
          c.height = Math.round(height * dpr)
        }
        trail.maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
        trail.highlightCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }

      renderCurrentFrame()
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    function handlePointerMove(event: PointerEvent) {
      if (!heroEl) return
      const rect = heroEl.getBoundingClientRect()
      pointerState.current = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      if (reduceMotion) renderCurrentFrame()
    }

    function handlePointerLeave() {
      pointerState.current = null
      if (reduceMotion) renderCurrentFrame()
    }

    if (pointerFine && heroEl) {
      heroEl.addEventListener('pointermove', handlePointerMove)
      heroEl.addEventListener('pointerleave', handlePointerLeave)
    }

    let animationFrameId = 0
    if (!reduceMotion) {
      let lastFrameMs = performance.now()
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - lastFrameMs) / 1000)
        lastFrameMs = now
        elapsed += dt
        renderCurrentFrame()
        animationFrameId = requestAnimationFrame(tick)
      }
      animationFrameId = requestAnimationFrame(tick)
    }

    return () => {
      resizeObserver.disconnect()
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (pointerFine && heroEl) {
        heroEl.removeEventListener('pointermove', handlePointerMove)
        heroEl.removeEventListener('pointerleave', handlePointerLeave)
      }
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}
