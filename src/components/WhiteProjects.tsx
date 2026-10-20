import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import styles from './WhiteProjects.module.css'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const PROJECTS = [
  {
    index: '01',
    name: 'XIT',
    summary: 'Systems in motion. A generative studio site where one living field is redrawn in realtime as ASCII, dots, halftone and dither.',
    url: 'https://xit-nu.vercel.app/',
    media: 'project-xit',
    tone: 'light',
  },
  {
    index: '02',
    name: 'Memoria',
    summary: 'Memories that fade into light. A scroll poem in charcoal and dust that reveals itself one line at a time.',
    url: 'https://cosmos-carboncillo.vercel.app/',
    media: 'project-memoria',
    tone: 'dark',
  },
]

const MOBILE_QUERY = '(max-width: 810px), (pointer: coarse)'

// the spacer tween fixes the timeline length at 1 so these positions are fractions of the pinned scroll
const EXPAND_END = 0.3
const WIPE_START = 0.45
const WIPE_END = 0.8

// explicit from/to strings keep matching number and unit patterns because browsers shorten computed clip-paths
const WINDOW_INSET_DESKTOP = 'inset(14% 18% 14% 18% round 32px)'
const WINDOW_INSET_MOBILE = 'inset(20% 6% 20% 6% round 24px)'
const FULL_INSET = 'inset(0% 0% 0% 0% round 0px)'
const WIPE_FROM = 'inset(100% 0% 0% 0% round 32px 32px 0px 0px)'
const WIPE_TO = 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)'

// the counter sits over one project at a time - its ink follows that project's tone
function counterInkFor(tone: string): string {
  return tone === 'light' ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.75)'
}

export default function WhiteProjects() {
  const headerRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<(HTMLElement | null)[]>([])
  const frameRefs = useRef<(HTMLDivElement | null)[]>([])
  const zoomRefs = useRef<(HTMLDivElement | null)[]>([])
  const shadeRefs = useRef<(HTMLDivElement | null)[]>([])
  const infoRefs = useRef<(HTMLDivElement | null)[]>([])
  const nameRefs = useRef<(HTMLSpanElement | null)[]>([])
  const detailRefs = useRef<(HTMLDivElement | null)[]>([])
  const counterTrackRef = useRef<HTMLSpanElement>(null)
  const counterRef = useRef<HTMLDivElement>(null)
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
        const [firstPanel] = panelRefs.current
        const [firstFrame, secondFrame] = frameRefs.current
        const [firstZoom, secondZoom] = zoomRefs.current
        const [firstShade] = shadeRefs.current
        const [firstInfo] = infoRefs.current
        const [firstName, secondName] = nameRefs.current
        const [firstDetails, secondDetails] = detailRefs.current
        const counterTrack = counterTrackRef.current
        const counter = counterRef.current

        if (
          !firstPanel || !firstFrame || !secondFrame || !firstZoom || !secondZoom ||
          !firstShade || !firstInfo || !firstName || !secondName ||
          !firstDetails || !secondDetails || !counterTrack || !counter
        ) return

        let stageNearViewport = false
        // scrolltrigger can update during construction, before the timeline assignment completes
        let tl: gsap.core.Timeline | null = null

        // only the projects actually on screen decode their loops
        function syncVideoPlayback() {
          const progress = tl ? tl.progress() : 0
          videoRefs.current.forEach((video, i) => {
            if (!video) return
            const onScreen = i === 0 ? progress < WIPE_END : progress > WIPE_START
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
            end: '+=300%',
            pin: true,
            anticipatePin: 1,
            scrub: 1,
          },
        })

        tl.to({}, { duration: 1 }, 0)
        // 01 opens from a rounded window to full screen, its text arriving as it lands
        tl.fromTo(firstFrame, { clipPath: isMobile ? WINDOW_INSET_MOBILE : WINDOW_INSET_DESKTOP }, { clipPath: FULL_INSET, ease: 'power2.inOut', duration: EXPAND_END }, 0)
          .fromTo(firstZoom, { scale: 1.15 }, { scale: 1, ease: 'power2.inOut', duration: EXPAND_END }, 0)
          .fromTo(firstName, { yPercent: 110 }, { yPercent: 0, ease: 'power3.out', duration: 0.16 }, 0.18)
          .fromTo(firstDetails, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.14 }, 0.22)
          // 02 rises over it with a curved leading edge while 01 recedes into the dark
          .to(firstInfo, { autoAlpha: 0, y: -40, ease: 'power2.in', duration: 0.17 }, WIPE_START)
          .to(firstPanel, { scale: 0.92, borderRadius: isMobile ? 24 : 32, ease: 'power2.inOut', duration: WIPE_END - WIPE_START }, WIPE_START)
          .to(firstShade, { opacity: 0.6, ease: 'power2.inOut', duration: WIPE_END - WIPE_START }, WIPE_START)
          .fromTo(secondFrame, { clipPath: WIPE_FROM }, { clipPath: WIPE_TO, ease: 'power2.inOut', duration: WIPE_END - WIPE_START }, WIPE_START)
          .fromTo(secondZoom, { scale: 1.15, yPercent: 8 }, { scale: 1, yPercent: 0, ease: 'power2.inOut', duration: WIPE_END - WIPE_START }, WIPE_START)
          .fromTo(counterTrack, { yPercent: 0 }, { yPercent: -50, ease: 'power2.inOut', duration: 0.15 }, 0.55)
          .fromTo(counter, { color: counterInkFor(PROJECTS[0].tone) }, { color: counterInkFor(PROJECTS[1].tone), ease: 'power2.inOut', duration: 0.15 }, 0.55)
          .fromTo(secondName, { yPercent: 110 }, { yPercent: 0, ease: 'power3.out', duration: 0.16 }, 0.66)
          .fromTo(secondDetails, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.14 }, 0.7)

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
        {PROJECTS.map((project, i) => (
          <article
            key={project.index}
            className={`${styles.panel} ${project.tone === 'light' ? styles.panelLight : ''}`}
            ref={(node) => {
              panelRefs.current[i] = node
            }}
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
              <div className={styles.veil} />
              <div
                className={styles.info}
                ref={(node) => {
                  infoRefs.current[i] = node
                }}
              >
                <div className={styles.heading}>
                  <span className={styles.index}>{project.index}</span>
                  <h3 id={`project-${project.index}`} className={styles.name}>
                    <span className={styles.nameMask}>
                      <span
                        className={styles.nameLine}
                        ref={(node) => {
                          nameRefs.current[i] = node
                        }}
                      >
                        {project.name}
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
                  <p className={styles.summary}>{project.summary}</p>
                  <a className={styles.visit} href={project.url} target="_blank" rel="noopener">
                    <span>Visit site</span>
                    <svg className={styles.visitArrow} viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            <div
              className={styles.shade}
              ref={(node) => {
                shadeRefs.current[i] = node
              }}
            />
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
