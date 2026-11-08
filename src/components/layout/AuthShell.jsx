import { useState } from 'react'
import { branding } from '../../config/branding'
import AuthBrand from './AuthBrand'

/**
 * Split authentication layout: brand panel + floating form card.
 * Presentation only — forms and submit handlers stay in the pages.
 *
 * Logos and the background image are configurable in
 * `src/config/branding.js` (or via VITE_* environment variables).
 */
export default function AuthShell({
  headline,
  description,
  features = [],
  title,
  subtitle,
  children,
  footer,
  backgroundImage = branding.authBackgroundImage,
  authLogo = branding.authLogo,
  authLogoOnDark = branding.authLogoOnDark,
  authLogoOnLight = branding.authLogoOnLight,
}) {
  const [backgroundFailed, setBackgroundFailed] = useState(false)

  const background = backgroundImage && !backgroundFailed ? backgroundImage : ''
  const darkLogo = authLogoOnDark || authLogo
  const lightLogo = authLogoOnLight || authLogo

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      {/* Mobile / tablet background image */}
      {background && (
        <>
          <img
            src={background}
            alt=""
            aria-hidden="true"
            onError={() => setBackgroundFailed(true)}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover lg:hidden"
          />
          <div className="pointer-events-none absolute inset-0 bg-canvas/80 backdrop-blur-[2px] lg:hidden" />
        </>
      )}

      <div className="pointer-events-none absolute -left-48 -top-48 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-64 -right-24 h-[36rem] w-[36rem] rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:gap-6 lg:p-6">
        {/* Brand panel */}
        <aside
          className="relative hidden overflow-hidden rounded-[28px] bg-brand-gradient p-10 text-white shadow-glow-blue lg:flex lg:w-[45%] lg:flex-col lg:justify-between xl:p-12"
          style={
            background
              ? {
                  backgroundImage: `url("${background}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        >
          {background && (
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/85 via-accent/75 to-secondary/85" />
          )}
          <span className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <span className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
          <span className="pointer-events-none absolute right-14 top-1/3 h-24 w-24 rounded-full bg-white/10" />

          <div className="relative">
            <AuthBrand logo={darkLogo} tone="dark" size="lg" />
          </div>

          <div className="relative my-12 max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/80 ring-1 ring-inset ring-white/15">
              Citizen-first reporting
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl xl:text-[42px]">
              {headline}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/70">{description}</p>

            <div className="mt-8 space-y-3">
              {features.map((feature) => (
                <div key={feature.text} className="flex items-center gap-3 text-sm text-white/85">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/12 ring-1 ring-inset ring-white/15">
                    <feature.icon className="h-4 w-4 text-white" />
                  </span>
                  {feature.text}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              className="h-1 w-full rounded-full opacity-50"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, #FFFFFF 0px, #FFFFFF 18px, transparent 18px, transparent 34px)',
              }}
            />
            <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-white/45">
              {branding.organisation} · Public Infrastructure Safety
            </p>
          </div>
        </aside>

        {/* Form side */}
        <section className="flex flex-1 flex-col">
          <div className="flex items-center gap-2.5 px-1 py-2 lg:hidden">
            <AuthBrand logo={lightLogo} tone="light" size="sm" />
          </div>

          <div className="flex flex-1 items-center justify-center py-6 lg:py-10">
            <div className="w-full max-w-[440px] animate-fade-up rounded-[24px] border border-line bg-white p-5 shadow-float sm:p-8">
              <h2 className="text-2xl font-bold tracking-tight text-ink">{title}</h2>
              <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
              <div className="mt-7">{children}</div>
              {footer && (
                <div className="mt-6 border-t border-line-soft pt-4 text-center text-[13px] text-ink-soft">{footer}</div>
              )}
            </div>
          </div>

          <p className="px-4 pb-2 text-center text-[10px] text-ink-muted lg:text-left">
            Protected by Supabase authentication · For official LGU use
          </p>
        </section>
      </div>
    </div>
  )
}
