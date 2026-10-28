// src/components/DetectionBoxes.jsx
//
// Draws the boxes the trained model found, with a label on each ("Pothole 87%").
// Boxes are stored as fractions of the photo (0 to 1), so percentages line up at any size.
//
// Solid box  = the model was confident enough for the app to trust it.
// Dashed box = a weaker guess. Kept so you can see what the model thought, but not used for the result.

export const BOX_COLORS = {
  Pothole: '#CE1126',
  Crack: '#D97706',
  Debris: '#2563EB',
  Scouring: '#9333EA',
}
const FALLBACK_COLOR = '#374151'

const pct = (fraction) => `${Math.round(fraction * 100000) / 1000}%`

/** Weak guesses show when asked for, or automatically when there is nothing else to show. */
export function effectiveShowWeak(detections, showWeak) {
  const list = Array.isArray(detections) ? detections : []
  return Boolean(showWeak) || (list.length > 0 && !list.some((d) => d.trusted))
}

/**
 * The boxes themselves. Must sit inside an element that is exactly the size of the photo
 * (position: relative), because every box is positioned in percentages of that element.
 */
export default function DetectionBoxes({ detections, showWeak = false }) {
  const shown = (Array.isArray(detections) ? detections : []).filter((d) => d.trusted || showWeak)
  return (
    <>
      {shown.map((d, i) => {
        const color = BOX_COLORS[d.label] ?? FALLBACK_COLOR
        const { x1, y1, x2, y2 } = d.box
        return (
          <div
            key={`${d.label}-${i}`}
            data-label={d.label}
            data-trusted={d.trusted ? 'true' : 'false'}
            className="absolute"
            style={{
              left: pct(x1),
              top: pct(y1),
              width: pct(x2 - x1),
              height: pct(y2 - y1),
              boxSizing: 'border-box',
              border: `2px ${d.trusted ? 'solid' : 'dashed'} ${color}`,
              opacity: d.trusted ? 1 : 0.75,
            }}
          >
            <span
              className="absolute left-0 top-0 whitespace-nowrap px-1 text-[10px] font-semibold leading-tight text-white"
              style={{ backgroundColor: color }}
            >
              {d.label} {Math.round(d.confidence * 100)}%{d.trusted ? '' : ' (weak)'}
            </span>
          </div>
        )
      })}
    </>
  )
}

/**
 * A small preview of the detected photo with its boxes, a colour legend, and a switch for the
 * weaker guesses. Controlled: the parent owns `showWeak` so the full-screen viewer can match it.
 */
export function DetectionPreview({ detection, imageUrl, showWeak, onShowWeakChange, onOpen }) {
  const all = detection?.detections
  if (!imageUrl || !Array.isArray(all) || all.length === 0) return null

  const weak = all.filter((d) => !d.trusted)
  const weakOnly = !all.some((d) => d.trusted)
  const weakVisible = effectiveShowWeak(all, showWeak)
  const legend = [...new Set(all.filter((d) => d.trusted || weakVisible).map((d) => d.label))]

  return (
    <div className="mt-3">
      <button type="button" onClick={onOpen} aria-label="Open the photo with detection boxes" className="block w-full">
        <div className="flex justify-center rounded-lg bg-gray-100 p-1">
          <div className="relative inline-block max-w-full">
            <img src={imageUrl} alt="" className="block max-h-56 max-w-full rounded object-contain" />
            <div className="pointer-events-none absolute inset-0">
              <DetectionBoxes detections={all} showWeak={weakVisible} />
            </div>
          </div>
        </div>
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {legend.map((label) => (
          <span key={label} className="flex items-center gap-1 text-xs text-gray-600">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BOX_COLORS[label] ?? FALLBACK_COLOR }} />
            {label}
          </span>
        ))}
      </div>

      {weakOnly ? (
        <p className="mt-1.5 text-xs text-gray-500">
          The trained model only made weak guesses for this photo, so its result was not used. The dashed boxes show what it saw.
        </p>
      ) : (
        weak.length > 0 && (
          <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
            <input type="checkbox" checked={Boolean(showWeak)} onChange={(e) => onShowWeakChange?.(e.target.checked)} />
            Also show {weak.length} weaker guess{weak.length === 1 ? '' : 'es'} (dashed)
          </label>
        )
      )}

      <p className="mt-1 text-[11px] text-gray-400">
        Trained model saw:{' '}
        {all.map((d) => `${d.label} ${Math.round(d.confidence * 100)}%${d.trusted ? '' : ' (weak)'}`).join(' · ')}
      </p>
    </div>
  )
}