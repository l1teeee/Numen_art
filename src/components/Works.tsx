import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { FocusEvent, PointerEvent as ReactPointerEvent } from 'react'
import PaSprig from './PaSprig'
import { playIfAllowed } from './playIfAllowed'
import { PROJECTS, STYLE_GROUPS } from './projects'
import { useConceptTones } from './useConceptTones'
import { clamp, layoutStrip, tileMaxWidth } from './worksStrip'
import type { StripMetrics } from './worksStrip'
import type { Project } from './projects'
import styles from './Works.module.css'

const MOBILE_QUERY = '(max-width: 810px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
// Short enough that each project still sounds during a normal scroll, long enough that a fast one does not rattle.
const PROJECT_TONE_GAP_S = 0.45
// Scroll lengths in vh. DISSOLVE_VH matches the 60vh in Works.module.css and EXIT_DISSOLVE in IntroStage.tsx.
const DISSOLVE_VH = 60
const REST_BEFORE_VH = 30 // title and first project hold still before the strip moves
const STEP_VH = 24 // scroll per project
const REST_AFTER_VH = 40 // last project holds before Board arrives
const LANDSCAPE = 16 / 10
const PORTRAIT = 9 / 16
const EASE_PER_FRAME = 0.075 // share of the remaining distance covered per 60 Hz frame
const FRAME_MS = 1000 / 60
const MAX_FRAME_MS = 64
const SETTLE = 0.0005
const PLAY_RADIUS = 1 // only the centred project and its neighbours decode video
const SIZE_RHYTHM = [1, 0.84, 0.93, 0.78, 0.88] // neighbours never share a size
// Ratios of the section's height (maxHeight) and width (maxWidth).
const DESKTOP_STRIP = { maxWidth: 0.56, maxHeight: 0.54, minRatio: 0.55, spread: 1.2 }
const MOBILE_STRIP = { maxWidth: 0.62, maxHeight: 0.46, minRatio: 0.55, spread: 1.0 }

type TileMedia = { poster: string; video?: string; aspect: number; sizeFactor: number }

function holdLengthVh(dissolveVh: number): number {
  return dissolveVh + REST_BEFORE_VH + (PROJECTS.length - 1) * STEP_VH + REST_AFTER_VH
}

// Desktop shows the landscape capture so the column stays full; phones show the phone capture.
function tileMediaFor(project: Project, isMobile: boolean): Omit<TileMedia, 'sizeFactor'> {
  const portrait = isMobile && project.mobileMedia !== undefined
  if (portrait && project.mobileMedia !== undefined) return { poster: project.mobileMedia, video: project.mobileVideo, aspect: PORTRAIT }
  return { poster: project.media, video: project.video, aspect: LANDSCAPE }
}

function TileMediaView({ media, index }: { media: TileMedia; index: number }) {
  return (
    <>
      <img
        className={styles.media}
        src={`/media/${media.poster}.jpg`}
        alt=""
        loading="lazy"
        decoding="async"
      />
      {media.video && (
        <video
          className={styles.video}
          src={`/media/${media.video}.mp4`}
          data-index={index}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
        />
      )}
    </>
  )
}

