import { CircleDotDashed, Blocks, Activity, Layers, Check } from 'lucide-react'
import { HAZARD_TYPES } from '../lib/hazardTypes'
import { cn } from './ui/utils'

// Small illustrative icon per category. Icons are decorative — the card text
// always names the category, so screen readers can ignore the glyph.
const HAZARD_ICONS = {
  Pothole: CircleDotDashed,
  Debris: Blocks,
  Crack: Activity,
  Scouring: Layers,
}

// Static class strings (not interpolated) so Tailwind keeps them in the build.
// Tones mirror the detection box colours used on the map.
const TONES = {
  danger: {
    tile: 'bg-danger-light text-danger',
    selected: 'border-danger/40 bg-danger-light/15 ring-danger/10',
    dot: 'bg-danger',
  },
  blue: {
    tile: 'bg-primary-light text-primary',
    selected: 'border-primary/40 bg-primary-light/20 ring-primary/10',
    dot: 'bg-primary',
  },
  warning: {
    tile: 'bg-warning-light text-warning',
    selected: 'border-warning/40 bg-warning-light/20 ring-warning/10',
    dot: 'bg-warning',
  },
  purple: {
    tile: 'bg-secondary-light text-secondary',
    selected: 'border-secondary/40 bg-secondary-light/20 ring-secondary/10',
    dot: 'bg-secondary',
  },
}

/**
 * Selectable hazard guide for the submission form.
 *
 * Combines the "what type is this?" choice with a plain-language guide, so
 * residents can compare all four categories at a glance instead of opening a
 * dropdown. Uses native radio inputs so keyboard arrows, screen readers and
 * large tap targets work without extra scripting.
 *
 * `onChange` receives the stored value (Pothole | Debris | Crack | Scouring),
 * which is unchanged from the previous dropdown.
 */
export default function HazardTypePicker({ value, onChange, name = 'hazard-type' }) {
  return (
    <fieldset>
      <legend className="text-[13px] font-semibold text-ink">
        Hazard Type<span className="ml-0.5 text-danger">*</span>
      </legend>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        Choose the category that looks closest to what you see.
      </p>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {HAZARD_TYPES.map((type) => {
          const Icon = HAZARD_ICONS[type.value]
          const tone = TONES[type.tone] ?? TONES.blue
          const selected = value === type.value
          const optionId = `${name}-${type.value.toLowerCase()}`

          return (
            <label
              key={type.value}
              htmlFor={optionId}
              className={cn(
                'group relative flex cursor-pointer gap-3 rounded-xl border border-line bg-white p-3.5 text-left transition',
                'hover:border-primary/30 hover:bg-canvas/50',
                'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/15',
                selected ? cn('ring-4', tone.selected) : 'ring-0'
              )}
            >
              <input
                type="radio"
                id={optionId}
                name={name}
                value={type.value}
                checked={selected}
                onChange={() => onChange(type.value)}
                className="sr-only"
              />

              <span
                aria-hidden="true"
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition',
                  tone.tile,
                  selected && 'shadow-sm ring-1 ring-inset ring-white/60'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>

              <span className="min-w-0 flex-1 pr-4">
                <span className="flex items-baseline gap-1.5">
                  <span className="shrink-0 text-[13px] font-bold text-ink">{type.label}</span>
                  <span aria-hidden="true" className={cn('h-1 w-1 shrink-0 rounded-full', tone.dot)} />
                  <span className="min-w-0 text-[11px] font-semibold uppercase leading-snug tracking-wide text-ink-muted">
                    {type.localLabel}
                  </span>
                </span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-soft">{type.description}</span>
              </span>

              <span
                aria-hidden="true"
                className={cn(
                  'absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-gradient text-white shadow-sm transition',
                  selected ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                )}
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
              </span>
            </label>
          )
        })}
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-ink-muted">
        Not sure? Pick the closest match — an LGU inspector will verify it on-site.
      </p>
    </fieldset>
  )
}
