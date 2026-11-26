const TARGET_CELL_PX = 64
const MIN_COLUMNS = 8
const MAX_DPR = 2
const ROW_SPREAD = 0.24
const STEP_CHANCE = 0.34
const STEP_DURATION = 0.09
const DARK_COLOR = '#000'
const MID_DARK_COLOR = '#262626'
const MID_LIGHT_COLOR = '#dcdcdc'
const GLOW_FLASH_MS = 160
const GLOW_MS = 900
const TWINKLE_INTERVAL_MS = 120
const FRONTIER_BAND = 0.08

type Cell = {
  x: number
  y: number
  w: number
  h: number
  start: number
  stepSpan: number
}

type PanelBox = { left: number; top: number; width: number; height: number }

type HeroMotionTiming = { duration: number }

function inkClipPath(cells: Cell[], progress: number, box: PanelBox, scaleX: number, scaleY: number): string {
  const rectangles: string[] = []
  let run: Cell | null = null

  function addRun() {
    if (!run) return
    const x1 = Math.round(Math.max(0, Math.min(box.width, run.x / scaleX - box.left)))
    const y1 = Math.round(Math.max(0, Math.min(box.height, run.y / scaleY - box.top)))
    const x2 = Math.round(Math.max(0, Math.min(box.width, (run.x + run.w) / scaleX - box.left)))
    const y2 = Math.round(Math.max(0, Math.min(box.height, (run.y + run.h) / scaleY - box.top)))
    if (x2 > x1 && y2 > y1) rectangles.push(`M ${x1} ${y1} H ${x2} V ${y2} H ${x1} Z`)
    run = null
  }

  for (const cell of cells) {
    if (progress > cell.start) {
      addRun()
    } else if (run && run.y === cell.y && run.h === cell.h && run.x + run.w === cell.x) {
      run.w += cell.w
    } else {
      addRun()
      run = { ...cell }
    }
  }
  addRun()
  return rectangles.length > 0 ? `path('${rectangles.join(' ')}')` : 'inset(50%)'
}

function measurePanel(element: HTMLElement, hero: HTMLElement): PanelBox {
  let left = 0
  let top = 0
  let current: HTMLElement | null = element
  while (current !== hero) {
    if (!current) throw new Error('addHeroMotion: the panel ink video is not inside the hero')
    left += current.offsetLeft
    top += current.offsetTop
    current = current.offsetParent as HTMLElement | null
  }
  return { left, top, width: element.offsetWidth, height: element.offsetHeight }
}

function cellNoise(row: number, col: number, salt: number): number {
  let hash = Math.imul(row + 1, 0x9e3779b1) ^ Math.imul(col + 1, 0x85ebca6b) ^ Math.imul(salt, 0xc2b2ae35)
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x7feb352d)
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x846ca68b)
  hash ^= hash >>> 16
  return (hash >>> 0) / 0x100000000
}

// Anchors square cells to the bottom edge so the pixel frontier rises cleanly from the floor.
function buildGrid(cssWidth: number, width: number, height: number): Cell[] {
  const cols = Math.max(MIN_COLUMNS, Math.round(cssWidth / TARGET_CELL_PX))
  const cellPx = width / cols
  const rows = Math.max(1, Math.ceil(height / cellPx))
  const travel = 1 - ROW_SPREAD - STEP_DURATION
  const cells: Cell[] = []

  for (let row = 0; row < rows; row += 1) {
    const y2 = height - Math.round(row * cellPx)
    const y1 = Math.max(0, height - Math.round((row + 1) * cellPx))
    const rowRatio = rows > 1 ? row / (rows - 1) : 0

    for (let col = 0; col < cols; col += 1) {
      const x1 = Math.round(col * cellPx)
      const x2 = Math.round((col + 1) * cellPx)
      const jitter = cellNoise(row, col, 1) * ROW_SPREAD
      const stepSpan = cellNoise(row, col, 2) < STEP_CHANCE ? STEP_DURATION : 0
      cells.push({
        x: x1,
        y: y1,
        w: x2 - x1,
        h: y2 - y1,
        start: rowRatio * travel + jitter,
        stepSpan,
      })
    }
  }

  return cells
}

// Stepped like the wipe itself: a light flash, then dark grey, then back to black.
function glowColor(litAt: number | undefined, now: number): string | null {
  if (litAt === undefined) return null
  const age = now - litAt
  if (age < GLOW_FLASH_MS) return MID_LIGHT_COLOR
  if (age < GLOW_MS) return MID_DARK_COLOR
  return null
}

function cellColor(cell: Cell, progress: number, glow: string | null): string | null {
  if (progress <= cell.start) return glow ?? DARK_COLOR
  if (cell.stepSpan === 0 || progress >= cell.start + cell.stepSpan) return null
  if (progress < cell.start + cell.stepSpan / 2) return MID_DARK_COLOR
  return MID_LIGHT_COLOR
}

