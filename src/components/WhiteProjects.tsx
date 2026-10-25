import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import styles from './WhiteProjects.module.css'

gsap.registerPlugin(useGSAP, ScrollTrigger)

type Project = {
  index: string
  name: string
  url: string
  media: string
  ground: 'dark' | 'light'
}

const PROJECTS: Project[] = [
  {
    index: '01',
    name: 'XIT',
    url: 'https://xit-nu.vercel.app/',
    media: 'project-xit',
    ground: 'dark',
  },
  {
    index: '02',
    name: 'Memoria',
    url: 'https://cosmos-carboncillo.vercel.app/',
    media: 'project-memoria',
    ground: 'light',
  },
  {
    index: '03',
    name: 'LOYAL',
    url: 'https://loyal-omega-nine.vercel.app/',
    media: 'project-loyal',
    ground: 'dark',
  },
]

const MOBILE_QUERY = '(max-width: 810px), (pointer: coarse)'

const WIPE_START = 0.45
const WIPE_DURATION = 0.35
const PROJECT_STEP = 0.5
const FINAL_HOLD = 0.2
const TIMELINE_LENGTH = WIPE_START + (PROJECTS.length - 2) * PROJECT_STEP + WIPE_DURATION + FINAL_HOLD
const PULL_BACK_SCALE = 0.94

function transitionStart(projectIndex: number) {
  return WIPE_START + (projectIndex - 1) * PROJECT_STEP
}

function getRequiredRefs<T>(refs: Array<T | null>, count: number) {
  const required = Array.from({ length: count }, (_, index) => refs[index])
  if (!required.every((ref): ref is T => ref !== null && ref !== undefined)) return null
  return required
}

