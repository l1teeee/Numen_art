import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Gallery from './Gallery'
import { addGalleryMotion } from './galleryMotion'
import { addHeroMotion } from './heroMotion'
import { addServicesMotion } from './servicesMotion'
import { playIfAllowed } from './playIfAllowed'
import Hero from './Hero'
import LatinConcepts from './LatinConcepts'
import Services from './Services'
import styles from './IntroStage.module.css'

gsap.registerPlugin(useGSAP, ScrollTrigger)

// the mobile address bar showing/hiding must not trigger a refresh, which makes the pinned stage jump
ScrollTrigger.config({ ignoreMobileResize: true })

// One timeline second is one viewport height of scroll. Each section fades away completely
// before the next one starts to appear, so two sections never share the screen.
const FADE_OUT = 0.45
const FADE_IN = 0.45
const HERO_WIPE = 1.15
const HERO_OUT_AT = 1.75
const GALLERY_IN_AT = 2.25
const PRINTS_IN_AT = 2.35
const PRINTS_IN = 1
const GALLERY_OUT_AT = 5.25
const CONCEPTS_IN_AT = 5.75
const CONCEPTS_OUT_AT = 7.4
const SERVICES_IN_AT = 7.9
const SERVICE_LINES_IN_AT = 8
const EXIT_AT = 10.25
// Selected work must arrive this far before the pin ends: matches 60vh in Works.module.css.
const EXIT_DISSOLVE = 0.6
const TIMELINE_LENGTH = EXIT_AT + EXIT_DISSOLVE
// Re-blurring live video every scroll frame is too costly on phones, which only fade.
const BLUR_QUERY = '(min-width: 811px) and (pointer: fine)'
const OUTGOING_BLUR = 'blur(14px)'

export default function IntroStage() {
  const stageRef = useRef<HTMLDivElement>(null)
  const heroLayerRef = useRef<HTMLDivElement>(null)
  const galleryLayerRef = useRef<HTMLDivElement>(null)
  const conceptsLayerRef = useRef<HTMLDivElement>(null)
  const servicesLayerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const stage = stageRef.current
      const heroLayer = heroLayerRef.current
      const galleryLayer = galleryLayerRef.current
      const conceptsLayer = conceptsLayerRef.current
      const servicesLayer = servicesLayerRef.current
      if (!stage || !heroLayer || !galleryLayer || !conceptsLayer || !servicesLayer) return
      const layers = [heroLayer, galleryLayer, conceptsLayer, servicesLayer]

      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        let stageNearViewport = true
        // set once the timeline exists: ScrollTrigger can update during construction
        let setServicesBoiling: ((boiling: boolean) => void) | null = null

        // only the layers on screen decode their video and run their idle animations
        function syncLayers() {
          const stageShowing = stageNearViewport && Number(gsap.getProperty(stage, 'opacity')) > 0.01
          for (const layer of layers) {
            const showing = stageShowing && Number(gsap.getProperty(layer, 'opacity')) > 0.01
            layer.toggleAttribute('data-offscreen', !showing)
            if (layer === servicesLayer) setServicesBoiling?.(showing)
            for (const video of layer.querySelectorAll('video')) {
              if (showing && video.paused) playIfAllowed(video)
              else if (!showing && !video.paused) video.pause()
            }
          }
        }

        gsap.set([galleryLayer, conceptsLayer, servicesLayer], { autoAlpha: 0 })
        const canBlur = window.matchMedia(BLUR_QUERY).matches
        if (canBlur) gsap.set(layers, { filter: 'blur(0px)' })
        const softenOut = canBlur ? { filter: OUTGOING_BLUR } : {}

        const timeline = gsap.timeline({
          onUpdate: syncLayers,
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: `+=${Math.round(TIMELINE_LENGTH * 100)}%`,
            pin: true,
            anticipatePin: 1,
            scrub: 0.9,
            invalidateOnRefresh: true,
          },
        })

        timeline
          .to({}, { duration: TIMELINE_LENGTH }, 0)
          .to(heroLayer, { autoAlpha: 0, ...softenOut, ease: 'none', duration: FADE_OUT }, HERO_OUT_AT)
          .to(galleryLayer, { autoAlpha: 1, ease: 'none', duration: FADE_IN }, GALLERY_IN_AT)
          .to(galleryLayer, { autoAlpha: 0, ...softenOut, ease: 'none', duration: FADE_OUT }, GALLERY_OUT_AT)
          .to(conceptsLayer, { autoAlpha: 1, ease: 'none', duration: FADE_IN }, CONCEPTS_IN_AT)
          .to(conceptsLayer, { autoAlpha: 0, ...softenOut, ease: 'none', duration: FADE_OUT }, CONCEPTS_OUT_AT)
          .to(servicesLayer, { autoAlpha: 1, ease: 'none', duration: FADE_IN }, SERVICES_IN_AT)
          .to(servicesLayer, { autoAlpha: 0, ...softenOut, ease: 'none', duration: EXIT_DISSOLVE / 2 }, EXIT_AT)
          .to(stage, { autoAlpha: 0, ease: 'none', duration: EXIT_DISSOLVE / 2 }, EXIT_AT + EXIT_DISSOLVE / 2)

        const stopHeroMotion = addHeroMotion(timeline, heroLayer, {
          duration: HERO_WIPE,
        })

        addGalleryMotion(timeline, galleryLayer, {
          enterAt: PRINTS_IN_AT,
          enterDuration: PRINTS_IN,
          exitAt: GALLERY_OUT_AT,
          exitDuration: FADE_OUT,
        })

        setServicesBoiling = addServicesMotion(timeline, servicesLayer, {
          enterAt: SERVICE_LINES_IN_AT,
          restUntil: EXIT_AT,
        })

        const nearObserver = new IntersectionObserver(
          ([entry]) => {
            stageNearViewport = entry.isIntersecting
            syncLayers()
          },
          { rootMargin: '25% 0px' },
        )
        nearObserver.observe(stage)
        return () => {
          stopHeroMotion()
          nearObserver.disconnect()
        }
      })

      return () => mm.revert()
    },
    { scope: stageRef },
  )

  return (
    <div className={styles.stage} ref={stageRef}>
      <div className={styles.layer} ref={heroLayerRef}>
        <Hero />
      </div>
      <div className={styles.layer} ref={galleryLayerRef}>
        <Gallery />
      </div>
      <div className={styles.layer} ref={conceptsLayerRef}>
        <LatinConcepts />
      </div>
      <div className={styles.layer} ref={servicesLayerRef}>
        <Services />
      </div>
    </div>
  )
}
