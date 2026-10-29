import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import styles from './WhiteLine.module.css'

// the draw is measured in viewport heights, not the section's own height - the
// section is stretched several viewports tall by the GSAP pin spacers, so tying
// progress to rect.height made the line die mid-air before reaching the practices.
// finishing 1.8 viewports after the section's top passes the viewport bottom keeps
// the draw complete before the practices stage, regardless of total section height
const DRAW_COMPLETE_VIEWPORT_MULTIPLE = 1.8

const TWO_PI = Math.PI * 2

// how much the button center or section box may drift, in px, before the rAF watcher
// below treats it as a real layout change and rebuilds the geometry
const GEOMETRY_DRIFT_THRESHOLD_PX = 2

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
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

  useEffect(() => {
    const svg = svgRef.current
    const path = pathRef.current
    const section = sectionRef.current
    const cta = ctaRef.current
    if (!svg || !path || !section || !cta) return

    let lastButtonCenter: Point | null = null
    let lastViewBoxSize: { width: number; height: number } | null = null

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
    }

    updateGeometry()

    // reduced motion: the line is already fully drawn via CSS
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

    return () => {
      window.removeEventListener('scroll', onScroll)
      resizeObserver.disconnect()
      ctaVisibilityObserver.disconnect()
      if (geometryWatchRafId) cancelAnimationFrame(geometryWatchRafId)
    }
  }, [sectionRef, ctaRef])

  return (
    <svg ref={svgRef} className={styles.line} viewBox="0 0 1000 1400" aria-hidden="true">
      <path
        ref={pathRef}
        pathLength={1}
        d="M500,0 C500,110 660,150 690,300 C720,450 370,500 330,650 C290,800 710,830 670,980 C630,1130 330,1160 390,1290 C420,1355 470,1385 500,1400"
      />
    </svg>
  )
}
