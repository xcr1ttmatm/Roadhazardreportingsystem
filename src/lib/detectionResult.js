// src/lib/detectionResult.js
//
// Shared helpers for the boxes the trained YOLOv8 model produces. Boxes are
// stored as fractions of the photo (0..1) and are saved with the report in
// `hazard_detection_results.detections`.

// Must stay in sync with the labels in localDetector.js / hazardTypes.js.
export const BOX_COLORS = {
  Pothole: '#CE1126',
  Crack: '#D97706',
  Debris: '#2563EB',
  Scouring: '#9333EA',
}
const FALLBACK_COLOR = '#374151'

/**
 * Older rows stored a plain array of boxes. Citizen-side rows now store
 * `{ boxes, annotatedImageUrl }` so the annotated photo created at submission
 * travels with the result. Accept both shapes so existing data keeps working.
 */
export function normalizeDetections(value) {
  if (Array.isArray(value)) return { boxes: value, annotatedImageUrl: null }
  if (value && typeof value === 'object') {
    return {
      boxes: Array.isArray(value.boxes) ? value.boxes : [],
      annotatedImageUrl: typeof value.annotatedImageUrl === 'string' ? value.annotatedImageUrl : null,
    }
  }
  return { boxes: [], annotatedImageUrl: null }
}

/**
 * Weak guesses follow the viewer's switch when it has been set (`true`/`false`).
 * Before that (`null`/`undefined`) they show only when there is nothing trusted.
 */
export function effectiveShowWeak(detections, showWeak) {
  if (typeof showWeak === 'boolean') return showWeak
  const { boxes } = normalizeDetections(detections)
  return boxes.length > 0 && !boxes.some((d) => d.trusted)
}

/**
 * Draws the saved boxes onto the actual photo and returns a PNG Blob, so the
 * annotated primary image can be uploaded with the citizen's report.
 */
export async function buildAnnotatedImage(file, storedBoxes) {
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0)

    const { boxes } = normalizeDetections(storedBoxes)
    const unit = Math.max(1, bitmap.width / 640)
    const lineWidth = Math.max(2, Math.round(2 * unit))
    const fontSize = Math.max(12, Math.round(12 * unit))
    const pad = Math.max(2, Math.round(3 * unit))

    ctx.font = `600 ${fontSize}px Arial, sans-serif`
    ctx.textBaseline = 'top'

    for (const d of boxes) {
      const { x1, y1, x2, y2 } = d?.box || {}
      if (![x1, y1, x2, y2].every(Number.isFinite)) continue
      const left = Math.max(0, Math.min(bitmap.width, x1 * bitmap.width))
      const top = Math.max(0, Math.min(bitmap.height, y1 * bitmap.height))
      const right = Math.max(0, Math.min(bitmap.width, x2 * bitmap.width))
      const bottom = Math.max(0, Math.min(bitmap.height, y2 * bitmap.height))
      if (right - left < 2 || bottom - top < 2) continue

      const color = BOX_COLORS[d.label] ?? FALLBACK_COLOR
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.setLineDash(d.trusted ? [] : [lineWidth * 2, lineWidth])
      ctx.strokeRect(left, top, right - left, bottom - top)
      ctx.setLineDash([])

      const label = `${d.label} ${Math.round(d.confidence * 100)}%${d.trusted ? '' : ' (weak)'}`
      const labelW = ctx.measureText(label).width + pad * 2
      const labelH = fontSize + pad * 2
      const labelX = Math.min(left, Math.max(0, bitmap.width - labelW))
      const labelY = top > labelH ? top - labelH : Math.min(top, Math.max(0, bitmap.height - labelH))
      ctx.fillStyle = color
      ctx.fillRect(labelX, labelY, labelW, labelH)
      ctx.fillStyle = '#fff'
      ctx.fillText(label, labelX + pad, labelY + pad)
    }

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('The annotated image could not be rendered')
    return blob
  } finally {
    if (bitmap.close) bitmap.close()
  }
}
