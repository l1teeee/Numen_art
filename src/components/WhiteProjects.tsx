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
    ground: 'dark',
  },
  {
    index: '02',
    name: 'Memoria',
    summary: 'Memories that fade into light. A scroll poem in charcoal and dust that reveals itself one line at a time.',
    url: 'https://cosmos-carboncillo.vercel.app/',
    media: 'project-memoria',
    ground: 'light',
  },
]

const MOBILE_QUERY = '(max-width: 810px), (pointer: coarse)'

// the spacer tween fixes the timeline length at 1 so these positions are fractions of the pinned scroll
const WIPE_START = 0.45
const WIPE_END = 0.8
const PULL_BACK_SCALE = 0.94

export default function WhiteProjects() {
  const headerRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const groundRef = useRef<HTMLDivElement>(null)
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
        const [firstFrame, secondFrame] = frameRefs.current
        const [firstZoom, secondZoom] = zoomRefs.current
        const frost = frostRef.current
        const [firstShade] = shadeRefs.current
        const [firstInfo, secondInfo] = infoRefs.current
        const [firstName, secondName] = nameRefs.current
        const [firstIndex, secondIndex] = indexRefs.current
        const [firstDetails, secondDetails] = detailRefs.current
        const counter = counterRef.current
        const counterTrack = counterTrackRef.current
        const ground = groundRef.current
        const firstPanel = firstFrame?.parentElement

        if (
          !firstFrame || !secondFrame || !firstZoom || !secondZoom || !frost ||
          !firstShade || !firstInfo || !secondInfo || !firstName || !secondName ||
          !firstIndex || !secondIndex || !firstDetails || !secondDetails || !counter || !counterTrack || !ground || !firstPanel
        ) return

        const firstCard = firstFrame
        const panel = firstPanel
        const counterElement = counter
        const firstChars = Array.from(firstName.children)
        const secondChars = Array.from(secondName.children)

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
            invalidateOnRefresh: true,
          },
        })

        tl.to({}, { duration: 1 }, 0)
        tl.fromTo(firstFrame, { clipPath: windowFrom, y: () => cardCenterShift() }, { clipPath: windowTo, y: 0, ease: 'power2.inOut', duration: 0.3 }, 0)
          .fromTo(firstZoom, { scale: 1.3 }, { scale: 1, ease: 'power2.out', duration: 0.3 }, 0)
          .fromTo(frost, { '--frost-blur': isMobile ? '10px' : '18px', autoAlpha: 1 }, { '--frost-blur': '0px', autoAlpha: 0, ease: 'power2.inOut', duration: 0.26 }, 0)
          .fromTo(firstChars, { yPercent: 110 }, { yPercent: 0, ease: 'power3.out', duration: 0.12, stagger: 0.015 }, 0.16)
          .fromTo(firstIndex, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.12 }, 0.16)
          .fromTo(counter, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'power2.out', duration: 0.08 }, 0.16)
          .fromTo(counterTrack, { yPercent: 50 }, { yPercent: 0, ease: 'power3.out', duration: 0.12 }, 0.16)
          .fromTo(firstDetails, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.14 }, 0.22)
          .to(firstZoom, { scale: 1.04, ease: 'none', duration: WIPE_START - 0.3 }, 0.3)
          .to(firstChars, { yPercent: -110, ease: 'power2.in', duration: 0.1, stagger: 0.01 }, WIPE_START)
          .to(firstInfo, { autoAlpha: 0, y: -24, ease: 'power2.in', duration: 0.17 }, WIPE_START)
          .fromTo(ground, { clipPath: groundFrom }, { clipPath: groundTo, ease: 'power2.inOut', duration: WIPE_END - WIPE_START }, WIPE_START)
          .fromTo(secondFrame, { clipPath: wipeFrom }, { clipPath: wipeTo, ease: 'power2.inOut', duration: WIPE_END - WIPE_START }, WIPE_START)
          .fromTo(secondZoom, { scale: 1.15, yPercent: 8 }, { scale: 1, yPercent: 0, ease: 'power2.inOut', duration: WIPE_END - WIPE_START }, WIPE_START)
          .to(firstZoom, { scale: 1.1, yPercent: -6, ease: 'power2.inOut', duration: WIPE_END - WIPE_START }, WIPE_START)
          .to(firstShade, { opacity: 0.4, ease: 'power2.inOut', duration: WIPE_END - WIPE_START }, WIPE_START)
          .to([firstFrame, secondFrame], { scale: PULL_BACK_SCALE, ease: 'power2.inOut', duration: 0.17 }, WIPE_START)
          .to(counter, {
            x: () => (PULL_BACK_SCALE - 1) * counterOffsetFromCardCenter().x,
            y: () => (PULL_BACK_SCALE - 1) * counterOffsetFromCardCenter().y,
            scale: PULL_BACK_SCALE,
            ease: 'power2.inOut',
            duration: 0.17,
          }, WIPE_START)
          .to([firstFrame, secondFrame], { scale: 1, ease: 'power2.inOut', duration: 0.18 }, 0.62)
          .to(counter, { x: 0, y: 0, scale: 1, ease: 'power2.inOut', duration: 0.18 }, 0.62)
          .to(counterTrack, { yPercent: -50, ease: 'power2.inOut', duration: 0.15 }, 0.55)
          .fromTo(secondInfo, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none', duration: 0.06 }, 0.6)
          .fromTo(secondChars, { yPercent: 110 }, { yPercent: 0, ease: 'power3.out', duration: 0.12, stagger: 0.015 }, 0.64)
          .fromTo(secondIndex, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.12 }, 0.64)
          .fromTo(secondDetails, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.14 }, 0.7)
          .to(secondZoom, { scale: 1.05, ease: 'none', duration: 1 - WIPE_END }, WIPE_END)

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
        <div className={styles.ground} ref={groundRef} aria-hidden="true" />
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
                <p className={styles.summary}>{project.summary}</p>
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
