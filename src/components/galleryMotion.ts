const ENTER_RISE_PX = 70
const ENTER_SCALE = 0.93
const REST_DRIFT_PX = 24
const EXIT_SCALE = 1.05

type GalleryMotionTiming = { enterAt: number; enterDuration: number; exitAt: number; exitDuration: number }

// Scrubbed choreography: the set settles into place, drifts while the section rests,
// and lifts away as the next section comes.
export function addGalleryMotion(timeline: gsap.core.Timeline, gallery: HTMLElement, timing: GalleryMotionTiming) {
  const set = gallery.querySelector<HTMLElement>('[data-gallery-prints]')
  if (!set) throw new Error('addGalleryMotion: the set of prints is missing')
  const { enterAt, enterDuration, exitAt, exitDuration } = timing

  timeline
    .fromTo(set, { y: ENTER_RISE_PX, scale: ENTER_SCALE }, { y: 0, scale: 1, ease: 'power2.out', duration: enterDuration }, enterAt)
    .to(set, { y: -REST_DRIFT_PX, ease: 'none', duration: exitAt - enterAt - enterDuration }, enterAt + enterDuration)
    .to(set, { scale: EXIT_SCALE, ease: 'power1.in', duration: exitDuration }, exitAt)
}
