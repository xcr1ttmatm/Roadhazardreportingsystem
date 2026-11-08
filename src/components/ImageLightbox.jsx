import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, ImageOff } from 'lucide-react'
import { MIN_SCALE, MAX_SCALE, clamp, clampPan, zoomAtPoint, distance, midpoint } from '../lib/viewerMath'

const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_ZOOM = 2.5
const TAP_MOVE_TOLERANCE = 6 // px a pointer may wander and still count as a tap
const CHROME_HIDE_MS = 2600 // how long the floating controls stay after activity

/**
 * Immersive full-screen photo viewer, shared by every role (Hazard Map, admin,
 * inspector, citizen).
 *
 * Rendered through a portal so `fixed inset-0` is always the real viewport.
 * The authenticated shell keeps a `transform` from its entrance animation on
 * a page wrapper, and a transformed ancestor would otherwise become the
 * containing block for `position: fixed` — which made the photo look cropped.
 *
 * Layout: the photo stage is edge-to-edge. Controls float on translucent
 * gradient scrims (title/counter/close up top, navigation/zoom at the bottom)
 * and fade away after a short idle period; a mouse move, key press or tap
 * brings them back. The photo is measured and "contain"-fitted, so it is never
 * cropped and the detection overlay lines up exactly.
 *
 *  - drag to move a zoomed photo (mouse or finger)
 *  - mouse wheel, pinch, double-click / double-tap, or the + / - buttons to zoom
 *  - arrow keys or the prev/next buttons to switch photos, Esc or the X to close
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
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  // Loading state is keyed by URL, so switching photos starts fresh without an
  // effect that has to reset a pile of state.
  const [load, setLoad] = useState({ url: null, status: 'loading', width: 0, height: 0 })
  const [retry, setRetry] = useState({ url: null, count: 0 })
  const [chrome, setChrome] = useState(true)

  const stageRef = useRef(null) // the edge-to-edge viewing area (receives gestures)
  const viewportRef = useRef(null) // the area the photo may occupy
  const frameRef = useRef(null) // wraps the photo (and overlay); this is what moves and scales
  const viewRef = useRef(view) // always-current copy for event handlers
  const pointers = useRef(new Map())
  const gesture = useRef(null)
  const movedRef = useRef(false)
  const downTargetRef = useRef(null)
  const lastTap = useRef({ t: 0, x: 0, y: 0 })
  const chromeRef = useRef(true) // always-current visibility for pointer handlers
  const chromeTimer = useRef(null)

  const ready = load.url === current?.url && load.status === 'ready'
  const failed = load.url === current?.url && load.status === 'error'
  const retryCount = retry.url === current?.url ? retry.count : 0
  const imgSrc = retryCount
    ? `${current?.url}${current?.url?.includes('?') ? '&' : '?'}retry=${retryCount}`
    : current?.url

  // The controls stay visible while a photo is loading or has failed, so the
  // retry/close buttons are always reachable.
  const chromeShown = chrome || !ready

  // Fit the photo inside the measured stage without ever cropping it. The frame
  // gets explicit pixel dimensions so the detection overlay lines up exactly.
  const fit =
    ready && viewport.width > 0 && viewport.height > 0
      ? (() => {
          const ratio = Math.min(viewport.width / load.width, viewport.height / load.height)
          return {
            width: Math.max(1, Math.round(load.width * ratio)),
            height: Math.max(1, Math.round(load.height * ratio)),
          }
        })()
      : null

  // ---- helpers -------------------------------------------------------------
  function pointToCenter(clientX, clientY) {
    const rect = stageRef.current.getBoundingClientRect()
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 }
  }

  /** Applies a new view, keeping the scale in range and the photo from leaving the screen. */
  function commit(next) {
    const stage = stageRef.current
    const frame = frameRef.current
    if (!stage || !frame || !frame.offsetWidth || !frame.offsetHeight) return
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

  function handleImageLoad(e) {
    const { naturalWidth, naturalHeight } = e.currentTarget
    if (!naturalWidth || !naturalHeight) return
    setLoad({ url: current.url, status: 'ready', width: naturalWidth, height: naturalHeight })
  }

  function handleImageError() {
    setLoad({ url: current.url, status: 'error', width: 0, height: 0 })
  }

  function handleRetry() {
    setLoad({ url: null, status: 'loading', width: 0, height: 0 })
    setRetry({ url: current.url, count: retryCount + 1 })
  }

  /** Shows the floating controls and (re)starts the idle countdown. */
  const setChromeVisible = useCallback((visible) => {
    chromeRef.current = visible
    setChrome(visible)
    if (chromeTimer.current) {
      clearTimeout(chromeTimer.current)
      chromeTimer.current = null
    }
    if (visible) {
      chromeTimer.current = setTimeout(() => {
        chromeRef.current = false
        setChrome(false)
        chromeTimer.current = null
      }, CHROME_HIDE_MS)
    }
  }, [])

  const revealChrome = useCallback(() => setChromeVisible(true), [setChromeVisible])

  // ---- effects -------------------------------------------------------------
  // Keep the ref used by gesture handlers in sync with the latest view.
  useEffect(() => {
    viewRef.current = view
  }, [view])

  // A different photo (or a resize that changes its fit) always starts un-zoomed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView({ scale: 1, x: 0, y: 0 })
  }, [index, fit?.width, fit?.height])

  // Start the idle timer on mount, on every photo change and once the photo is
  // ready (until then the controls are forced visible anyway).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    revealChrome()
    return () => {
      if (chromeTimer.current) clearTimeout(chromeTimer.current)
    }
  }, [revealChrome, index, ready])

  // Keep the page behind from scrolling while the viewer is open.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Measure the space the photo may use. Doing it in the observer callback
  // (rather than synchronously in the effect) also keeps the first paint simple.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return undefined

    const update = () => setViewport({ width: el.clientWidth, height: el.clientHeight })
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    observer?.observe(el)
    window.addEventListener('resize', update)
    // Measure once on mount too (in a frame, so it is not a synchronous render).
    const initialFrame = window.requestAnimationFrame(update)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
      window.cancelAnimationFrame(initialFrame)
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
  }, [hasPhoto])

  useEffect(() => {
    function onKeyDown(e) {
      revealChrome()
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
    revealChrome()
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
    // Mouse movement (and finger movement) counts as activity, so the floating
    // controls come back even when no button is held.
    revealChrome()
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

    // Anything outside the photo itself (the dark letterbox) closes the viewer.
    const onBackdrop = !frameRef.current?.contains(downTargetRef.current)
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

    if (onBackdrop) {
      // If the controls are hidden, the first tap just brings them back so the
      // viewer is never dismissed by accident.
      if (chromeRef.current) onClose()
      else revealChrome()
      return
    }

    // Tapping the photo itself only ever reveals the controls (idle hides them
    // again). It never closes the viewer.
    revealChrome()
  }

  if (!current) return null

  const zoomedIn = view.scale > 1.01

  return createPortal(
    // z-[9999] is deliberate: Leaflet's map panes and controls use z-index values in the hundreds,
    // so anything lower is drawn underneath the map.
    <div
      data-lightbox-root
      className="fixed inset-0 z-[9999] h-[100dvh] w-full animate-fade-in select-none overflow-hidden bg-slate-950/95 backdrop-blur-sm"
    >
      {/* Edge-to-edge photo stage (receives every gesture) */}
      <div
        ref={stageRef}
        data-lightbox-stage
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={viewportRef} data-lightbox-viewport className="flex h-full w-full items-center justify-center">
          <div
            ref={frameRef}
            data-lightbox-frame
            className="relative"
            style={{
              width: fit?.width,
              height: fit?.height,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: 'center',
              transition: dragging ? 'none' : 'transform 120ms ease-out',
              cursor: zoomedIn ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
            }}
          >
            <img
              key={imgSrc}
              data-lightbox-image
              src={imgSrc}
              alt=""
              draggable={false}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={`block h-full w-full rounded-lg object-contain shadow-2xl transition-opacity duration-150 ${
                fit ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {fit && renderOverlay && (
              <div className="pointer-events-none absolute inset-0">{renderOverlay(current, index)}</div>
            )}
          </div>
        </div>

        {!failed && !fit && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}

        {failed && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/80">
              <ImageOff className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-white">This photo couldn't be loaded.</p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Floating top bar — fades away while you look at the photo */}
      <div
        data-lightbox-topbar
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 via-black/30 to-transparent pb-10 pt-[calc(0.75rem+env(safe-area-inset-top))] transition-opacity duration-200 ${
          chromeShown ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className={`flex items-start justify-between gap-3 px-4 sm:px-6 ${chromeShown ? 'pointer-events-auto' : ''}`}>
          <div className="min-w-0 rounded-xl bg-black/25 px-3 py-1.5 backdrop-blur-sm">
            <p className="truncate text-sm font-semibold text-white">{current.label || 'Photo'}</p>
            <p className="text-xs text-white/60">
              {index + 1} of {total}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur transition hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Floating bottom bar — navigation and zoom, never a dedicated row */}
      <div
        data-lightbox-toolbar
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-10 transition-opacity duration-200 sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${
          chromeShown ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className={`flex items-center gap-2 ${chromeShown ? 'pointer-events-auto' : ''}`}>
          <button
            onClick={goPrev}
            disabled={total < 2}
            data-lightbox-prev
            aria-label="Previous photo"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur transition hover:bg-white/25 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="mx-1 h-6 w-px bg-white/15" aria-hidden="true" />
          <button
            onClick={() => zoomBy(1 / 1.5)}
            aria-label="Zoom out"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur transition hover:bg-white/25"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => commit({ scale: 1, x: 0, y: 0 })}
            aria-label="Reset zoom"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur transition hover:bg-white/25"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => zoomBy(1.5)}
            aria-label="Zoom in"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur transition hover:bg-white/25"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <span className="mx-1 h-6 w-px bg-white/15" aria-hidden="true" />
          <button
            onClick={goNext}
            disabled={total < 2}
            data-lightbox-next
            aria-label="Next photo"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur transition hover:bg-white/25 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <p className="hidden text-center text-xs text-white/55 sm:block">
          Scroll or double-click to zoom · drag to move · arrow keys to switch photos · Esc to close
        </p>
      </div>
    </div>,
    document.body
  )
}
