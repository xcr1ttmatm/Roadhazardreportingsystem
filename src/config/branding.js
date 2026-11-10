/**
 * Branding & login appearance.
 * ------------------------------------------------------------------
 * Everything here is presentation-only. Change these values (or set
 * the matching VITE_* variables in your .env file) to use your own
 * logos and login background without touching any component code.
 *
 * Files placed in `public/` are served from the site root, so an image
 * saved as `public/login-bg.jpg` is referenced as `/login-bg.jpg`.
 *
 * Examples:
 *   VITE_AUTH_BACKGROUND_IMAGE=/login-bg.jpg
 *   VITE_APP_LOGO=/my-logo.svg
 *   VITE_AUTH_LOGO=/my-logo-full.svg
 */
const env = import.meta.env

export const branding = {
  /** Short product name used on the auth screens. */
  name: 'Road Hazard Reporting',
  /** Small uppercase line shown under the product name. */
  tagline: 'LGU Public Safety',
  /** Full organisation name used in the auth footer. */
  organisation: 'Local Government Unit',

  /**
   * Square mark used in the app chrome (sidebar / topbar brand tile).
   * Leave empty to keep the built-in shield icon.
   * e.g. '/my-logo.svg'
   */
  logo: env.VITE_APP_LOGO || '/CEOsLogo.png',

  /**
   * Full logo lockup for the login / register screens. When set it
   * replaces the shield icon + wordmark. Leave empty for the default.
   * e.g. '/my-logo-full.svg'
   */
  authLogo: env.VITE_AUTH_LOGO || '/CEOsLogo.png',

  /**
   * Optional alternates when one logo does not work on both surfaces:
   * `authLogoOnDark` is used on the gradient brand panel, and
   * `authLogoOnLight` on the white mobile header. Both fall back to
   * `authLogo` when empty.
   */
  authLogoOnDark: env.VITE_AUTH_LOGO_ON_DARK || '/CEOsLogo.png',
  authLogoOnLight: env.VITE_AUTH_LOGO_ON_LIGHT || '/CEOsLogo.png',

  /**
   * Login / register background image. On large screens it fills the
   * gradient brand panel; on mobile it sits behind the form with a
   * light overlay. Leave empty to keep the gradient-only look.
   * e.g. '/login-bg.jpg'
   */
  authBackgroundImage: env.VITE_AUTH_BACKGROUND_IMAGE || '/login-bg.png',
}
