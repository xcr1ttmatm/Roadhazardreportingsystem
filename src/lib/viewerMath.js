// src/lib/viewerMath.js
// The geometry behind the photo viewer (zoom toward the cursor, drag limits, pinch).
// No browser code in here, so it can be tested on its own.
//
// Coordinates: x / y are how far the photo has been moved from the middle of the screen, in pixels.
// "Centre-relative" points (px, py) are measured from the middle of the screen too.

export const MIN_SCALE = 1
export const MAX_SCALE = 6

export function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value)) + 0 // "+ 0" turns a stray -0 into a plain 0
}

/**
 * Stops a zoomed photo from being dragged out of view. imgW/imgH are the photo's size at
 * scale 1; stageW/stageH are the viewing area. While the zoomed photo is smaller than the
 * viewing area there is nothing to pan, so it stays centred.
 */
export function clampPan({ x, y }, scale, imgW, imgH, stageW, stageH) {
  const limitX = Math.max(0, (imgW * scale - stageW) / 2)
  const limitY = Math.max(0, (imgH * scale - stageH) / 2)
  return { x: clamp(x, -limitX, limitX), y: clamp(y, -limitY, limitY) }
}

/** Zooms to newScale while keeping the point under the cursor (px, py) where it is. */
export function zoomAtPoint(view, newScale, px, py) {
  const scale = clamp(newScale, MIN_SCALE, MAX_SCALE)
  const ratio = scale / view.scale
  return { scale, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio }
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}