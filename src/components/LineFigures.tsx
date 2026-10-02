import { useEffect, useRef } from 'react'
import { MOBILE_BREAKPOINT_PX, traceFigure, TWO_PI } from '../figure/figureGeometry'
import type { FigureGeometry } from '../figure/figureGeometry'
import { addOpenedLoop, addSmoothLoop, MAX_GAP_HALF_ANGLE } from '../figure/figurePaths'
import type { Opening } from '../figure/figurePaths'
import { dampTowards } from '../scroll/storyTimeline'
import type { StoryFrame } from '../scroll/storyTimeline'
import styles from './LineFigures.module.css'

const MAX_DEVICE_PIXEL_RATIO = 2
const REDUCED_MOTION_T = 25 // a representative "centred hold" instant for the static frame

// heartbeat pulse: runs on real time (performance.now()), never on the animation's own
// elapsed/t, so the lines keep beating even while the descent freezes t. Lub-dub over a
// 1.4s cycle - a strong first beat, a softer second beat, then a long rest.
const HEARTBEAT_PERIOD_S = 1.4
const HEARTBEAT_LUB_CENTER = 0.12
const HEARTBEAT_LUB_WIDTH = 0.055
const HEARTBEAT_DUB_CENTER = 0.32
const HEARTBEAT_DUB_WIDTH = 0.07
const HEARTBEAT_DUB_WEIGHT = 0.55
const HEARTBEAT_WIDTH_AMPLITUDE = 0.65 // raised from 0.45 so the palpito reads clearly on the thicker centre line

