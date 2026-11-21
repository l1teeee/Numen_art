export type StripMetrics = {
  viewportHeight: number
  maxWidth: number
  maxHeight: number
  minRatio: number
  spread: number
}

export type TileBox = { y: number; width: number; height: number; scale: number }
export type StripTile = { aspect: number; sizeFactor: number }

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function tileMaxWidth(tile: StripTile, metrics: StripMetrics): number {
  return Math.min(metrics.maxWidth, metrics.maxHeight * tile.aspect) * tile.sizeFactor
}

// The anchor slides between tile centres so tiles stay touching as they resize.
export function layoutStrip(position: number, tiles: readonly StripTile[], metrics: StripMetrics): TileBox[] {
  if (tiles.length === 0) return []
  const boxes = tiles.map((tile, i) => {
    const wMax = tileMaxWidth(tile, metrics)
    const wMin = wMax * metrics.minRatio
    const d = i - position
    const g = Math.exp(-(d * d) / (2 * metrics.spread * metrics.spread))
    const width = wMin + (wMax - wMin) * g
    return { y: 0, width, height: width / tile.aspect, scale: width / wMax }
  })
  const k = clamp(Math.floor(position), 0, tiles.length - 1)
  const f = position - k
  const nextHalf = k + 1 < boxes.length ? boxes[k + 1].height / 2 : 0
  boxes[k].y = metrics.viewportHeight / 2 - boxes[k].height / 2 - f * (boxes[k].height / 2 + nextHalf)
  for (let i = k + 1; i < boxes.length; i++) boxes[i].y = boxes[i - 1].y + boxes[i - 1].height
  for (let i = k - 1; i >= 0; i--) boxes[i].y = boxes[i + 1].y - boxes[i].height
  return boxes
}
