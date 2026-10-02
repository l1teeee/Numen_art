import { lerp, TWO_PI } from './figureGeometry'

function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

// each point becomes a quadratic control point and the curve passes through the
// midpoints, so the hairline is solid and continuous instead of faceted or dashed.
// Takes a CanvasPath (not just a 2D context) so it also works on a Path2D.
export function addSmoothLoop(path: CanvasPath, pts: [number, number][]) {
  const n = pts.length
  const start = midpoint(pts[n - 1], pts[0])
  path.moveTo(start[0], start[1])
  for (let k = 0; k < n; k++) {
    const mid = midpoint(pts[k], pts[(k + 1) % n])
    path.quadraticCurveTo(pts[k][0], pts[k][1], mid[0], mid[1])
  }
}

export const MAX_GAP_HALF_ANGLE = 0.3 * Math.PI // ~54deg each side of the loop's lowest point - lands the cut on the loop's own rounded corners

export type Opening = { gapHalfAngle: number; tailBottomY: number; centreX: number; extend: number; neighbourVisibility: number }

// fractional sample position on a closed loop: sample k sits at angle 2*PI*k/n, so this
// linearly interpolates between the two samples straddling that angle
function loopPointAt(pts: [number, number][], sampleIndex: number): [number, number] {
  const n = pts.length
  const lo = Math.floor(sampleIndex)
  const hi = (lo + 1) % n
  const f = sampleIndex - lo
  return [lerp(pts[lo][0], pts[hi][0], f), lerp(pts[lo][1], pts[hi][1], f)]
}

function unitVector(from: [number, number], to: [number, number]): [number, number] {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy)
  if (len === 0) throw new Error('unitVector: zero-length input')
  return [dx / len, dy / len]
}

// converging tail geometry, as a cubic Bezier from cut endpoint E toward a narrow bundle
// point at the bottom centre. Represented as [E, P1, P2, F] rather than drawn directly, so
// the caller can grow only a sub-curve of it (see leadingSubCubic) without changing its shape.
type Cubic = [[number, number], [number, number], [number, number], [number, number]]

const TAIL_CONVERGE_RATIO = 0 // tails land exactly at the centre so both read as one single line; Math.sign(run) in tailCubic still orders left/right correctly since E is never exactly at centreX for the off-centre cut endpoints
const TAIL_MAX_RUN_PER_DROP = 1.8 // caps the horizontal run to this multiple of the vertical drop (~29deg min average descent), so a shallow cut still visibly descends instead of running flat along the bottom edge
const TAIL_TANGENT_REACH = 0.45 // how far P1 leaves along the arc's own tangent T
const TAIL_ARRIVAL_REACH = 0.45 // how far P2 sits above the bottom edge, arriving vertically
// Long page-space tails need bounded control reaches to keep both ends curved instead of turning the middle into a diagonal.
const TAIL_MAX_REACH_PX = 320

// null when the cut endpoint is already at or past the bottom edge (no room for a tail)
function tailCubic(E: [number, number], T: [number, number], tailBottomY: number, centreX: number): Cubic | null {
  const dy = tailBottomY - E[1]
  if (dy <= 0) return null

  const targetX = centreX + (E[0] - centreX) * TAIL_CONVERGE_RATIO
  const run = targetX - E[0]
  const F: [number, number] = [E[0] + Math.sign(run) * Math.min(Math.abs(run), dy * TAIL_MAX_RUN_PER_DROP), tailBottomY]
  let reach = Math.min(dy * TAIL_TANGENT_REACH, TAIL_MAX_REACH_PX)
  const runToLanding = F[0] - E[0]
  // Stopping P1 at the landing x keeps every control point between the endpoint and its landing column, so by the convex-hull property a tail never crosses the centre or its mirrored twin.
  if (T[0] * runToLanding > 0) reach = Math.min(reach, runToLanding / T[0])
  const P1: [number, number] = [E[0] + T[0] * reach, E[1] + T[1] * reach]
  const P2: [number, number] = [F[0], tailBottomY - Math.min(dy * TAIL_ARRIVAL_REACH, TAIL_MAX_REACH_PX)]
  return [E, P1, P2, F]
}