function drawWipe(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cells: Cell[],
  progress: number,
  glows: Map<Cell, number>,
  now: number,
) {
  ctx.clearRect(0, 0, width, height)
  if (progress >= 1) return
  if (cells.length === 0) {
    ctx.fillStyle = DARK_COLOR
    ctx.fillRect(0, 0, width, height)
    return
  }

  for (const cell of cells) {
    const color = cellColor(cell, progress, glowColor(glows.get(cell), now))
    if (!color) continue
    ctx.fillStyle = color
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h)
  }
}

// Scrubbed pixel wipe with a frontier twinkle; the panel's ink video is clipped to the cells it has not reached.
export function addHeroMotion(timeline: gsap.core.Timeline, hero: HTMLElement, timing: HeroMotionTiming) {
  const canvas = hero.querySelector<HTMLCanvasElement>('[data-hero-wipe]')
  if (!canvas) throw new Error('addHeroMotion: the pixel wipe canvas is missing')
  const ink = hero.querySelector<HTMLVideoElement>('[data-hero-panel-ink]')
  if (!ink) throw new Error('addHeroMotion: the panel ink video is missing')
  const inkVideo = ink
  const context = canvas.getContext('2d')
  if (!context) return () => {}
  const wipeCanvas = canvas
  const ctx = context

  const state = { progress: 0 }
  let cells: Cell[] = []
  let panelBox: PanelBox = { left: 0, top: 0, width: 0, height: 0 }
  let inkClip = ''
  const glows = new Map<Cell, number>()
  let frame = 0
  let inView = true
  let lastTwinkle = 0

  function clipInk() {
    if (wipeCanvas.clientWidth === 0 || wipeCanvas.clientHeight === 0) return
    const clip = inkClipPath(cells, state.progress, panelBox, wipeCanvas.width / wipeCanvas.clientWidth, wipeCanvas.height / wipeCanvas.clientHeight)
    if (clip !== inkClip) {
      inkVideo.style.clipPath = clip
      inkClip = clip
    }
  }

  function redraw(now: number) {
    drawWipe(ctx, wipeCanvas.width, wipeCanvas.height, cells, state.progress, glows, now)
    clipInk()
  }

  function pruneGlows(now: number) {
    for (const [cell, litAt] of glows) {
      if (now - litAt >= GLOW_MS) glows.delete(cell)
    }
  }

  function twinkle(now: number) {
    if (now - lastTwinkle < TWINKLE_INTERVAL_MS) return
    lastTwinkle = now
    const candidates = cells.filter(
      (cell) => cell.start > state.progress && cell.start <= state.progress + FRONTIER_BAND,
    )
    if (candidates.length > 0) {
      glows.set(candidates[Math.floor(Math.random() * candidates.length)], now)
    }
  }

  function shouldRun() {
    return inView && state.progress < 1
  }

  function tick(now: number) {
    frame = 0
    twinkle(now)
    pruneGlows(now)
    redraw(now)
    if (shouldRun()) frame = requestAnimationFrame(tick)
  }

  function ensureLoop() {
    if (frame === 0 && shouldRun()) frame = requestAnimationFrame(tick)
  }

  function stopLoop() {
    if (frame !== 0) {
      cancelAnimationFrame(frame)
      frame = 0
    }
  }

  function syncSize() {
    const cssWidth = wipeCanvas.clientWidth
    const cssHeight = wipeCanvas.clientHeight
    if (cssWidth === 0 || cssHeight === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    wipeCanvas.width = Math.round(cssWidth * dpr)
    wipeCanvas.height = Math.round(cssHeight * dpr)
    glows.clear()
    cells = buildGrid(cssWidth, wipeCanvas.width, wipeCanvas.height)
    panelBox = measurePanel(inkVideo, hero)
    redraw(performance.now())
    wipeCanvas.style.background = 'transparent'
  }

  syncSize()
  const resizeObserver = new ResizeObserver(syncSize)
  resizeObserver.observe(wipeCanvas)
  resizeObserver.observe(inkVideo)
  const intersectionObserver = new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting
    if (inView) ensureLoop()
    else stopLoop()
  })
  intersectionObserver.observe(wipeCanvas)

  timeline.fromTo(
    state,
    { progress: 0 },
    {
      progress: 1,
      ease: 'none',
      duration: timing.duration,
      onUpdate: () => {
        redraw(performance.now())
        ensureLoop()
      },
    },
    0,
  )
  ensureLoop()

  return () => {
    stopLoop()
    intersectionObserver.disconnect()
    resizeObserver.disconnect()
    wipeCanvas.style.background = ''
    inkVideo.style.clipPath = ''
  }
}
