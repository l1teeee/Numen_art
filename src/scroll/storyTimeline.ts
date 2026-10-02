export type StoryMeasure = {
  heroTop: number
  heroHeight: number
  whiteTop: number
  viewportHeight: number
}

export type StoryTimeline = {
  frozen: boolean
  open: number
  extend: number
  linesVisible: boolean
}

export type StoryFrame = StoryMeasure & { timeline: StoryTimeline }

const OPEN_SCROLL_FRACTION = 0.25
const TIP_ARRIVAL_VIEWPORT_FRACTION = 0.85
const SCROLL_SMOOTHING_S = 0.12
const SCROLL_SNAP_EPSILON = 0.0005

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value)
}

export function dampTowards(current: number, target: number, dtSeconds: number): number {
  const next = target + (current - target) * Math.exp(-dtSeconds / SCROLL_SMOOTHING_S)
  // Without the snap the eased open/extend values never land exactly on their targets, so an unchanged frozen frame would never pass the redraw-skip equality checks.
  return Math.abs(next - target) < SCROLL_SNAP_EPSILON ? target : next
}

export function storyTimelineAt(measure: StoryMeasure): StoryTimeline {
  const scrolled = Math.max(0, -measure.heroTop)
  const openProgress = scrolled / (measure.heroHeight * OPEN_SCROLL_FRACTION)
  const whiteOffset = measure.whiteTop - measure.heroTop
  const arrivalScroll = whiteOffset - measure.viewportHeight * TIP_ARRIVAL_VIEWPORT_FRACTION
  // The tip moves in step with the scroll, like a pen drawing just ahead of the reader.
  const extend = arrivalScroll <= 0 ? 1 : clamp01(scrolled / arrivalScroll)

  return {
    frozen: scrolled > 0,
    open: smoothstep(clamp01(openProgress)),
    extend,
    linesVisible: measure.whiteTop > 0,
  }
}