function lerpPoint(a: [number, number], b: [number, number], t: number): [number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
}

// de Casteljau split: returns only the leading sub-curve [0, u] of a cubic (the trailing half
// is discarded). Used to grow a tail's tip smoothly along its own final curve - the shape
// never changes as it grows.
function leadingSubCubic(cubic: Cubic, u: number): Cubic {
  const [P0, P1, P2, P3] = cubic
  const p01 = lerpPoint(P0, P1, u)
  const p12 = lerpPoint(P1, P2, u)
  const p23 = lerpPoint(P2, P3, u)
  const p012 = lerpPoint(p01, p12, u)
  const p123 = lerpPoint(p12, p23, u)
  const p0123 = lerpPoint(p012, p123, u)
  return [P0, p01, p012, p0123]
}

// an opened loop: cuts a gap straddling the loop's lowest point (angle PI/2), keeps the
// long arc over the top, and grows a converging tail from each cut end. Drawn as one
// continuous subpath: A's tail (reversed, tip to A), then the arc A -> B, then B's tail
// (B to tip) - so the arc-to-tail joints are invisible stroke continuations, not caps.
export function addOpenedLoop(
  path: CanvasPath,
  pts: [number, number][],
  gapHalfAngle: number,
  tailBottomY: number,
  centreX: number,
  extend: number,
) {
  const n = pts.length
  const angleA = Math.PI / 2 + gapHalfAngle // left-lower side
  const angleB = Math.PI / 2 - gapHalfAngle // right-lower side
  const idxA = (angleA / TWO_PI) * n
  const idxB = (angleB / TWO_PI) * n

  const pointA = loopPointAt(pts, idxA)
  const pointB = loopPointAt(pts, idxB)
  // never let these land on a sample that can coincide with the cut point (idxA/idxB land on
  // an exact integer at full open on desktop) - that would make the tangent below zero-length
  const firstK = Math.floor(idxA) + 1
  const endIdx = idxB + n // unwrapped: the kept arc goes forward from A, over the top, to B
  const lastK = Math.ceil(endIdx) - 1

  // tangent comes from the chord straddling the cut, never from (sample, cut point) - those
  // two can coincide exactly when idxA/idxB is an integer
  const tailA = extend >= 0.001
    ? tailCubic(pointA, unitVector(pts[firstK % n], pts[(firstK - 1) % n]), tailBottomY, centreX)
    : null
  const tailB = extend >= 0.001
    ? tailCubic(pointB, unitVector(pts[lastK % n], pts[(lastK + 1) % n]), tailBottomY, centreX)
    : null

  if (tailA) {
    const [P0, P1, P2, P3] = leadingSubCubic(tailA, extend)
    path.moveTo(P3[0], P3[1])
    path.bezierCurveTo(P2[0], P2[1], P1[0], P1[1], P0[0], P0[1]) // reversed: tip -> A
  } else {
    path.moveTo(pointA[0], pointA[1])
  }

  // each segment k naturally ends at index k + 0.5; if the last one would run past B, cut
  // it short into B directly instead of overshooting and walking back with a lineTo
  let reachedB = false
  for (let k = firstK; k <= lastK; k++) {
    const idx = k % n
    const next = (idx + 1) % n
    if (k + 0.5 >= endIdx) {
      path.quadraticCurveTo(pts[idx][0], pts[idx][1], pointB[0], pointB[1])
      reachedB = true
      break
    }
    const mid = midpoint(pts[idx], pts[next])
    path.quadraticCurveTo(pts[idx][0], pts[idx][1], mid[0], mid[1])
  }
  if (!reachedB) path.lineTo(pointB[0], pointB[1])

  if (tailB) {
    const [, P1, P2, P3] = leadingSubCubic(tailB, extend)
    path.bezierCurveTo(P1[0], P1[1], P2[0], P2[1], P3[0], P3[1]) // forward: B -> tip
  }
}
