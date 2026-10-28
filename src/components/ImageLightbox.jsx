import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { MIN_SCALE, MAX_SCALE, clamp, clampPan, zoomAtPoint, distance, midpoint } from '../lib/viewerMath'

const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_ZOOM = 2.5
const TAP_MOVE_TOLERANCE = 6 // px a pointer may wander and still count as a tap

/**
 * Full-screen photo viewer, shared by every role (Hazard Map, admin, inspector).
 *
 *  - drag to move a zoomed photo (mouse or finger)
 *  - mouse wheel, pinch, double-click / double-tap, or the + / - buttons to zoom
 *  - arrow keys or the side buttons to switch photos, Esc or the X to close
 *
 * @param {{url: string, label: string}[]} images
 * @param {number} index - which photo is showing
 * @param {(newIndex: number) => void} onIndexChange
 * @param {() => void} onClose
 * @param {(image: object, index: number) => React.ReactNode} [renderOverlay] - drawn on top of the
 *        photo and zooming/moving with it (used for detection boxes). Position things with
 *        percentages inside it, e.g. style={{ left: '10%', top: '20%' }}.
 */
export default function ImageLightbox({ images, index, onIndexChange, onClose, renderOverlay }) {
  const total = images.length
  const current = images[index]

  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  const stageRef = useRef(null) // the full-screen viewing area
  const frameRef = useRef(null) // wraps the photo (and overlay); this is what moves and scales
  const viewRef = useRef(view) // always-current copy for event handlers
  viewRef.current = view
  const pointers = useRef(new Map())
  const gesture = useRef(null)
  const movedRef = useRef(false)
  const downTargetRef = useRef(null)
  const lastTap = useRef({ t: 0, x: 0, y: 0 })

  // ---- helpers -------------------------------------------------------------
  function pointToCenter(clientX, clientY) {
    const rect = stageRef.current.getBoundingClientRect()
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 }
  }

  /** Applies a new view, keeping the scale in range and the photo from leaving the screen. */
  function commit(next) {
    const stage = stageRef.current
    const frame = frameRef.current
    if (!stage || !frame) return // nothing on screen (e.g. the photo list is momentarily empty)
    const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE)
    const pan = clampPan({ x: next.x, y: next.y }, scale, frame.offsetWidth, frame.offsetHeight, stage.clientWidth, stage.clientHeight)
    setView({ scale, x: pan.x, y: pan.y })
  }

  function zoomBy(factor) {
    const v = viewRef.current
    commit(zoomAtPoint(v, v.scale * factor, 0, 0))
  }

  function goPrev() {
    if (total > 1) onIndexChange((index - 1 + total) % total)
  }
  function goNext() {
    if (total > 1) onIndexChange((index + 1) % total)
  }

  // ---- effects -------------------------------------------------------------
  // A different photo always starts un-zoomed.
  useEffect(() => {
    setView({ scale: 1, x: 0, y: 0 })
  }, [index])

  // Keep the page behind from scrolling while the viewer is open.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Mouse wheel zoom. Attached natively because React's onWheel can't block page scrolling.
  // Re-attaches if a photo appears after the viewer was already open.
  const hasPhoto = Boolean(current)
  useEffect(() => {
    const el = stageRef.current
    if (!el) return undefined
    function onWheel(e) {
      e.preventDefault()
      const p = pointToCenter(e.clientX, e.clientY)
      const v = viewRef.current
      commit(zoomAtPoint(v, v.scale * Math.exp(-e.deltaY * 0.0015), p.x, p.y))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPhoto])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === '+' || e.key === '=') zoomBy(1.5)
      else if (e.key === '-') zoomBy(1 / 1.5)
      else if (e.key === '0') commit({ scale: 1, x: 0, y: 0 })
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total])

  // ---- pointer gestures (mouse, touch and pen all arrive as pointer events) ----
  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    stageRef.current.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    downTargetRef.current = e.target

    if (pointers.current.size === 1) {
      movedRef.current = false
      gesture.current = { type: 'drag', startX: e.clientX, startY: e.clientY, origX: viewRef.current.x, origY: viewRef.current.y }
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const mid = midpoint(a, b)
      gesture.current = {
        type: 'pinch',
        startDist: distance(a, b) || 1,
        startView: { ...viewRef.current },
        startMid: pointToCenter(mid.x, mid.y),
      }
      movedRef.current = true // a pinch is never a tap
      setDragging(true)
    }
  }

  function onPointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return

    if (g.type === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const mid = midpoint(a, b)
      const now = pointToCenter(mid.x, mid.y)
      const zoomed = zoomAtPoint(g.startView, g.startView.scale * (distance(a, b) / g.startDist), g.startMid.x, g.startMid.y)
      commit({ scale: zoomed.scale, x: zoomed.x + (now.x - g.startMid.x), y: zoomed.y + (now.y - g.startMid.y) })
      return
    }

    if (g.type === 'drag') {
      const dx = e.clientX - g.startX
      const dy = e.clientY - g.startY
      if (!movedRef.current && Math.hypot(dx, dy) > TAP_MOVE_TOLERANCE) {
        movedRef.current = true
        setDragging(true)
      }
      if (movedRef.current) commit({ scale: viewRef.current.scale, x: g.origX + dx, y: g.origY + dy })
    }
  }

  function onPointerUp(e) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.delete(e.pointerId)
    stageRef.current.releasePointerCapture?.(e.pointerId)

    // One finger lifted after a pinch: carry on dragging with the other one.
    if (pointers.current.size === 1 && gesture.current?.type === 'pinch') {
      const [p] = [...pointers.current.values()]
      gesture.current = { type: 'drag', startX: p.x, startY: p.y, origX: viewRef.current.x, origY: viewRef.current.y }
      return
    }
    if (pointers.current.size > 0) return

    setDragging(false)
    gesture.current = null
    const wasTap = !movedRef.current && e.type === 'pointerup'
    if (!wasTap) return

    const onBackdrop = downTargetRef.current === stageRef.current
    const now = Date.now()
    const last = lastTap.current
    const isDoubleTap = now - last.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30

    if (isDoubleTap && !onBackdrop) {
      const p = pointToCenter(e.clientX, e.clientY)
      const v = viewRef.current
      commit(v.scale > 1.01 ? { scale: 1, x: 0, y: 0 } : zoomAtPoint(v, DOUBLE_TAP_ZOOM, p.x, p.y))
      lastTap.current = { t: 0, x: 0, y: 0 }
      return
    }

    lastTap.current = { t: now, x: e.clientX, y: e.clientY }
    if (onBackdrop) onClose() // a tap on the dark area outside the photo closes the viewer
  }

  if (!current) return null

  const zoomedIn = view.scale > 1.01

  return (
    // z-[9999] is deliberate: Leaflet's map panes and controls use z-index values in the hundreds,
    // so anything lower is drawn underneath the map.
    <div className="fixed inset-0 z-[9999] select-none bg-black/85">
      <div
        ref={stageRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={frameRef}
          className="relative"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: 'center',
            transition: dragging ? 'none' : 'transform 120ms ease-out',
            cursor: zoomedIn ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
        >
          <img
            src={current.url}
            alt=""
            draggable={false}
            className="block max-h-[75vh] max-w-[90vw] rounded-lg object-contain"
          />
          {renderOverlay && <div className="pointer-events-none absolute inset-0">{renderOverlay(current, index)}</div>}
        </div>
      </div>

      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {total > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goNext}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => zoomBy(1 / 1.5)}
            aria-label="Zoom out"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => commit({ scale: 1, x: 0, y: 0 })}
            aria-label="Reset zoom"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => zoomBy(1.5)}
            aria-label="Zoom in"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
        <p className="text-center text-xs text-white/70">
          {current.label} — {index + 1} of {total}
          <span className="hidden sm:inline"> · scroll or double-click to zoom · drag to move · arrow keys to switch photos</span>
        </p>
      </div>
    </div>
  )
}