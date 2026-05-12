import { useEffect, useRef } from "react"

// ── Module-level singleton ──────────────────────────────────────────────────
// Captured once, survives re-renders and HMR reloads.
// Storing it outside React state prevents the hook from needing
// a useEffect just to read it on every render.
let _originalFaviconHref = null

const BADGE_RE = /^\(\d+\)\s*/ // matches "(N) " at the start of the title

// ── Helpers ─────────────────────────────────────────────────────────────────

function getFaviconLink() {
  return (
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]')
  )
}

function ensureFaviconLink() {
  let link = getFaviconLink()
  if (!link) {
    link = document.createElement("link")
    link.rel = "icon"
    document.head.appendChild(link)
  }
  return link
}

/** Resolve a potentially-relative href to an absolute URL. */
function resolveHref(href) {
  const a = document.createElement("a")
  a.href = href
  return a.href
}

/** Capture the original favicon URL exactly once. */
function captureOriginal() {
  if (_originalFaviconHref) return
  const link = getFaviconLink()
  const raw = link?.getAttribute("href") || "/klaynelogoreal.png"
  _originalFaviconHref = resolveHref(raw)
}

function drawBadgeDot(ctx) {
  const r = 6
  // Red filled circle in top-right corner
  ctx.beginPath()
  ctx.arc(32 - r, r, r, 0, Math.PI * 2)
  ctx.fillStyle = "#ef4444"
  ctx.fill()
  // Subtle dark ring so it's visible on both light and dark icons
  ctx.beginPath()
  ctx.arc(32 - r, r, r, 0, Math.PI * 2)
  ctx.strokeStyle = "rgba(0,0,0,0.45)"
  ctx.lineWidth = 1.5
  ctx.stroke()
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages the browser-tab notification badge (favicon red dot + title prefix).
 *
 * @param {number} count   Total unread count across all notification types.
 */
export function useTabNotificationBadge(count) {
  // Incrementing this cancels any in-flight Image.onload from a previous render.
  const drawGenRef = useRef(0)

  // Capture the original favicon URL on first mount.
  useEffect(() => {
    captureOriginal()
  }, [])

  // ── Favicon badge ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!_originalFaviconHref) return

    const link = ensureFaviconLink()

    if (count <= 0) {
      // Always set type to png so the browser accepts our data URI replacements.
      link.type = "image/png"
      link.href = _originalFaviconHref
      return
    }

    // Bump generation — any pending onload with an older gen is stale.
    const gen = ++drawGenRef.current

    const canvas = document.createElement("canvas")
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext("2d")

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      if (gen !== drawGenRef.current) return // stale draw — discard

      ctx.clearRect(0, 0, 32, 32)
      ctx.drawImage(img, 0, 0, 32, 32)
      drawBadgeDot(ctx)

      link.type = "image/png" // ← fix: was "image/svg+xml", browsers rejected PNG data URI
      link.href = canvas.toDataURL("image/png")
    }

    img.onerror = () => {
      if (gen !== drawGenRef.current) return

      // Original icon failed to load — show a red dot on a transparent canvas
      ctx.clearRect(0, 0, 32, 32)
      drawBadgeDot(ctx)
      link.type = "image/png"
      link.href = canvas.toDataURL("image/png")
    }

    img.src = _originalFaviconHref

    // ── No cleanup that resets the favicon ──────────────────────────────────
    // The generation counter handles stale draws. Resetting href in cleanup
    // caused the icon to briefly disappear between two non-zero count values.
  }, [count])

  // ── Document title badge prefix ────────────────────────────────────────────
  useEffect(() => {
    // Strip any existing badge prefix before applying the new one.
    // This ensures we don't accumulate "(1) (2) Klayne" across renders,
    // and it safely coexists with Pomodoro's title changes (which write the
    // full string after the prefix).
    const base = document.title.replace(BADGE_RE, "")
    document.title = count > 0 ? `(${count}) ${base}` : base

    return () => {
      // On unmount (or count → 0 via cleanup): strip the prefix.
      // We do NOT reset to a hard-coded "Klayne" because the Pomodoro timer
      // may have set a different title (e.g. "24:59 Focus | Klayne").
      document.title = document.title.replace(BADGE_RE, "")
    }
  }, [count])
}