export default function WhiteProjects() {
  const headerRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const groundRefs = useRef<(HTMLDivElement | null)[]>([])
  const frameRefs = useRef<(HTMLDivElement | null)[]>([])
  const zoomRefs = useRef<(HTMLDivElement | null)[]>([])
  const frostRef = useRef<HTMLDivElement>(null)
  const shadeRefs = useRef<(HTMLDivElement | null)[]>([])
  const infoRefs = useRef<(HTMLDivElement | null)[]>([])
  const nameRefs = useRef<(HTMLSpanElement | null)[]>([])
  const indexRefs = useRef<(HTMLSpanElement | null)[]>([])
  const detailRefs = useRef<(HTMLDivElement | null)[]>([])
  const counterRef = useRef<HTMLDivElement>(null)
  const counterTrackRef = useRef<HTMLSpanElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [allowVideo] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [liveVideos, setLiveVideos] = useState<Set<number>>(() => new Set())

  function markLive(index: number) {
    setLiveVideos((previous) => {
      if (previous.has(index)) return previous
      const next = new Set(previous)
      next.add(index)
      return next
    })
  }

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible)
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.25 },
    )

    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  useGSAP(
    () => {
      const stage = stageRef.current
      if (!stage) return

      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const isMobile = window.matchMedia(MOBILE_QUERY).matches
        const cardRadius = isMobile ? 24 : 32
        // matching number and unit patterns avoid browser-shortened computed clip paths
        const windowFrom = isMobile ? 'inset(20.6% 20.6% 20.6% 20.6% round 40px)' : 'inset(22% 23.4% 22% 23.4% round 56px)'
        const windowTo = `inset(0% 0% 0% 0% round ${cardRadius}px)`
        const wipeFrom = `inset(100% 0% 0% 0% round ${cardRadius}px ${cardRadius}px 0px 0px)`
        const wipeTo = `inset(0% 0% 0% 0% round ${cardRadius}px ${cardRadius}px 0px 0px)`
        const groundFrom = `inset(100% 0% 0% 0% round ${cardRadius * 2}px ${cardRadius * 2}px 0px 0px)`
        const groundTo = 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)'
        const frames = getRequiredRefs(frameRefs.current, PROJECTS.length)
        const zooms = getRequiredRefs(zoomRefs.current, PROJECTS.length)
        const grounds = getRequiredRefs(groundRefs.current, PROJECTS.length - 1)
        const shades = getRequiredRefs(shadeRefs.current, PROJECTS.length - 1)
        const infos = getRequiredRefs(infoRefs.current, PROJECTS.length)
        const names = getRequiredRefs(nameRefs.current, PROJECTS.length)
        const indexes = getRequiredRefs(indexRefs.current, PROJECTS.length)
        const details = getRequiredRefs(detailRefs.current, PROJECTS.length)
        const frost = frostRef.current
        const counter = counterRef.current
        const counterTrack = counterTrackRef.current
        const firstPanel = frames?.[0].parentElement

        if (
          !frames || !zooms || !grounds || !shades || !infos || !names || !indexes ||
          !details || !frost || !counter || !counterTrack || !firstPanel
        ) return

        const firstCard = frames[0]
        const firstZoom = zooms[0]
        const firstName = names[0]
        const firstIndex = indexes[0]
        const firstDetails = details[0]
        const panel = firstPanel
        const counterElement = counter
        const firstChars = Array.from(firstName.children)
        const counterStep = 100 / PROJECTS.length

        function counterOffsetFromCardCenter() {
          return {
            x: counterElement.offsetLeft + counterElement.offsetWidth / 2 - (firstCard.offsetLeft + firstCard.offsetWidth / 2),
            y: counterElement.offsetTop + counterElement.offsetHeight / 2 - (firstCard.offsetTop + firstCard.offsetHeight / 2),
          }
        }

        function cardCenterShift() {
          return panel.clientHeight / 2 - (firstCard.offsetTop + firstCard.offsetHeight / 2)
        }

        let stageNearViewport = false
        // scrolltrigger can update during construction, before the timeline assignment completes
        let tl: gsap.core.Timeline | null = null

        // only the projects actually on screen decode their loops
        function syncVideoPlayback() {
          const time = tl ? tl.time() : 0
          videoRefs.current.forEach((video, i) => {
            if (!video) return
            const afterPreviousTransitionStarts = i === 0 || time > transitionStart(i)
            const beforeNextTransitionEnds = i === PROJECTS.length - 1 || time < transitionStart(i + 1) + WIPE_DURATION
            const onScreen = afterPreviousTransitionStarts && beforeNextTransitionEnds
            const shouldPlay = stageNearViewport && onScreen
            if (shouldPlay && video.paused) video.play().catch(() => {})
            else if (!shouldPlay && !video.paused) video.pause()
          })
        }

        tl = gsap.timeline({
          onUpdate: syncVideoPlayback,
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: `+=${300 * TIMELINE_LENGTH}%`,
            pin: true,
            anticipatePin: 1,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        })

        tl.to({}, { duration: TIMELINE_LENGTH }, 0)
        tl.fromTo(firstCard, { clipPath: windowFrom, y: () => cardCenterShift() }, { clipPath: windowTo, y: 0, ease: 'power2.inOut', duration: 0.3 }, 0)
          .fromTo(firstZoom, { scale: 1.3 }, { scale: 1, ease: 'power2.out', duration: 0.3 }, 0)
          .fromTo(frost, { '--frost-blur': isMobile ? '10px' : '18px', autoAlpha: 1 }, { '--frost-blur': '0px', autoAlpha: 0, ease: 'power2.inOut', duration: 0.26 }, 0)
          .fromTo(firstChars, { yPercent: 110 }, { yPercent: 0, ease: 'power3.out', duration: 0.12, stagger: 0.015 }, 0.16)
          .fromTo(firstIndex, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.12 }, 0.16)
          .fromTo(counter, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'power2.out', duration: 0.08 }, 0.16)
          .fromTo(counterTrack, { yPercent: counterStep }, { yPercent: 0, ease: 'power3.out', duration: 0.12 }, 0.16)
          .fromTo(firstDetails, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.14 }, 0.22)
          .to(firstZoom, { scale: 1.04, ease: 'none', duration: WIPE_START - 0.3 }, 0.3)

        for (let projectIndex = 1; projectIndex < PROJECTS.length; projectIndex += 1) {
          const start = transitionStart(projectIndex)
          const end = start + WIPE_DURATION
          const outgoingIndex = projectIndex - 1
          const outgoingFrame = frames[outgoingIndex]
          const incomingFrame = frames[projectIndex]
          const outgoingZoom = zooms[outgoingIndex]
          const incomingZoom = zooms[projectIndex]
          // ground layers start at project 1, so the incoming project's layer sits one slot lower
          const incomingGround = grounds[projectIndex - 1]
          const outgoingShade = shades[outgoingIndex]
          const outgoingInfo = infos[outgoingIndex]
          const incomingInfo = infos[projectIndex]
          const outgoingChars = Array.from(names[outgoingIndex].children)
          const incomingChars = Array.from(names[projectIndex].children)
          const incomingIndex = indexes[projectIndex]
          const incomingDetails = details[projectIndex]
          const driftDuration = projectIndex === PROJECTS.length - 1
            ? FINAL_HOLD
            : PROJECT_STEP - WIPE_DURATION

          tl.to(outgoingChars, { yPercent: -110, ease: 'power2.in', duration: 0.1, stagger: 0.01 }, start)
            .to(outgoingInfo, { autoAlpha: 0, y: -24, ease: 'power2.in', duration: 0.17 }, start)
            .fromTo(incomingGround, { clipPath: groundFrom }, { clipPath: groundTo, ease: 'power2.inOut', duration: WIPE_DURATION }, start)
            .fromTo(incomingFrame, { clipPath: wipeFrom }, { clipPath: wipeTo, ease: 'power2.inOut', duration: WIPE_DURATION }, start)
            .fromTo(incomingZoom, { scale: 1.15, yPercent: 8 }, { scale: 1, yPercent: 0, ease: 'power2.inOut', duration: WIPE_DURATION }, start)
            .to(outgoingZoom, { scale: 1.1, yPercent: -6, ease: 'power2.inOut', duration: WIPE_DURATION }, start)
            .to(outgoingShade, { opacity: 0.4, ease: 'power2.inOut', duration: WIPE_DURATION }, start)
            .to([outgoingFrame, incomingFrame], { scale: PULL_BACK_SCALE, ease: 'power2.inOut', duration: 0.17 }, start)
            .to(counter, {
              x: () => (PULL_BACK_SCALE - 1) * counterOffsetFromCardCenter().x,
              y: () => (PULL_BACK_SCALE - 1) * counterOffsetFromCardCenter().y,
              scale: PULL_BACK_SCALE,
              ease: 'power2.inOut',
              duration: 0.17,
            }, start)
            .to([outgoingFrame, incomingFrame], { scale: 1, ease: 'power2.inOut', duration: 0.18 }, start + 0.17)
            .to(counter, { x: 0, y: 0, scale: 1, ease: 'power2.inOut', duration: 0.18 }, start + 0.17)
            .to(counterTrack, { yPercent: -projectIndex * counterStep, ease: 'power2.inOut', duration: 0.15 }, start + 0.1)
            .fromTo(incomingInfo, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none', duration: 0.06 }, start + 0.15)
            .fromTo(incomingChars, { yPercent: 110 }, { yPercent: 0, ease: 'power3.out', duration: 0.12, stagger: 0.015 }, start + 0.19)
            .fromTo(incomingIndex, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.12 }, start + 0.19)
            .fromTo(incomingDetails, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.14 }, start + 0.25)
            .to(incomingZoom, { scale: 1.05, ease: 'none', duration: driftDuration }, end)
        }

        const idleObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              stageNearViewport = entry.isIntersecting
              syncVideoPlayback()
            }
          },
          { threshold: 0, rootMargin: '25% 0px' },
        )
        idleObserver.observe(stage)
        return () => idleObserver.disconnect()
      })

      return () => mm.revert()
    },
    { scope: stageRef },
  )

  return (
    <section className={styles.projects} aria-labelledby="projects-title">
      <header className={styles.header} ref={headerRef}>
        <p className={styles.eyebrow}>Selected work</p>
        <h2 id="projects-title" className={styles.title}>
          <span className={styles.titleMask}>
            <span className={styles.titleLine}>Lines we've drawn.</span>
          </span>
        </h2>
      </header>

      <div className={styles.stage} ref={stageRef}>
        {PROJECTS.slice(1).map((project, i) => (
          <div
            key={project.index}
            className={`${styles.ground} ${project.ground === 'light' ? styles.groundLight : styles.groundDark}`}
            ref={(node) => {
              groundRefs.current[i] = node
            }}
            aria-hidden="true"
          />
        ))}
        {PROJECTS.map((project, i) => (
          <article
            key={project.index}
            className={`${styles.panel} ${project.ground === 'light' ? styles.panelOnLight : ''}`}
            aria-labelledby={`project-${project.index}`}
          >
            <div
              className={styles.frame}
              ref={(node) => {
                frameRefs.current[i] = node
              }}
            >
              <div
                className={styles.mediaZoom}
                ref={(node) => {
                  zoomRefs.current[i] = node
                }}
              >
                <img
                  className={styles.poster}
                  src={`/media/${project.media}.jpg`}
                  alt=""
                  width={1280}
                  height={800}
                  loading="lazy"
                  decoding="async"
                />
                {allowVideo && (
                  <video
                    className={`${styles.video} ${liveVideos.has(i) ? styles.videoLive : ''}`}
                    ref={(node) => {
                      videoRefs.current[i] = node
                    }}
                    src={`/media/${project.media}.mp4`}
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-hidden="true"
                    onPlaying={() => markLive(i)}
                  />
                )}
              </div>
              {i === 0 && <div className={styles.frost} ref={frostRef} aria-hidden="true" />}
              <div
                className={styles.shade}
                ref={(node) => {
                  shadeRefs.current[i] = node
                }}
              />
            </div>
            <div
              className={styles.info}
              ref={(node) => {
                infoRefs.current[i] = node
              }}
            >
              <div className={styles.heading}>
                <span
                  className={styles.index}
                  ref={(node) => {
                    indexRefs.current[i] = node
                  }}
                >
                  {project.index}
                </span>
                <h3 id={`project-${project.index}`} className={styles.name} aria-label={project.name}>
                  <span className={styles.nameMask} aria-hidden="true">
                    <span
                      className={styles.nameLine}
                      ref={(node) => {
                        nameRefs.current[i] = node
                      }}
                    >
                      {project.name.split('').map((char, charIndex) => (
                        <span key={charIndex} className={styles.char}>{char}</span>
                      ))}
                    </span>
                  </span>
                </h3>
              </div>
              <div
                className={styles.details}
                ref={(node) => {
                  detailRefs.current[i] = node
                }}
              >
                <a className={styles.visit} href={project.url} target="_blank" rel="noopener">
                  <span>Visit site</span>
                  <svg className={styles.visitArrow} viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" />
                  </svg>
                </a>
              </div>
            </div>
          </article>
        ))}

        <div className={styles.counter} ref={counterRef} aria-hidden="true">
          <span className={styles.counterMask}>
            <span className={styles.counterTrack} ref={counterTrackRef}>
              {PROJECTS.map((project) => (
                <span key={project.index}>{project.index}</span>
              ))}
            </span>
          </span>
          <span className={styles.counterTotal}>/ {PROJECTS[PROJECTS.length - 1].index}</span>
        </div>
      </div>
    </section>
  )
}