export default function Works() {
  const holdRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const holdSpaceRef = useRef<HTMLDivElement>(null)
  const tileRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const labelRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const vhPxRef = useRef(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [sectionVisible, setSectionVisible] = useState(false)
  const [isMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [reducedMotion] = useState(() => window.matchMedia(REDUCED_MOTION_QUERY).matches)
  // Without motion the section is not pulled under the intro, so there is no dissolve to wait for.
  const dissolveVh = reducedMotion ? 0 : DISSOLVE_VH
  const holdVh = holdLengthVh(dissolveVh)
  const tiles = useMemo(() => PROJECTS.map((project, i) => ({ ...tileMediaFor(project, isMobile), sizeFactor: SIZE_RHYTHM[i % SIZE_RHYTHM.length] })), [isMobile])
  const tonesRef = useConceptTones(PROJECT_TONE_GAP_S)
  const lastSoundedIndexRef = useRef(0)
  const shown = PROJECTS[hoveredIndex ?? activeIndex]
  const activeGroup = PROJECTS[activeIndex].style

  useEffect(() => {
    const hold = holdRef.current
    const section = sectionRef.current
    const strip = stripRef.current
    const holdSpace = holdSpaceRef.current
    if (!hold || !section || !strip || !holdSpace) return
    const holdElement: HTMLDivElement = hold
    const sectionElement: HTMLElement = section
    const spaceElement: HTMLDivElement = holdSpace
    const stripElement: HTMLDivElement = strip
    let target = 0
    let current = 0
    let rafId = 0
    let lastActive = -1
    let lastFrame = 0
    let pointer: { x: number; y: number } | null = null
    let metrics: StripMetrics

    function measure(sectionElement: HTMLElement, spaceElement: HTMLDivElement, stripElement: HTMLDivElement) {
      vhPxRef.current = spaceElement.offsetHeight / holdVh
      const w = sectionElement.clientWidth
      const h = sectionElement.clientHeight
      const ratios = isMobile ? MOBILE_STRIP : DESKTOP_STRIP
      metrics = {
        viewportHeight: stripElement.clientHeight,
        maxWidth: ratios.maxWidth * w,
        maxHeight: ratios.maxHeight * h,
        minRatio: ratios.minRatio,
        spread: ratios.spread,
      }
      tileRefs.current.forEach((tile, i) => {
        if (!tile) return
        const wMax = tileMaxWidth(tiles[i], metrics)
        tile.style.width = `${wMax}px`
        tile.style.height = `${wMax / tiles[i].aspect}px`
      })
    }
    function readTarget(holdElement: HTMLDivElement) {
      if (vhPxRef.current <= 0) return target
      const scrolledVh = -holdElement.getBoundingClientRect().top / vhPxRef.current
      return clamp((scrolledVh - dissolveVh - REST_BEFORE_VH) / STEP_VH, 0, PROJECTS.length - 1)
    }
    function render(position: number) {
      const boxes = layoutStrip(position, tiles, metrics)
      boxes.forEach(({ y, width, scale }, i) => {
        const tile = tileRefs.current[i]
        const label = labelRefs.current[i]
        if (tile) tile.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`
        if (label) label.style.transform = `translate3d(${-width}px, ${y}px, 0)`
      })
      const nearest = Math.round(position)
      if (nearest !== lastActive) {
        lastActive = nearest
        setActiveIndex(nearest)
      }
    }
    function tick(now: number) {
      rafId = 0
      const elapsed = lastFrame ? Math.min(now - lastFrame, MAX_FRAME_MS) : FRAME_MS
      lastFrame = now
      if (reducedMotion) current = target
      else {
        const blend = 1 - Math.pow(1 - EASE_PER_FRAME, elapsed / FRAME_MS)
        current += (target - current) * blend
        if (Math.abs(target - current) < SETTLE) current = target
      }
      render(current)
      if (current !== target) rafId = requestAnimationFrame(tick)
      else {
        lastFrame = 0
        if (pointer) {
          const tile = document.elementFromPoint(pointer.x, pointer.y)?.closest<HTMLElement>('[data-tile]')
          setHoveredIndex(tile ? Number(tile.dataset.tile) : null)
        }
      }
    }
    function onScroll() {
      target = readTarget(holdElement)
      if (!rafId) rafId = requestAnimationFrame(tick)
    }
    function onPointerMove(event: PointerEvent) {
      if (event.pointerType === 'mouse') pointer = { x: event.clientX, y: event.clientY }
    }
    function onPointerLeave() {
      pointer = null
    }
    function sync() {
      measure(sectionElement, spaceElement, stripElement)
      target = readTarget(holdElement)
      current = target
      render(current)
    }
    sync()
    window.addEventListener('scroll', onScroll, { passive: true })
    section.addEventListener('pointermove', onPointerMove)
    section.addEventListener('pointerleave', onPointerLeave)
    const observer = new ResizeObserver(sync)
    observer.observe(section)
    observer.observe(holdSpace)
    observer.observe(strip)
    return () => {
      window.removeEventListener('scroll', onScroll)
      section.removeEventListener('pointermove', onPointerMove)
      section.removeEventListener('pointerleave', onPointerLeave)
      observer.disconnect()
      cancelAnimationFrame(rafId)
    }
  }, [tiles, reducedMotion, dissolveVh, holdVh, isMobile])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) setSectionVisible(entry.isIntersecting)
    }, { rootMargin: '15% 0px' })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // sounds only when the project changes, never on load
  useEffect(() => {
    if (activeIndex === lastSoundedIndexRef.current) return
    lastSoundedIndexRef.current = activeIndex
    tonesRef.current?.play('appear', activeIndex, 0)
  }, [activeIndex, tonesRef])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || reducedMotion) return
    for (const video of section.querySelectorAll<HTMLVideoElement>('video[data-index]')) {
      const i = Number(video.dataset.index)
      if (sectionVisible && Math.abs(i - activeIndex) <= PLAY_RADIUS) playIfAllowed(video)
      else video.pause()
    }
  }, [activeIndex, sectionVisible, reducedMotion])

  function scrollToProject(index: number) {
    const hold = holdRef.current
    if (!hold) return
    const holdTop = hold.getBoundingClientRect().top + window.scrollY
    window.scrollTo({
      top: holdTop + (dissolveVh + REST_BEFORE_VH + index * STEP_VH) * vhPxRef.current,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  function handleTileEnter(event: ReactPointerEvent<HTMLAnchorElement>, index: number) {
    if (event.pointerType === 'mouse') setHoveredIndex(index)
  }

  function handleTileLeave(index: number) {
    setHoveredIndex((current) => (current === index ? null : current))
  }

  function handleTileFocus(event: FocusEvent<HTMLAnchorElement>, index: number) {
    if (event.currentTarget.matches(':focus-visible')) scrollToProject(index)
  }

  return (
    <div ref={holdRef} className={styles.hold}>
      <section
        ref={sectionRef}
        className={styles.works}
        style={{ backgroundColor: `var(--ground-${activeGroup.toLowerCase()})` }}
        aria-labelledby="works-title"
      >
        <header className={styles.header}>
          <h2 id="works-title" className={styles.title}>Works,</h2>
          <div key={shown.index} className={styles.info}>
            <p className={styles.infoGroup}>{shown.style}</p>
            <p className={styles.infoName}>{shown.name} [{shown.index}]</p>
          </div>
        </header>
        <div className={styles.aside}>
            <nav className={styles.groups} aria-label="Styles">
              {STYLE_GROUPS.map((group) => (
                <button
                  key={group}
                  type="button"
                  className={`${styles.group} ${group === activeGroup ? styles.groupActive : ''}`}
                  aria-current={group === activeGroup ? 'true' : undefined}
                  onClick={() => scrollToProject(PROJECTS.findIndex((p) => p.style === group))}
                >
                  {group}
                </button>
              ))}
            </nav>
            <p className={styles.headerLinks}>
              <a href="https://www.delta-numen.com" target="_blank" rel="noopener">Start a project</a>{', '}
              <a href="mailto:contact@delta-numen.com">Contact</a>
            </p>
        </div>
        <div ref={stripRef} className={styles.strip}>
          {PROJECTS.map((project, i) => (
            <Fragment key={project.index}>
              <p
                ref={(node) => { labelRefs.current[i] = node }}
                className={`${styles.label} ${i === activeIndex ? styles.labelActive : ''} ${i === hoveredIndex ? styles.labelHovered : ''}`}
                aria-hidden="true"
              >
                <span className={styles.labelDot} />[ {project.name} ]
              </p>
              <a
                ref={(node) => { tileRefs.current[i] = node }}
                className={styles.tile}
                href={project.url}
                target="_blank"
                rel="noopener"
                aria-label={`${project.name}, visit site`}
                data-tile={i}
                onPointerEnter={(event) => handleTileEnter(event, i)}
                onPointerLeave={() => handleTileLeave(i)}
                onFocus={(event) => handleTileFocus(event, i)}
              >
                <TileMediaView media={tiles[i]} index={i} />
                {project.artwork === 'pa-sprig' && <div className={styles.artwork}><PaSprig /></div>}
              </a>
            </Fragment>
          ))}
        </div>
      </section>
      <div ref={holdSpaceRef} style={{ height: `${holdVh}vh` }} aria-hidden="true" />
    </div>
  )
}
