import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import styles from './WhiteLine.module.css'

// the draw is measured in viewport heights, not the section's own height - the
// section is stretched several viewports tall by the GSAP pin spacers, so tying
// progress to rect.height made the line die mid-air before reaching the practices.
// finishing 1.8 viewports after the section's top passes the viewport bottom keeps
// the draw complete before the practices stage, regardless of total section height
const DRAW_COMPLETE_VIEWPORT_MULTIPLE = 1.8

const MAX_DEVICE_PIXEL_RATIO = 2
const TWO_PI = Math.PI * 2

// how much the button center or section box may drift, in px, before the rAF watcher
// below treats it as a real layout change and rebuilds the geometry
const GEOMETRY_DRIFT_THRESHOLD_PX = 2

// how densely the path is sampled to test pointer proximity against it
const SPROUT_SAMPLE_COUNT = 140
const SPROUT_PROXIMITY_PX = 26
const SPROUT_SPAWN_DIST_PX = 14
const SPROUT_MAX_ALIVE = 24
const SPROUT_LEN_MIN_PX = 18, SPROUT_LEN_MAX_PX = 55
const SPROUT_LIFE_MIN_MS = 900, SPROUT_LIFE_MAX_MS = 1800
const SPROUT_CTRL_BOW_MIN = 0.2, SPROUT_CTRL_BOW_MAX = 0.5 // perpendicular bow, as a fraction of the sprout's own length
const SPROUT_GROW_FRACTION = 0.18 // grows over the first 18% of life, then contracts over the rest
const SPROUT_LINE_WIDTH = 1.2

type Sprout = { x: number; y: number; angle: number; len: number; ctrlOffset: number; bornMs: number; lifeMs: number }

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

// same recipe as LineFigures' cursor-trail sprouts: random angle/length/bow so a birth never
// reads as a fixed pattern
function spawnSprout(sprouts: Sprout[], x: number, y: number, bornMs: number) {
  if (sprouts.length >= SPROUT_MAX_ALIVE) sprouts.shift()
  const len = randomBetween(SPROUT_LEN_MIN_PX, SPROUT_LEN_MAX_PX)
  const bowSign = Math.random() < 0.5 ? -1 : 1
  sprouts.push({
    x,
    y,
    angle: Math.random() * TWO_PI,
    len,
    ctrlOffset: bowSign * randomBetween(SPROUT_CTRL_BOW_MIN, SPROUT_CTRL_BOW_MAX) * len,
    bornMs,
    lifeMs: randomBetween(SPROUT_LIFE_MIN_MS, SPROUT_LIFE_MAX_MS),
  })
}

function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x)
}

function easeInOutQuad(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
}

// grows 0 -> 1 over the first SPROUT_GROW_FRACTION of life, then contracts 1 -> 0 over the rest
function sproutProgress(age: number): number {
  if (age < SPROUT_GROW_FRACTION) return easeOutQuad(age / SPROUT_GROW_FRACTION)
  return 1 - easeInOutQuad((age - SPROUT_GROW_FRACTION) / (1 - SPROUT_GROW_FRACTION))
}

