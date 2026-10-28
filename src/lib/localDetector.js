// src/lib/localDetector.js
//
// Runs YOUR trained YOLOv8 model inside the browser, using ONNX Runtime Web.
// No server, no API key, no hosting cost: the model file is served with the app
// (public/models/hazard_yolov8.onnx) and the analysis happens on the admin's computer.
//
// The pure functions at the top (letterbox, decode, NMS, summarize) don't touch the
// browser, so they can be tested on their own. The browser-only part is at the bottom.

// ----------------------------------------------------------------------------
// Settings you may want to tune
// ----------------------------------------------------------------------------
export const MODEL_URL = '/models/hazard_yolov8.onnx'

// Must match the pinned <script> tag in index.html.
export const ORT_VERSION = '1.29.0'
export const ORT_WASM_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`

// MUST be in the same order the model was trained with
// (the FINAL_CLASSES list in the training notebook).
export const CLASS_NAMES = ['Pothole', 'Crack', 'Debris', 'Scouring']

export const INPUT_SIZE = 640
export const DECODE_CONF = 0.25 // ignore anything below this while decoding
export const NMS_IOU = 0.45 // boxes of the same class overlapping more than this are merged

// A detection must reach its class's threshold before the app trusts it; otherwise the app
// falls back to Gemini. Stricter for the classes that scored worst on the test set
// (Debris, Scouring), so the trained model doesn't over-claim where it is weak.
export const MIN_CONFIDENCE = { Pothole: 0.4, Crack: 0.4, Debris: 0.55, Scouring: 0.55 }

// Severity is a transparent rule, not a second AI: how much of the photo the hazard covers.
export const SEVERITY_COVERAGE = { moderate: 0.05, severe: 0.2 }

// ----------------------------------------------------------------------------
// Pure functions
// ----------------------------------------------------------------------------

/** How a photo is shrunk to fit the square model input without distorting it. */
export function computeLetterbox(srcW, srcH, size = INPUT_SIZE) {
  const scale = Math.min(size / srcW, size / srcH)
  const newW = Math.round(srcW * scale)
  const newH = Math.round(srcH * scale)
  return {
    scale,
    newW,
    newH,
    padX: Math.floor((size - newW) / 2),
    padY: Math.floor((size - newH) / 2),
  }
}

/** Canvas pixels (RGBA bytes) -> the model's input layout (RGB, 0..1, channels first). */
export function rgbaToChw(rgba, size = INPUT_SIZE) {
  const plane = size * size
  const out = new Float32Array(3 * plane)
  for (let i = 0; i < plane; i++) {
    out[i] = rgba[i * 4] / 255
    out[plane + i] = rgba[i * 4 + 1] / 255
    out[2 * plane + i] = rgba[i * 4 + 2] / 255
  }
  return out
}

export function iou(a, b) {
  const ix = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1))
  const iy = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1))
  const inter = ix * iy
  const union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter
  return union <= 0 ? 0 : inter / union
}

/** Keeps the best box among overlapping boxes of the same class. */
export function nms(dets, iouThreshold = NMS_IOU) {
  const sorted = [...dets].sort((a, b) => b.confidence - a.confidence)
  const kept = []
  for (const d of sorted) {
    if (kept.every((k) => k.classId !== d.classId || iou(k, d) < iouThreshold)) kept.push(d)
  }
  return kept
}

/**
 * Turns the raw model output into boxes in the ORIGINAL photo's pixel coordinates.
 * YOLOv8 output is [1, 4 + classes, 8400]: per candidate box, (cx, cy, w, h) in model-input
 * pixels followed by one score per class. Handles the transposed layout too.
 */
export function decodeOutput(data, dims, lb, srcW, srcH, confThreshold = DECODE_CONF) {
  if (dims.length !== 3 || dims[0] !== 1) {
    throw new Error(`Unexpected model output shape [${dims.join(', ')}]`)
  }
  // Work out which axis holds the (4 + classes) values. Prefer an exact match with the class
  // count we expect; otherwise assume the smaller axis (a real model has 8400 candidate boxes).
  const expectedC = 4 + CLASS_NAMES.length
  let channelsFirst
  if (dims[1] === expectedC && dims[2] !== expectedC) channelsFirst = true
  else if (dims[2] === expectedC && dims[1] !== expectedC) channelsFirst = false
  else channelsFirst = dims[1] < dims[2]
  const C = channelsFirst ? dims[1] : dims[2]
  const N = channelsFirst ? dims[2] : dims[1]
  const nc = C - 4
  if (nc !== CLASS_NAMES.length) {
    throw new Error(
      `The model has ${nc} classes but the app expects ${CLASS_NAMES.length} (${CLASS_NAMES.join(', ')}). ` +
        'Re-export the model, or update CLASS_NAMES in localDetector.js.'
    )
  }
  const at = (c, i) => (channelsFirst ? data[c * N + i] : data[i * C + c])

  const dets = []
  for (let i = 0; i < N; i++) {
    let best = -1
    let bestScore = 0
    for (let k = 0; k < nc; k++) {
      const s = at(4 + k, i)
      if (s > bestScore) {
        bestScore = s
        best = k
      }
    }
    if (best < 0 || bestScore < confThreshold) continue

    const cx = at(0, i)
    const cy = at(1, i)
    const w = at(2, i)
    const h = at(3, i)
    const x1 = Math.max(0, Math.min(srcW, (cx - w / 2 - lb.padX) / lb.scale))
    const y1 = Math.max(0, Math.min(srcH, (cy - h / 2 - lb.padY) / lb.scale))
    const x2 = Math.max(0, Math.min(srcW, (cx + w / 2 - lb.padX) / lb.scale))
    const y2 = Math.max(0, Math.min(srcH, (cy + h / 2 - lb.padY) / lb.scale))
    if (x2 - x1 < 2 || y2 - y1 < 2) continue

    dets.push({ label: CLASS_NAMES[best], classId: best, confidence: bestScore, x1, y1, x2, y2 })
  }
  return dets
}

/**
 * Decides what the app records. Returns null when nothing is confident enough
 * (the caller then falls back to Gemini).
 */
export function summarizeDetections(dets, srcW, srcH) {
  const confident = dets.filter((d) => d.confidence >= (MIN_CONFIDENCE[d.label] ?? 0.5))
  if (confident.length === 0) return null

  const primary = confident.reduce((a, b) => (b.confidence > a.confidence ? b : a))
  const sameClass = confident.filter((d) => d.classId === primary.classId)

  const coveredArea = sameClass.reduce((sum, d) => sum + (d.x2 - d.x1) * (d.y2 - d.y1), 0)
  const coverage = Math.min(1, coveredArea / (srcW * srcH))
  const severityLevel =
    coverage >= SEVERITY_COVERAGE.severe ? 'severe' : coverage >= SEVERITY_COVERAGE.moderate ? 'moderate' : 'low'

  const bestOther = new Map()
  for (const d of confident) {
    if (d.classId === primary.classId) continue
    if (!bestOther.has(d.classId) || d.confidence > bestOther.get(d.classId).confidence) bestOther.set(d.classId, d)
  }
  const otherText = [...bestOther.values()]
    .map((d) => `${d.label.toLowerCase()} ${Math.round(d.confidence * 100)}%`)
    .join(', ')

  const label = primary.label.toLowerCase()
  const count = sameClass.length
  const notes =
    `Trained YOLOv8 model detected ${count} ${label} region${count === 1 ? '' : 's'} ` +
    `(best confidence ${Math.round(primary.confidence * 100)}%), covering about ${Math.round(coverage * 100)}% of the photo. ` +
    'Severity is estimated from how much of the photo the hazard covers.' +
    (otherText ? ` Also detected: ${otherText}.` : '')

  return {
    hazardType: label,
    severityLevel,
    confidenceScore: Math.round(primary.confidence * 10000) / 100, // percent, 2 decimals
    coverage,
    count,
    notes,
  }
}

/**
 * The boxes in a compact form for saving with the result and drawing later. Coordinates are
 * fractions of the photo (0 to 1), so they line up on the photo at any size. `trusted` says
 * whether the box reached its class's confidence threshold; weaker guesses are kept too, so the
 * admin can see what the model thought even when Gemini ended up doing the analysis.
 */
export const MAX_STORED_DETECTIONS = 30
export function toStoredDetections(dets, srcW, srcH) {
  const r4 = (v) => Math.round(v * 10000) / 10000
  return [...dets]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_STORED_DETECTIONS)
    .map((d) => ({
      label: d.label,
      confidence: r4(d.confidence),
      trusted: d.confidence >= (MIN_CONFIDENCE[d.label] ?? 0.5),
      box: { x1: r4(d.x1 / srcW), y1: r4(d.y1 / srcH), x2: r4(d.x2 / srcW), y2: r4(d.y2 / srcH) },
    }))
}

/** Runs the model on an already-letterboxed 640x640 RGBA image. `ort` is onnxruntime-web. */
export async function runModel(ort, session, letterboxedRgba, srcW, srcH) {
  const lb = computeLetterbox(srcW, srcH)
  const tensor = new ort.Tensor('float32', rgbaToChw(letterboxedRgba), [1, 3, INPUT_SIZE, INPUT_SIZE])
  const outputs = await session.run({ [session.inputNames[0]]: tensor })
  const out = outputs[session.outputNames[0]]
  return nms(decodeOutput(out.data, out.dims, lb, srcW, srcH))
}

// ----------------------------------------------------------------------------
// Browser-only part
// ----------------------------------------------------------------------------
let sessionPromise = null

/** Loads the model once and keeps it in memory (first call downloads the file). */
export function loadSession(ort = globalThis.ort) {
  if (!ort) {
    throw new Error('ONNX Runtime is not loaded. Add the onnxruntime-web <script> tag to index.html.')
  }
  if (!sessionPromise) {
    ort.env.wasm.wasmPaths = ORT_WASM_BASE
    sessionPromise = ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] }).catch((err) => {
      sessionPromise = null // let a later click try again
      throw err
    })
  }
  return sessionPromise
}

/** Downloads a photo, runs the trained model on it, and returns detections + a summary. */
export async function detectInBrowser(imageUrl, ort = globalThis.ort) {
  const session = await loadSession(ort)

  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error('Could not download the photo for analysis')
  const bitmap = await createImageBitmap(await res.blob())
  const srcW = bitmap.width
  const srcH = bitmap.height

  const lb = computeLetterbox(srcW, srcH)
  const canvas = document.createElement('canvas')
  canvas.width = INPUT_SIZE
  canvas.height = INPUT_SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = 'rgb(114,114,114)' // the grey padding YOLO was trained with
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE)
  ctx.drawImage(bitmap, lb.padX, lb.padY, lb.newW, lb.newH)
  if (bitmap.close) bitmap.close()

  const rgba = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data
  const detections = await runModel(ort, session, rgba, srcW, srcH)
  return { detections, summary: summarizeDetections(detections, srcW, srcH), imageSize: { width: srcW, height: srcH } }
}