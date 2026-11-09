import gsap from 'gsap'

const LINE_FADE = 0.25
const LINE_STAGGER = 0.11
const LINE_RISE_PX = 16
const INK_DURATION = 0.5
const INK_WET_SCALE = 16
const INK_SETTLED_SCALE = 0.7
const COLUMN_DRIFT_PX = 30
// Stop-motion steps keep the titles' strokes alive without ever moving the letters far.
const BOIL_SEEDS = [7, 12, 19, 26]
const BOIL_STEP_S = 0.16

type ServicesMotionTiming = { enterAt: number; restUntil: number }

// Scrubbed choreography: lines surface one by one, each title's ink starts wet and settles
// into a legible stroke, and the column drifts slowly while the section rests.
// Returns the switch for the titles' idle boil.
export function addServicesMotion(timeline: gsap.core.Timeline, services: HTMLElement, timing: ServicesMotionTiming) {
  const column = services.querySelector<HTMLElement>('[data-services-column]')
  if (!column) throw new Error('addServicesMotion: the column is missing')
  const lines = gsap.utils.toArray<HTMLElement>('[data-services-line]', services)
  const titles = gsap.utils.toArray<HTMLElement>('[data-services-title]', services)
  const displacements = gsap.utils.toArray<SVGElement>('[data-ink-displacement]', services)
  const noises = gsap.utils.toArray<SVGElement>('[data-ink-noise]', services)
  const { enterAt, restUntil } = timing

  timeline
    .fromTo(
      lines,
      { autoAlpha: 0, y: LINE_RISE_PX },
      { autoAlpha: 1, y: 0, ease: 'power2.out', duration: LINE_FADE, stagger: LINE_STAGGER },
      enterAt,
    )
    .fromTo(column, { y: COLUMN_DRIFT_PX }, { y: -COLUMN_DRIFT_PX, ease: 'none', duration: restUntil - enterAt }, enterAt)

  titles.forEach((title, i) => {
    timeline.fromTo(
      displacements[i],
      { attr: { scale: INK_WET_SCALE } },
      { attr: { scale: INK_SETTLED_SCALE }, ease: 'power2.out', duration: INK_DURATION },
      enterAt + lines.indexOf(title) * LINE_STAGGER,
    )
  })

  const boil = gsap.timeline({ repeat: -1, paused: true })
  BOIL_SEEDS.forEach((seed, i) => boil.set(noises, { attr: { seed } }, i * BOIL_STEP_S))
  boil.set({}, {}, BOIL_SEEDS.length * BOIL_STEP_S)

  return (boiling: boolean) => {
    if (boiling) boil.play()
    else boil.pause()
  }
}
