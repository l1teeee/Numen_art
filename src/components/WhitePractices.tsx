import { useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import styles from './WhitePractices.module.css'

gsap.registerPlugin(useGSAP, ScrollTrigger)

// the mobile address bar showing/hiding must not trigger a refresh, which makes the pinned stage jump
ScrollTrigger.config({ ignoreMobileResize: true })

const PRACTICES = [
  { index: '01', title: 'Brand', description: 'Identities with a pulse - naming, systems and art direction.' },
  { index: '02', title: 'Motion', description: 'Design that moves - film, product motion, title sequences.' },
  { index: '03', title: 'Experience', description: 'Spaces and screens people step into - web, installations, live.' },
]

// three gestures the protagonist line morphs between as the practices swap - each string is
// "M x,y C x,y x,y x,y C x,y x,y x,y C x,y x,y x,y" (same command/number count) so gsap can
// tween the raw `d` attribute directly, no morph plugin needed. Every gesture starts and ends
// off-canvas (x<0, x>1000 or y>700), and consecutive gestures share their entry/exit height
// (Brand exits y330 -> Motion enters y330; Motion exits y300 -> Experience enters y300) so the
// stroke reads as one continuous line crossing all three screens, not three separate marks.
const LINE_SHAPES = [
  // Brand: enters off-canvas left at y~140, loops once around the title zone (the embrace), exits off-canvas right at y~330
  'M-60,140 C140,10 380,0 520,90 C640,160 560,280 360,270 C480,300 780,300 1060,330',
  // Motion: enters off-canvas left at y~330 (matches Brand's exit), flows as the wave through the center, exits off-canvas right at y~300
  'M-40,330 C140,150 320,510 500,330 C680,150 860,470 980,320 C1040,280 1070,290 1100,300',
  // Experience: enters off-canvas left at y~300 (matches Motion's exit), sweeps right and curves downward, exits off-canvas bottom at x~500
  'M-60,300 C160,220 300,340 480,380 C680,430 820,560 680,650 C600,700 540,730 500,740',
]

// thin echo of the panel-2 wave, offset ~24px below the main path - yoyos on its own
// short timer so it stays alive without touching the scrubbed morph timeline above
const ECHO_WAVE = 'M-20,404 C160,224 340,584 520,404 C700,224 860,584 1020,404 C1080,314 1090,294 1100,274'
const ECHO_WAVE_ALT = 'M-20,404 C160,264 340,544 520,404 C700,264 860,544 1020,404 C1080,324 1090,284 1100,274'

// scattered dust for panel 3 only - positions curated once, never touching the title/description bands
const DUST = [
  { top: 18, left: 42, dur: 7.6, delay: -1.2 },
  { top: 64, left: 52, dur: 9.1, delay: -4.3 },
  { top: 40, left: 60, dur: 6.8, delay: -2.9 },
  { top: 78, left: 38, dur: 8.4, delay: -0.6 },
  { top: 30, left: 70, dur: 10.2, delay: -6.1 },
  { top: 55, left: 33, dur: 7.2, delay: -3.4 },
  { top: 20, left: 80, dur: 9.7, delay: -1.9 },
  { top: 70, left: 62, dur: 6.5, delay: -5.2 },
  { top: 46, left: 46, dur: 8.9, delay: -2.1 },
]

// full-bleed Ken Burns duration per panel - staggered so the three backgrounds never breathe in sync
const KEN_BURNS_DURATIONS = [20, 24, 28]

const TRANSITION_DURATION = 0.12

const MOBILE_QUERY = '(max-width: 810px), (pointer: coarse)'

export default function WhitePractices() {
  const stageRef = useRef<HTMLDivElement>(null)
  const lineWrapRef = useRef<SVGGElement>(null)
  const linePathRef = useRef<SVGPathElement>(null)
  const echoPathRef = useRef<SVGPathElement>(null)
  const ghostRefs = useRef<(HTMLSpanElement | null)[]>([])
  const ghostFloatRefs = useRef<(HTMLSpanElement | null)[]>([])
  const titleRefs = useRef<(HTMLHeadingElement | null)[]>([])
  const titleFloatRefs = useRef<(HTMLSpanElement | null)[]>([])
  const descRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const videoLayerRefs = useRef<(HTMLDivElement | null)[]>([])
  const videoZoomRefs = useRef<(HTMLDivElement | null)[]>([])
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const [loaded, setLoaded] = useState<[boolean, boolean, boolean]>([false, false, false])
  const [allowVideo] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  function markLoaded(index: number) {
    // a 404 on the not-yet-dropped video just never fires onCanPlay, so the
    // aurora fallback stays visible behind that panel until the real file lands
    setLoaded((prev) => {
      const next: [boolean, boolean, boolean] = [...prev]
      next[index] = true
      return next
    })
  }

  useGSAP(
    () => {
      const stage = stageRef.current
      if (!stage) return

      const mm = gsap.matchMedia()
      // snap fights touch momentum and makes the pinned stage jerk on phones
      const isMobile = window.matchMedia(MOBILE_QUERY).matches

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // the line never sits frozen, even while the scrubbed sequence is idle
        gsap.to(lineWrapRef.current, { y: 8, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 })

        // the panel-2 wave echo lives on its own clock, independent of the scrubbed morph
        gsap.to(echoPathRef.current, { attr: { d: ECHO_WAVE_ALT }, duration: 4, ease: 'sine.inOut', yoyo: true, repeat: -1 })

        // every panel's full-bleed video breathes with a slow continuous zoom (Ken Burns)
        videoZoomRefs.current.forEach((el, idx) => {
          if (!el) return
          gsap.to(el, { scale: 1.06, duration: KEN_BURNS_DURATIONS[idx], ease: 'sine.inOut', yoyo: true, repeat: -1 })
        })

        // panel 1's ghost numeral breathes too
        gsap.to(ghostFloatRefs.current[0], { scale: 1.03, duration: 12, ease: 'sine.inOut', yoyo: true, repeat: -1 })

        // idle float for every panel's ghost numeral, title and description - autonomous,
        // never pointer-linked - staggered so the nine elements never breathe in sync
        const idleTargets = [...ghostFloatRefs.current, ...titleFloatRefs.current, ...descRefs.current]
        idleTargets.forEach((el, idx) => {
          if (!el) return
          gsap.to(el, {
            y: idx % 2 === 0 ? 8 : -7,
            duration: 7 + (idx % 5) * 0.8,
            delay: idx * 0.35,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          })
        })

        // panels 2 and 3 start below and invisible, waiting for their scroll turn
        for (let i = 1; i < PRACTICES.length; i++) {
          gsap.set(ghostRefs.current[i], { y: 80, opacity: 0 })
          gsap.set(titleRefs.current[i], { y: 60, opacity: 0 })
          gsap.set(descRefs.current[i], { opacity: 0 })
        }

        // each panel's full-bleed video must live and die with that panel - only Brand's
        // starts visible, Motion's and Experience's (and the echo) wait for their turn
        gsap.set(videoLayerRefs.current[0], { autoAlpha: 1 })
        gsap.set(videoLayerRefs.current[1], { autoAlpha: 0 })
        gsap.set(videoLayerRefs.current[2], { autoAlpha: 0 })
        gsap.set(echoPathRef.current, { autoAlpha: 0 })

        let stageNearViewport = false

        // only the video whose layer is actually visible decodes - the other two stay paused
        function syncVideoPlayback() {
          videoRefs.current.forEach((video, i) => {
            if (!video) return
            const layerVisible = stageNearViewport && Number(gsap.getProperty(videoLayerRefs.current[i], 'opacity')) > 0.01
            if (layerVisible && video.paused) video.play().catch(() => {})
            else if (!layerVisible && !video.paused) video.pause()
          })
        }

        // onUpdate sits on the timeline itself so it follows the scrubbed progress, not the scroll event
        const tl = gsap.timeline({
          onUpdate: syncVideoPlayback,
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: '+=400%',
            pin: true,
            anticipatePin: 1,
            scrub: 0.9,
            snap: isMobile
              ? undefined
              : { snapTo: [0, 0.49, 1], directional: false, duration: { min: 0.2, max: 0.6 }, delay: 0.15, ease: 'power1.inOut' },
          },
        })

        // decode cost of full-bleed videos adds up - nothing plays while the pinned stage is
        // off-screen, and while it is near only the panel whose layer is visible plays
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

        // Brand -> Motion
        tl.to(ghostRefs.current[0], { y: -80, opacity: 0, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.28)
          .to(titleRefs.current[0], { y: -60, opacity: 0, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.28)
          .to(descRefs.current[0], { opacity: 0, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.28)
          .to(videoLayerRefs.current[0], { autoAlpha: 0, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.28)
          .to(linePathRef.current, { attr: { d: LINE_SHAPES[1] }, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.28)
          .to(ghostRefs.current[1], { y: 0, opacity: 1, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.28)
          .to(titleRefs.current[1], { y: 0, opacity: 1, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.28)
          .to(descRefs.current[1], { opacity: 1, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.28)
          .to(videoLayerRefs.current[1], { autoAlpha: 1, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.28)
          .to(echoPathRef.current, { autoAlpha: 1, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.28)
          // Motion -> Experience
          .to(ghostRefs.current[1], { y: -80, opacity: 0, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.58)
          .to(titleRefs.current[1], { y: -60, opacity: 0, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.58)
          .to(descRefs.current[1], { opacity: 0, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.58)
          .to(videoLayerRefs.current[1], { autoAlpha: 0, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.58)
          .to(echoPathRef.current, { autoAlpha: 0, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.58)
          .to(linePathRef.current, { attr: { d: LINE_SHAPES[2] }, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.58)
          .to(ghostRefs.current[2], { y: 0, opacity: 1, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.58)
          .to(titleRefs.current[2], { y: 0, opacity: 1, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.58)
          .to(descRefs.current[2], { opacity: 1, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.58)
          .to(videoLayerRefs.current[2], { autoAlpha: 1, ease: 'power2.inOut', duration: TRANSITION_DURATION }, 0.58)

        return () => idleObserver.disconnect()
      })

      return () => mm.revert()
    },
    { scope: stageRef },
  )

  return (
    <div className={`${styles.stage} ${allowVideo ? styles.videoActive : ''}`} ref={stageRef}>
      {allowVideo && (
        // panels go position:static under reduced motion, which would paint this
        // absolutely-positioned layer above their text - skip it in that case
        <div className={styles.aurora} aria-hidden="true">
          <div className={`${styles.auroraBlob} ${styles.auroraBlob1}`} />
          <div className={`${styles.auroraBlob} ${styles.auroraBlob2}`} />
          <div className={`${styles.auroraBlob} ${styles.auroraBlob3}`} />
          <div className={`${styles.auroraBlob} ${styles.auroraBlob4}`} />
          <div className={`${styles.auroraBlob} ${styles.auroraBlob5}`} />
        </div>
      )}

      {PRACTICES.map((practice, i) => (
        <div key={practice.index} className={`${styles.panel} ${styles[`panel${i + 1}`]}`}>
          {allowVideo && (
            <div
              className={styles.videoBg}
              ref={(node) => {
                videoLayerRefs.current[i] = node
              }}
            >
              <div
                className={styles.videoZoom}
                ref={(node) => {
                  videoZoomRefs.current[i] = node
                }}
              >
                <video
                  ref={(node) => {
                    videoRefs.current[i] = node
                  }}
                  src={`/media/practice-0${i + 1}.mp4`}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                  className={`${styles.video} ${loaded[i] ? styles.videoLoaded : ''}`}
                  onCanPlay={() => markLoaded(i)}
                />
              </div>
              <div className={styles.veil} />
              <div className={styles.filmGrain} aria-hidden="true" />
            </div>
          )}

          <span
            className={styles.ghost}
            ref={(node) => {
              ghostRefs.current[i] = node
            }}
          >
            <span
              className={styles.ghostFloat}
              ref={(node) => {
                ghostFloatRefs.current[i] = node
              }}
            >
              {practice.index}
            </span>
          </span>

          {i === 2 && (
            <div className={styles.dust} aria-hidden="true">
              {DUST.map((dot, di) => (
                <span
                  key={di}
                  className={styles.dustDot}
                  style={{
                    top: `${dot.top}%`,
                    left: `${dot.left}%`,
                    animationDuration: `${dot.dur}s, ${dot.dur * 1.3}s`,
                    animationDelay: `${dot.delay}s, ${dot.delay}s`,
                  }}
                />
              ))}
            </div>
          )}

          <div className={styles.titleMask}>
            <h3
              className={styles.title}
              ref={(node) => {
                titleRefs.current[i] = node
              }}
            >
              <span
                className={styles.titleFloat}
                ref={(node) => {
                  titleFloatRefs.current[i] = node
                }}
              >
                {practice.title}
              </span>
            </h3>
          </div>
          <p
            className={styles.description}
            ref={(node) => {
              descRefs.current[i] = node
            }}
          >
            {practice.description}
          </p>
        </div>
      ))}

      <svg className={styles.lineLayer} viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
        <g ref={lineWrapRef}>
          <path ref={linePathRef} d={LINE_SHAPES[0]} className={styles.linePath} />
          <path ref={echoPathRef} d={ECHO_WAVE} className={`${styles.linePath} ${styles.lineEcho}`} />
        </g>
      </svg>
    </div>
  )
}