// draws only the leading [0, u] sub-curve of each sprout's quadratic, so the tip grows out
// and then retracts back into the birth point instead of the stroke jumping. Mutates sprouts
// in place with a swap-remove; returns true while any sprout is still alive.
function drawSprouts(ctx: CanvasRenderingContext2D, sprouts: Sprout[]): boolean {
  const nowMs = performance.now()
  ctx.lineCap = 'round'
  let i = 0
  while (i < sprouts.length) {
    const sprout = sprouts[i]
    const age = (nowMs - sprout.bornMs) / sprout.lifeMs
    if (age >= 1) {
      sprouts[i] = sprouts[sprouts.length - 1]
      sprouts.pop()
      continue
    }
    const u = sproutProgress(age)
    i++
    if (u <= 0.001) continue

    const endX = sprout.x + Math.cos(sprout.angle) * sprout.len
    const endY = sprout.y + Math.sin(sprout.angle) * sprout.len
    const midX = (sprout.x + endX) / 2
    const midY = (sprout.y + endY) / 2
    const ctrlX = midX - Math.sin(sprout.angle) * sprout.ctrlOffset
    const ctrlY = midY + Math.cos(sprout.angle) * sprout.ctrlOffset

    const leadCtrlX = sprout.x + (ctrlX - sprout.x) * u
    const leadCtrlY = sprout.y + (ctrlY - sprout.y) * u
    const oneMinusU = 1 - u
    const tipX = oneMinusU * oneMinusU * sprout.x + 2 * oneMinusU * u * ctrlX + u * u * endX
    const tipY = oneMinusU * oneMinusU * sprout.y + 2 * oneMinusU * u * ctrlY + u * u * endY

    ctx.lineWidth = SPROUT_LINE_WIDTH
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * (1 - age * 0.6)})`
    ctx.beginPath()
    ctx.moveTo(sprout.x, sprout.y)
    ctx.quadraticCurveTo(leadCtrlX, leadCtrlY, tipX, tipY)
    ctx.stroke()
  }
  return sprouts.length > 0
}

// nearest sampled path point to (x, y), as a plain loop over the flat [x0,y0,x1,y1,...] array
function nearestPathDistance(points: number[], x: number, y: number): number {
  let minDistSq = Infinity
  for (let i = 0; i < points.length; i += 2) {
    const dx = x - points[i]
    const dy = y - points[i + 1]
    const distSq = dx * dx + dy * dy
    if (distSq < minDistSq) minDistSq = distSq
  }
  return Math.sqrt(minDistSq)
}

// path control points normalized to 0..1, scaled to the section's actual pixel box
// at runtime. Covers the handoff + intro weave, then one clean sweeping arc through
// the practices region, then a curve back toward center - the final approach to the
// CTA button is appended separately in buildPathD since it depends on layout, not
// on a fixed fraction of the section's height
const NORMALIZED_PATH_POINTS: [number, number][] = [
  [0.5, 0],
  [0.5, 0.045], [0.63, 0.065], [0.665, 0.13],
  [0.7, 0.195], [0.4, 0.215], [0.335, 0.27],
  [0.25, 0.375], [0.75, 0.42], [0.7, 0.55],
  [0.62, 0.6], [0.5, 0.635], [0.5, 0.68],
]

type Point = { x: number; y: number }
type ButtonGeometry = { point: Point; width: number; height: number; centerY: number }

// how far left the S's pivot reaches, as a fraction of section width
const FINAL_APPROACH_PIVOT_X_FRACTION = 0.3
// horizontal pull on control points, as a fraction of section width - keeps the S
// visibly curved at any viewport size instead of flattening into a near-vertical line
const FINAL_APPROACH_CONTROL_OFFSET_FRACTION = 0.16

// the pen flourish: a full elliptical ring around the button, entered and left at the same
// top point so the closing arc never needs an endpoint override - sized off the button's
// own live rect so it stays concentric with it at any layout
const LOOP_CLEARANCE_PX = 12 // gap between the ring and the button pill
const LOOP_SEGMENT_COUNT = 4 // four 90-degree cubic arcs approximate a full ellipse

// point on an ellipse, angle measured from the top (0) increasing clockwise - top -> right
// -> bottom -> left -> top, matching how the pen travels the ring
function ellipsePoint(center: Point, radiusX: number, radiusY: number, angle: number): Point {
  return { x: center.x + radiusX * Math.sin(angle), y: center.y - radiusY * Math.cos(angle) }
}

function ellipseTangent(radiusX: number, radiusY: number, angle: number): Point {
  return { x: radiusX * Math.cos(angle), y: radiusY * Math.sin(angle) }
}

// one cubic segment approximating the elliptical arc between two angles, via the standard
// tangent-scaled control-point construction (k = 4/3 * tan(deltaAngle / 4), which is the
// usual 0.5523 kappa constant when deltaAngle is exactly 90 degrees)
function ellipseArcSegment(center: Point, radiusX: number, radiusY: number, fromAngle: number, toAngle: number): string {
  const k = (4 / 3) * Math.tan((toAngle - fromAngle) / 4)
  const start = ellipsePoint(center, radiusX, radiusY, fromAngle)
  const end = ellipsePoint(center, radiusX, radiusY, toAngle)
  const startTangent = ellipseTangent(radiusX, radiusY, fromAngle)
  const endTangent = ellipseTangent(radiusX, radiusY, toAngle)
  const c1 = { x: start.x + k * startTangent.x, y: start.y + k * startTangent.y }
  const c2 = { x: end.x - k * endTangent.x, y: end.y - k * endTangent.y }
  return `C${c1.x.toFixed(2)},${c1.y.toFixed(2)} ${c2.x.toFixed(2)},${c2.y.toFixed(2)} ${end.x.toFixed(2)},${end.y.toFixed(2)}`
}

// 4 cubics tracing a full ellipse from the top point, clockwise through right/bottom/left,
// back to that same top point - no override needed, the last arc's own math already lands
// there, so the ring stays mathematically concentric at every viewport
function buildButtonLoop(center: Point, radiusX: number, radiusY: number): { entry: Point; d: string } {
  const step = TWO_PI / LOOP_SEGMENT_COUNT
  const entry = ellipsePoint(center, radiusX, radiusY, 0)

  const segments: string[] = []
  for (let i = 0; i < LOOP_SEGMENT_COUNT; i++) {
    segments.push(ellipseArcSegment(center, radiusX, radiusY, step * i, step * (i + 1)))
  }

  return { entry, d: segments.join(' ') }
}

// graceful S from the point where the line emerges below the practices to the ring's top
// point, then a full loop around the CTA button, landing back on that same top point:
// sweeps wide left to a pivot, arcs back right into the ring's top with a level approach,
// loops the button once, and finishes - crosses the closing title's left third on a
// diagonal instead of dropping straight through its center
function buildFinalApproach(from: Point, button: ButtonGeometry, width: number): string {
  const to = button.point
  const dy = to.y - from.y
  const offsetX = width * FINAL_APPROACH_CONTROL_OFFSET_FRACTION
  const pivot: Point = { x: width * FINAL_APPROACH_PIVOT_X_FRACTION, y: from.y + dy * 0.5 }

  const sweepLeftC1 = { x: from.x - offsetX, y: from.y + dy * 0.18 }
  const sweepLeftC2 = { x: pivot.x + offsetX, y: pivot.y - dy * 0.18 }
  const sweepLeft = `C${sweepLeftC1.x.toFixed(2)},${sweepLeftC1.y.toFixed(2)} ${sweepLeftC2.x.toFixed(2)},${sweepLeftC2.y.toFixed(2)} ${pivot.x.toFixed(2)},${pivot.y.toFixed(2)}`

  const loopCenter: Point = { x: to.x, y: button.centerY }
  const radiusX = button.width / 2 + LOOP_CLEARANCE_PX
  const radiusY = button.height / 2 + LOOP_CLEARANCE_PX
  const loop = buildButtonLoop(loopCenter, radiusX, radiusY)

  // control point sits level with the landing point (same y) so the incoming tangent is
  // horizontal - matches the ring's own tangent at its top point, so the pen flows straight
  // into the loop with no kink, instead of arriving on a bent, near-vertical approach
  const arcBackC1 = { x: pivot.x + offsetX, y: pivot.y + dy * 0.2 }
  const arcBackC2 = { x: loop.entry.x - offsetX, y: loop.entry.y }
  const arcBack = `C${arcBackC1.x.toFixed(2)},${arcBackC1.y.toFixed(2)} ${arcBackC2.x.toFixed(2)},${arcBackC2.y.toFixed(2)} ${loop.entry.x.toFixed(2)},${loop.entry.y.toFixed(2)}`

  return `${sweepLeft} ${arcBack} ${loop.d}`
}

function buildPathD(width: number, height: number, button: ButtonGeometry): string {
  const points = NORMALIZED_PATH_POINTS.map(([x, y]) => ({ x: x * width, y: y * height }))
  const [start, ...controlPoints] = points
  const curves: string[] = []
  for (let i = 0; i < controlPoints.length; i += 3) {
    const [c1, c2, end] = [controlPoints[i], controlPoints[i + 1], controlPoints[i + 2]]
    curves.push(`C${c1.x.toFixed(2)},${c1.y.toFixed(2)} ${c2.x.toFixed(2)},${c2.y.toFixed(2)} ${end.x.toFixed(2)},${end.y.toFixed(2)}`)
  }
  curves.push(buildFinalApproach(points[points.length - 1], button, width))
  return `M${start.x.toFixed(2)},${start.y.toFixed(2)} ${curves.join(' ')}`
}

export default function WhiteLine({
  sectionRef,
  ctaRef,
}: {
  sectionRef: RefObject<HTMLElement | null>
  ctaRef: RefObject<HTMLAnchorElement | null>
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // sprouts only ever spawn on fine pointers, so touch devices skip the section-sized canvas entirely
  const [pointerFine] = useState(() => window.matchMedia('(pointer: fine)').matches)

  useEffect(() => {
    const svg = svgRef.current
    const path = pathRef.current
    const section = sectionRef.current
    const canvas = canvasRef.current
    const cta = ctaRef.current
    if (!svg || !path || !section || !cta) return

    const ctx = canvas ? canvas.getContext('2d') : null
    let sampledPoints: number[] = []
    let canvasWidth = 0
    let canvasHeight = 0
    let lastButtonCenter: Point | null = null
    let lastViewBoxSize: { width: number; height: number } | null = null

    function resizeCanvas() {
      if (!canvas || !ctx || !section) return
      const { width, height } = section.getBoundingClientRect()
      canvasWidth = width
      canvasHeight = height
      const dpr = Math.min(MAX_DEVICE_PIXEL_RATIO, Math.max(1, window.devicePixelRatio || 1))
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // resamples the path into section-local px points, used to test pointer proximity
    function sampleGeometry() {
      if (!path) return
      const totalLength = path.getTotalLength()
      const points: number[] = []
      for (let i = 0; i < SPROUT_SAMPLE_COUNT; i++) {
        const point = path.getPointAtLength((i / (SPROUT_SAMPLE_COUNT - 1)) * totalLength)
        points.push(point.x, point.y)
      }
      sampledPoints = points
    }

    function updateGeometry() {
      if (!svg || !path || !section || !cta) return
      const sectionRect = section.getBoundingClientRect()
      const { width, height } = sectionRect
      const buttonRect = cta.getBoundingClientRect()
      const buttonTop = buttonRect.top - sectionRect.top
      const buttonGeometry: ButtonGeometry = {
        // top of the ring, clearance above the button's own top edge - the ring's own math
        // lands the closing arc exactly here, so this point and the ring stay concentric
        point: { x: buttonRect.left - sectionRect.left + buttonRect.width / 2, y: buttonTop - LOOP_CLEARANCE_PX },
        width: buttonRect.width,
        height: buttonRect.height,
        centerY: buttonTop + buttonRect.height / 2,
      }
      // stored so the rAF geometry watcher below can detect drift from a post-build pin-spacer
      // re-layout or entrance transition and self-heal
      lastButtonCenter = { x: buttonGeometry.point.x, y: buttonGeometry.centerY }
      lastViewBoxSize = { width, height }
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      path.setAttribute('d', buildPathD(width, height, buttonGeometry))
      sampleGeometry()
      resizeCanvas()
    }

    updateGeometry()

    // reduced motion: line is already fully drawn via CSS, and sprouts (an animation) are
    // skipped entirely below - no scroll listener or pointer tracking needed
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const resizeObserver = new ResizeObserver(() => updateGeometry())
      resizeObserver.observe(section)
      return () => resizeObserver.disconnect()
    }

    function updateProgress() {
      if (!path || !section) return
      const rect = section.getBoundingClientRect()
      const progress = clamp01((window.innerHeight - rect.top) / (window.innerHeight * DRAW_COMPLETE_VIEWPORT_MULTIPLE))
      path.style.strokeDashoffset = String(1 - progress)
    }

    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        updateProgress()
      })
    }

    updateProgress()
    window.addEventListener('scroll', onScroll, { passive: true })

    const resizeObserver = new ResizeObserver(() => {
      updateGeometry()
      updateProgress()
    })
    resizeObserver.observe(section)

    // the closing block's entrance transition (translateY 24px -> 0) can still be mid-flight
    // when updateGeometry first runs, so the ring gets built against the button's pre-settled
    // position. A scroll-driven self-heal misses this whenever the user stops scrolling before
    // or during the reveal. Instead, watch the button's own visibility: while it is on screen,
    // poll its live center every frame and rebuild the instant it (or the section box) drifts -
    // this covers the entrance transition, font swaps, and pin re-layouts alike, within one
    // frame of the button settling, with no dependency on scroll events at all
    let geometryWatchRafId = 0

    function watchGeometryFrame() {
      if (!section || !cta) return
      const sectionRect = section.getBoundingClientRect()
      const buttonRect = cta.getBoundingClientRect()
      const liveCenterX = buttonRect.left - sectionRect.left + buttonRect.width / 2
      const liveCenterY = buttonRect.top - sectionRect.top + buttonRect.height / 2

      const buttonDrifted =
        !lastButtonCenter ||
        Math.abs(liveCenterX - lastButtonCenter.x) > GEOMETRY_DRIFT_THRESHOLD_PX ||
        Math.abs(liveCenterY - lastButtonCenter.y) > GEOMETRY_DRIFT_THRESHOLD_PX
      const sectionResized =
        !lastViewBoxSize ||
        Math.abs(sectionRect.width - lastViewBoxSize.width) > GEOMETRY_DRIFT_THRESHOLD_PX ||
        Math.abs(sectionRect.height - lastViewBoxSize.height) > GEOMETRY_DRIFT_THRESHOLD_PX

      if (buttonDrifted || sectionResized) updateGeometry()

      geometryWatchRafId = requestAnimationFrame(watchGeometryFrame)
    }

    const ctaVisibilityObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!geometryWatchRafId) geometryWatchRafId = requestAnimationFrame(watchGeometryFrame)
        } else if (geometryWatchRafId) {
          cancelAnimationFrame(geometryWatchRafId)
          geometryWatchRafId = 0
        }
      },
      { threshold: 0 }
    )
    ctaVisibilityObserver.observe(cta)

    // hover sprouts: only born when the cursor is close to the drawn path itself, not
    // anywhere in the section - desktop-only (fine pointer), rAF runs only while alive
    const sprouts: Sprout[] = []
    let rafId = 0
    let spawnAccumPx = 0
    let lastSpawnPoint: { x: number; y: number } | null = null

    function tick() {
      if (!ctx) return
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      const stillAlive = drawSprouts(ctx, sprouts)
      rafId = stillAlive ? requestAnimationFrame(tick) : 0
    }

    function handlePointerMove(event: PointerEvent) {
      if (!section) return
      const rect = section.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      if (lastSpawnPoint) spawnAccumPx += Math.hypot(x - lastSpawnPoint.x, y - lastSpawnPoint.y)
      lastSpawnPoint = { x, y }
      if (spawnAccumPx < SPROUT_SPAWN_DIST_PX) return
      spawnAccumPx = 0

      if (nearestPathDistance(sampledPoints, x, y) > SPROUT_PROXIMITY_PX) return

      const nowMs = performance.now()
      spawnSprout(sprouts, x, y, nowMs)
      if (Math.random() < 0.5) spawnSprout(sprouts, x, y, nowMs)
      if (!rafId) rafId = requestAnimationFrame(tick)
    }

    const sproutsEnabled = pointerFine && ctx !== null
    if (sproutsEnabled) window.addEventListener('pointermove', handlePointerMove, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      resizeObserver.disconnect()
      ctaVisibilityObserver.disconnect()
      if (geometryWatchRafId) cancelAnimationFrame(geometryWatchRafId)
      if (sproutsEnabled) window.removeEventListener('pointermove', handlePointerMove)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [sectionRef, ctaRef, pointerFine])

  return (
    <>
      <svg ref={svgRef} className={styles.line} viewBox="0 0 1000 1400" aria-hidden="true">
        <path
          ref={pathRef}
          pathLength={1}
          d="M500,0 C500,110 660,150 690,300 C720,450 370,500 330,650 C290,800 710,830 670,980 C630,1130 330,1160 390,1290 C420,1355 470,1385 500,1400"
        />
      </svg>
      {/* difference blend + white strokes, same adaptive trick as .line, so sprouts read dark over the paper and bright over the videos */}
      {pointerFine && <canvas ref={canvasRef} className={styles.sprouts} aria-hidden="true" />}
    </>
  )
}
