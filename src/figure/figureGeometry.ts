export const TWO_PI = Math.PI * 2
export const MOBILE_BREAKPOINT_PX = 810

function smootherstep(x: number): number {
  const c = Math.max(0, Math.min(1, x))
  return c * c * c * (c * (c * 6 - 15) + 10)
}

export function lerp(a: number, b: number, t: number): number {
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
const RING_ROTATION_SPEED = 0.03 // alternating rings counter-rotate at this rad/s

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
  const rotation = RING_ROTATION_SPEED * t * (ringIndex % 2 === 0 ? 1 : -1)
  const shapeVals = new Float64Array(angleCount)
  for (let k = 0; k < angleCount; k++) shapeVals[k] = superellipseRadius(n, (k / angleCount) * TWO_PI + rotation)
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

// pure geometry for the mosaic neighbour cells: one entry per contour level, alpha already
// includes the mode-blend fade (opening's extra fade is applied later, at render time)
function traceNeighbourLevels(
  cells: { i: number; j: number }[],
  angleCount: number,
  t: number,
  c: number,
  layout: Layout,
): { alpha: number; loops: [number, number][][] }[] {
  const alphaMul = 1 - c
  const pushFactor = 1 + 0.7 * c

  return CONTOUR_LEVELS.map((level, levelIndex) => {
    const loops = cells.map((cell) => {
      const radii = traceContour(cell.i, cell.j, level, angleCount, t)
      return drawContour(radii, cell.i, cell.j, layout).map(([px, py]) => scaleAboutPoint(px, py, layout.cx, layout.cy, pushFactor))
    })
    return { alpha: CONTOUR_ALPHAS[levelIndex] * alphaMul, loops }
  })
}

// pure geometry for the centre: the 3 cushion levels blended into rings 1-3 (always fully
// opaque, since the centre never fades - only its shape changes), plus rings 4-5 which
// only exist once the composition has centred, expanding out of the middle as it blends in
function traceCentreLoops(
  angleCount: number,
  t: number,
  c: number,
  breathAmplitude: number,
  layout: Layout,
  centerLayout: Layout,
): { alpha: number; pts: [number, number][] }[] {
  const loops: { alpha: number; pts: [number, number][] }[] = []
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

    // subtle brightness ripple travelling outward, phased per level so it doesn't pulse as one flat unit
    const levelShimmer = 1 + 0.12 * Math.sin(TWO_PI * t / 6 - levelIndex * 0.9)
    loops.push({ alpha: Math.min(1, CONTOUR_ALPHAS[levelIndex] * levelShimmer), pts: drawContour(blended, 0, 0, centerLayout) })
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

      const ringShimmer = 1 + 0.12 * Math.sin(TWO_PI * t / 6 - ringIndex * 0.9)
      loops.push({ alpha: Math.min(1, RING_ALPHA_EXTRA[ringIndex - 3] * outerAlpha * ringShimmer), pts: drawContour(scaled, 0, 0, centerLayout) })
    }
  }

  return loops
}

export type FigureGeometry = {
  neighbourLevels: { alpha: number; loops: [number, number][][] }[]
  centreLoops: { alpha: number; pts: [number, number][] }[]
}

// pure geometry for the whole frame (no ctx): everything the tracing math depends on is
// (width, height, t, baseAngleCount), which is exactly what the frozen-frame cache keys on
export function traceFigure(width: number, height: number, t: number, baseAngleCount: number): FigureGeometry {
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

  return {
    neighbourLevels: neighbourCells.length > 0 ? traceNeighbourLevels(neighbourCells, angleCount, t, c, layout) : [],
    centreLoops: traceCentreLoops(angleCount, t, c, breathAmplitude, layout, centerLayout),
  }
}