function pulseAt(nowMs: number): number {
  const x = (nowMs / 1000 % HEARTBEAT_PERIOD_S) / HEARTBEAT_PERIOD_S
  const lub = Math.exp(-Math.pow((x - HEARTBEAT_LUB_CENTER) / HEARTBEAT_LUB_WIDTH, 2))
  const dub = HEARTBEAT_DUB_WEIGHT * Math.exp(-Math.pow((x - HEARTBEAT_DUB_CENTER) / HEARTBEAT_DUB_WIDTH, 2))
  return lub + dub
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

// only the parts of the contours the fading trail mask still covers stay visible. Strokes
// the SAME Path2D objects renderFigure just drew, so the highlight follows the opened
// shapes and tails and never lights up the removed bottom arc.
function buildHighlightCanvas(trail: TrailState, renderedPaths: RenderedPath[], width: number, height: number, heroTop: number) {
  const { highlightCtx, maskCanvas } = trail
  highlightCtx.clearRect(0, 0, width, height)
  highlightCtx.globalCompositeOperation = 'source-over'
  highlightCtx.lineWidth = TRAIL_LINE_WIDTH
  highlightCtx.lineCap = 'round'
  highlightCtx.lineJoin = 'round'
  highlightCtx.shadowBlur = TRAIL_SHADOW_BLUR
  highlightCtx.shadowColor = 'rgba(255, 255, 255, 1)'

  // group by visibility so paths that share it are stroked - and shadowed - once together,
  // matching the single combined stroke the baseline highlight used (1 group at open=0)
  const groups = new Map<number, Path2D>()
  for (const { path, visibility } of renderedPaths) {
    if (visibility < 0.01) continue
    let group = groups.get(visibility)
    if (!group) {
      group = new Path2D()
      groups.set(visibility, group)
    }
    group.addPath(path)
  }
  highlightCtx.save()
  highlightCtx.translate(0, heroTop)
  for (const [visibility, group] of groups) {
    highlightCtx.strokeStyle = `rgba(255, 255, 255, ${TRAIL_STROKE_ALPHA * visibility})`
    highlightCtx.stroke(group)
  }
  highlightCtx.restore()
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

// hover sprouts: tiny random curved lines born wherever the cursor moves, that grow briefly
// then slowly contract back into their birth point instead of vanishing abruptly. Spawned in
// the pointermove handler (see handlePointerMove), drawn each frame in drawSprouts.
type Sprout = { x: number; y: number; angle: number; len: number; ctrlOffset: number; bornMs: number; lifeMs: number }

const SPROUT_SPAWN_DIST_PX = 14 // accumulated pointer distance before a sprout is born
const SPROUT_SPAWN_BURST_DIST_PX = 40 // a single move past this distance births 2 sprouts instead of 1
const SPROUT_MAX_ALIVE = 28
const SPROUT_LEN_MIN_PX = 18, SPROUT_LEN_MAX_PX = 55
const SPROUT_LIFE_MIN_MS = 900, SPROUT_LIFE_MAX_MS = 1800
const SPROUT_CTRL_BOW_MIN = 0.2, SPROUT_CTRL_BOW_MAX = 0.5 // perpendicular bow, as a fraction of the sprout's own length
const SPROUT_GROW_FRACTION = 0.18 // grows over the first 18% of life, then contracts over the rest
const SPROUT_LINE_WIDTH = 1

// proximity gate: sprouts only spawn when the pointer is on or near a drawn line, not
// anywhere over the canvas - hit-tested with a fat stroke tolerance against the same
// Path2D objects the last frame actually drew (see lastRenderedPaths/lastHeroTop below)
const SPROUT_HIT_TEST_LINE_WIDTH = 44

// client: sprouts belong to the travelling line (the descent), not the resting hero rings -
// gate on the loops having fully opened into tails before a sprout can spawn at all
const SPROUT_MIN_OPEN = 0.9

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

// totally random per sprout by design - no symmetry, so hovering never reads as a fixed pattern
function spawnSprout(sprouts: Sprout[], x: number, y: number, bornMs: number) {
  if (sprouts.length >= SPROUT_MAX_ALIVE) sprouts.shift() // drop the oldest
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

// grows 0 -> 1 over the first SPROUT_GROW_FRACTION of life, then contracts 1 -> 0 over the
// rest - u is the fraction of the sprout's own curve currently drawn (see drawSprouts)
function sproutProgress(age: number): number {
  if (age < SPROUT_GROW_FRACTION) return easeOutQuad(age / SPROUT_GROW_FRACTION)
  return 1 - easeInOutQuad((age - SPROUT_GROW_FRACTION) / (1 - SPROUT_GROW_FRACTION))
}

// draws only the leading [0, u] sub-curve of each sprout's quadratic (birth point -> control
// -> tip), so the tip is what grows out and then retracts back into the birth point - the
// stroke's shape never jumps, it just shortens. Mutates sprouts in place with a swap-remove.
function drawSprouts(ctx: CanvasRenderingContext2D, sprouts: Sprout[]) {
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
}

type RenderedPath = { path: Path2D; visibility: number }

// as the tails converge, every centre loop except the innermost dissolves so the bundle
// reads as a single line by the time it reaches the white section. Outermost fades first.
const MERGE_FADE_SPAN = 0.14
const MERGE_FADE_BASE_START = 0.40
const MERGE_FADE_START_STEP = 0.12

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

// index 0 is the innermost centre loop (never fades); higher indices are further out and
// start fading earlier, spaced MERGE_FADE_START_STEP apart, ending at the outermost ring
function centreLoopMergeVisibility(index: number, lastIndex: number, extend: number): number {
  if (index === 0) return 1
  const fadeStart = MERGE_FADE_BASE_START + MERGE_FADE_START_STEP * (lastIndex - index)
  return 1 - clamp01((extend - fadeStart) / MERGE_FADE_SPAN)
}

// the innermost centre loop (index 0) is the one whose tails survive to the seam, so it
// strokes noticeably thicker than everything else - that is what makes the final single
// line and its heartbeat read clearly instead of blending into the other loops
const CENTRE_LINE_WIDTH_INNERMOST = 1.9
const CENTRE_LINE_WIDTH_BASE = 1.0
const NEIGHBOUR_LINE_WIDTH = 1.0

// draws the traced geometry: neighbour levels are always closed loops (never opened, just
// faded further by the scroll), centre loops open into arcs + tails once gapHalfAngle grows.
// widthFactor is the shared breathing+heartbeat multiplier (computed once in drawFrame);
// each stroke sets its own ctx.lineWidth from its base width times that factor, so only the
// innermost centre loop can be thicker while everything else keeps the previous look.
// Returns every stroked path paired with its trail visibility (see buildHighlightCanvas).
function renderFigure(ctx: CanvasRenderingContext2D, geometry: FigureGeometry, opening: Opening, pulse = 0, widthFactor = 1): RenderedPath[] {
  const rendered: RenderedPath[] = []
  const { neighbourVisibility } = opening
  const pulseBoost = 1 + 0.3 * pulse

  if (neighbourVisibility >= 0.01) {
    ctx.lineWidth = NEIGHBOUR_LINE_WIDTH * widthFactor
    for (const level of geometry.neighbourLevels) {
      const path = new Path2D()
      for (const loop of level.loops) addSmoothLoop(path, loop)
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, level.alpha * neighbourVisibility * pulseBoost)})`
      ctx.stroke(path)
      rendered.push({ path, visibility: neighbourVisibility })
    }
  }

  const lastCentreLoopIndex = geometry.centreLoops.length - 1
  for (let i = 0; i < geometry.centreLoops.length; i++) {
    const loop = geometry.centreLoops[i]
    const mergeVisibility = centreLoopMergeVisibility(i, lastCentreLoopIndex, opening.extend)
    if (mergeVisibility < 0.01) continue

    const path = new Path2D()
    if (opening.gapHalfAngle < 0.001) addSmoothLoop(path, loop.pts)
    else addOpenedLoop(path, loop.pts, opening.gapHalfAngle, opening.tailBottomY, opening.centreX, opening.extend)

    ctx.lineWidth = (i === 0 ? CENTRE_LINE_WIDTH_INNERMOST : CENTRE_LINE_WIDTH_BASE) * widthFactor
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, loop.alpha * mergeVisibility * pulseBoost)})`
    ctx.stroke(path)
    rendered.push({ path, visibility: mergeVisibility })
  }

  return rendered
}

type CachedGeometry = { t: number; width: number; heroHeight: number; baseAngleCount: number; geometry: FigureGeometry }

// reuses the frozen-frame cache when nothing the tracing depends on has changed, retracing
// and storing otherwise
function cachedFigureGeometry(
  geometryCache: { current: CachedGeometry | null },
  width: number,
  heroHeight: number,
  t: number,
  baseAngleCount: number,
): FigureGeometry {
  const cached = geometryCache.current
  if (cached && cached.t === t && cached.width === width && cached.heroHeight === heroHeight && cached.baseAngleCount === baseAngleCount) {
    return cached.geometry
  }
  const geometry = traceFigure(width, heroHeight, t, baseAngleCount)
  geometryCache.current = { t, width, heroHeight, baseAngleCount, geometry }
  return geometry
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  pointer: { x: number; y: number } | null,
  trail: TrailState | null,
  baseAngleCount: number,
  frame: StoryFrame,
  open: number,
  extend: number,
  geometryCache: { current: CachedGeometry | null },
  pulse = 0,
  sprouts: Sprout[] = [],
  lastRenderedPaths: { current: RenderedPath[] },
  lastHeroTop: { current: number },
) {
  ctx.clearRect(0, 0, width, height)
  if (width <= 0 || height <= 0) return

  const geometry = cachedFigureGeometry(geometryCache, width, frame.heroHeight, t, baseAngleCount)

  const opening: Opening = {
    gapHalfAngle: open * MAX_GAP_HALF_ANGLE,
    tailBottomY: frame.whiteTop - frame.heroTop,
    centreX: width / 2,
    extend,
    neighbourVisibility: 1 - open,
  }

  // swells with roughly the same 10s breath the geometry already has; freezes with t when scrolled.
  // The heartbeat multiplier rides on top and keeps beating on real time even while frozen. Computed
  // once here and passed into renderFigure, which turns it into a per-stroke ctx.lineWidth so the
  // innermost centre loop can be thicker than every other loop.
  const widthFactor = (1 + 0.22 * Math.sin(TWO_PI * t / 10 - 0.9)) * (1 + HEARTBEAT_WIDTH_AMPLITUDE * pulse)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.save()
  // The live offset keeps the frozen geometry attached to the hero while the page moves.
  ctx.translate(0, frame.heroTop)
  const renderedPaths = renderFigure(ctx, geometry, opening, pulse, widthFactor)
  ctx.restore()

  // only paths still meaningfully visible count as "on a line" for the hover-sprout gate
  lastRenderedPaths.current = renderedPaths.filter((p) => p.visibility >= 0.05)
  lastHeroTop.current = frame.heroTop

  if (trail) {
    updateTrailMask(trail, pointer, width, height)
    if (performance.now() - trail.lastDotMs <= TRAIL_IDLE_SKIP_MS) {
      buildHighlightCanvas(trail, renderedPaths, width, height, frame.heroTop)
      ctx.drawImage(trail.highlightCanvas, 0, 0, width, height)
    }
  }

  // raw viewport coordinates - no heroTop translate - so sprouts stay pinned where the
  // cursor actually was on screen rather than scrolling with the hero figure
  drawSprouts(ctx, sprouts)
}

export default function LineFigures({ getStoryFrame }: { getStoryFrame: () => StoryFrame }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const attachedCanvas = canvasRef.current
    if (!attachedCanvas) return
    const canvas: HTMLCanvasElement = attachedCanvas
    const drawingContext = canvas.getContext('2d')
    if (!drawingContext) return
    const ctx: CanvasRenderingContext2D = drawingContext

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointerFine = window.matchMedia('(pointer: fine)').matches

    let width = 0
    let height = 0
    let elapsed = reduceMotion ? REDUCED_MOTION_T : 0
    let displayedOpen = 0
    let displayedExtend = 0
    const pointerState: { current: { x: number; y: number } | null } = { current: null }
    // The glow is autonomous motion and has no loop to fade it in that mode.
    const trail = pointerFine && !reduceMotion ? createTrailState() : null
    const geometryCache: { current: CachedGeometry | null } = { current: null }
    // reused every frame (see drawSprouts' swap-remove) so spawning/animating sprouts never
    // allocates per-sprout closures; only ever populated when trail exists (pointer fine, no
    // reduced motion), same gate as the pointermove listener below
    const sprouts: Sprout[] = []
    let sproutSpawnAccumPx = 0
    let lastSproutSpawnPoint: { x: number; y: number } | null = null
    // latest drawn frame's paths/offset, read by the pointermove proximity gate - stays
    // empty until the first drawFrame runs, so hovering before that spawns nothing
    const lastRenderedPaths: { current: RenderedPath[] } = { current: [] }
    const lastHeroTop: { current: number } = { current: 0 }
    // frame.timeline.open from the last drawn frame - read by the sprout proximity gate
    const lastOpen: { current: number } = { current: 0 }

    // what the last actually-drawn frame looked like, so an unchanged frozen frame with an
    // idle trail can be skipped instead of re-rendering identical pixels every tick. open and
    // extend are the displayed values because they are eased independently from the live frame
    let lastDrawnOpen: number | null = null
    let lastDrawnExtend: number | null = null
    let lastDrawnHeroTop: number | null = null
    let lastDrawnHeroHeight: number | null = null
    let lastDrawnTailBottomY: number | null = null
    let lastDrawnPointer: { x: number; y: number } | null = null
    // the heartbeat pulse changes every frame - comparing it here (alongside the other
    // lastDrawn values) means it never equals its previous float, so a visible frame is
    // never mistaken for "nothing changed" while the geometry cache still avoids re-tracing
    let lastDrawnPulse: number | null = null
    // whether the last frame actually drawn had an idle trail - required (alongside the
    // current idle check) before skipping, so one clean, highlight-free frame always runs
    // right after the trail goes idle instead of leaving the last highlighted frame stuck
    let lastDrawnTrailIdle = true
    let canvasHidden = false

    function renderCurrentFrame(frame: StoryFrame, pulse = 0, force = false) {
      if (reduceMotion) {
        displayedOpen = frame.timeline.open
        displayedExtend = frame.timeline.extend
      }

      if (!frame.timeline.linesVisible) {
        if (canvasHidden) return
        ctx.clearRect(0, 0, width, height)
        canvas.style.visibility = 'hidden'
        canvasHidden = true
        lastDrawnHeroTop = null
        lastDrawnHeroHeight = null
        lastDrawnTailBottomY = null
        return
      }

      if (canvasHidden) {
        canvas.style.visibility = ''
        canvasHidden = false
        force = true
      }
      const baseAngleCount = width < MOBILE_BREAKPOINT_PX ? 96 : 160
      const trailIdle = !trail || performance.now() - trail.lastDotMs > TRAIL_IDLE_SKIP_MS

      if (!force) {
        const nothingChanged =
          frame.timeline.frozen &&
          frame.heroTop === lastDrawnHeroTop &&
          frame.heroHeight === lastDrawnHeroHeight &&
          (frame.whiteTop - frame.heroTop) === lastDrawnTailBottomY &&
          displayedOpen === lastDrawnOpen &&
          displayedExtend === lastDrawnExtend &&
          pointerState.current === lastDrawnPointer &&
          pulse === lastDrawnPulse &&
          trailIdle &&
          lastDrawnTrailIdle
        if (nothingChanged) return
      }

      lastDrawnOpen = displayedOpen
      lastDrawnExtend = displayedExtend
      lastDrawnHeroTop = frame.heroTop
      lastDrawnHeroHeight = frame.heroHeight
      lastDrawnTailBottomY = frame.whiteTop - frame.heroTop
      lastDrawnPointer = pointerState.current
      lastDrawnPulse = pulse
      lastDrawnTrailIdle = trailIdle
      drawFrame(
        ctx,
        width,
        height,
        elapsed,
        pointerState.current,
        trail,
        baseAngleCount,
        frame,
        displayedOpen,
        displayedExtend,
        geometryCache,
        pulse,
        sprouts,
        lastRenderedPaths,
        lastHeroTop,
      )
      lastOpen.current = frame.timeline.open
    }

    function resize() {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const dpr = Math.min(MAX_DEVICE_PIXEL_RATIO, Math.max(1, window.devicePixelRatio || 1))

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (trail) {
        for (const c of [trail.maskCanvas, trail.highlightCanvas]) {
          c.width = Math.round(width * dpr)
          c.height = Math.round(height * dpr)
        }
        trail.maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
        trail.highlightCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }

      const frame = getStoryFrame()
      renderCurrentFrame(frame, 0, true)
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    // hit-tests the pointer against the last drawn frame's line paths with a fat tolerance -
    // only called every >= SPROUT_SPAWN_DIST_PX of movement (see handlePointerMove), so this
    // stays a handful of isPointInStroke calls per move and never runs per animation frame
    function pointerIsOnLine(x: number, y: number): boolean {
      // client: sprouts must not appear in the resting hero rings, only once the figure has
      // opened into the travelling line - checked before the isPointInStroke test below
      if (lastOpen.current < SPROUT_MIN_OPEN) return false
      const paths = lastRenderedPaths.current
      if (paths.length === 0) return false
      ctx.save()
      ctx.lineWidth = SPROUT_HIT_TEST_LINE_WIDTH
      const hit = paths.some(({ path }) => ctx.isPointInStroke(path, x, y - lastHeroTop.current))
      ctx.restore()
      return hit
    }

    function handlePointerMove(event: PointerEvent) {
      const point = { x: event.clientX, y: event.clientY }
      pointerState.current = point

      if (lastSproutSpawnPoint) {
        const moveDistPx = Math.hypot(point.x - lastSproutSpawnPoint.x, point.y - lastSproutSpawnPoint.y)
        sproutSpawnAccumPx += moveDistPx
        if (sproutSpawnAccumPx >= SPROUT_SPAWN_DIST_PX) {
          if (pointerIsOnLine(point.x, point.y)) {
            const nowMs = performance.now()
            spawnSprout(sprouts, point.x, point.y, nowMs)
            if (moveDistPx > SPROUT_SPAWN_BURST_DIST_PX) spawnSprout(sprouts, point.x, point.y, nowMs)
          }
          sproutSpawnAccumPx = 0
        }
      }
      lastSproutSpawnPoint = point
    }

    function handlePointerLeave() {
      pointerState.current = null
    }

    if (trail) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true })
      document.documentElement.addEventListener('pointerleave', handlePointerLeave)
    }

    // Reduced motion has no rAF loop, so user-driven scrolls redraw the live page-space offset and opening directly.
    let scrollTicking = false
    let scrollFrameId = 0
    function handleScroll() {
      if (scrollTicking) return
      scrollTicking = true
      scrollFrameId = requestAnimationFrame(() => {
        scrollTicking = false
        const frame = getStoryFrame()
        renderCurrentFrame(frame)
      })
    }
    if (reduceMotion) {
      window.addEventListener('scroll', handleScroll, { passive: true })
    }

    let animationFrameId = 0
    if (!reduceMotion) {
      let lastFrameMs = performance.now()
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - lastFrameMs) / 1000)
        lastFrameMs = now
        const frame = getStoryFrame()
        displayedOpen = dampTowards(displayedOpen, frame.timeline.open, dt)
        displayedExtend = dampTowards(displayedExtend, frame.timeline.extend, dt)
        if (!frame.timeline.frozen) elapsed += dt
        const pulse = pulseAt(now)
        renderCurrentFrame(frame, pulse)
        animationFrameId = requestAnimationFrame(tick)
      }
      animationFrameId = requestAnimationFrame(tick)
    }

    return () => {
      resizeObserver.disconnect()
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (trail) {
        window.removeEventListener('pointermove', handlePointerMove)
        document.documentElement.removeEventListener('pointerleave', handlePointerLeave)
      }
      if (reduceMotion) {
        window.removeEventListener('scroll', handleScroll)
        if (scrollFrameId) cancelAnimationFrame(scrollFrameId)
      }
      canvas.style.visibility = ''
    }
  }, [getStoryFrame])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}
