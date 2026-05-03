import { useLayoutEffect } from "react"

/**
 * Reference-counted body-scroll lock.
 *
 * Multiple components can call this hook simultaneously (e.g. a modal inside
 * a page that also locks scroll).  A plain `position: fixed` approach breaks
 * when two locks are active because the first cleanup removes the lock while
 * the second still needs it, causing a visible flash and scroll-position loss.
 *
 * Solution: a module-level counter + single shared lock state.
 *  • First caller  (counter 0→1): applies the lock, captures scrollY.
 *  • Subsequent callers (counter N→N+1): just increment, lock already active.
 *  • Each cleanup decrements.  Only the last one (counter 1→0) removes the lock
 *    and restores scroll.
 *
 * Why `html` not `body`:
 *  Setting `position: fixed` on `body` causes some browsers to show the `html`
 *  element's background (often white/transparent) behind the body, making the
 *  page appear to go opaque or blank.  Locking `html` instead keeps `body`
 *  in the normal stacking context and prevents the background flash.
 */

let lockCount = 0
let savedScrollY = 0

const applyLock = () => {
  savedScrollY = window.scrollY
  const html = document.documentElement
  html.style.position = "fixed"
  html.style.top = `-${savedScrollY}px`
  html.style.left = "0"
  html.style.right = "0"
  html.style.overflowY = "scroll" // preserve scrollbar gutter width
}

const removeLock = () => {
  const html = document.documentElement
  html.style.position = ""
  html.style.top = ""
  html.style.left = ""
  html.style.right = ""
  html.style.overflowY = ""
  window.scrollTo({ top: savedScrollY, behavior: "instant" })
}

const useLockBodyScroll = (isOpen) => {
  useLayoutEffect(() => {
    if (!isOpen) return

    lockCount++
    if (lockCount === 1) {
      // First active lock — apply now
      applyLock()
    }

    return () => {
      lockCount--
      if (lockCount === 0) {
        // Last lock released — restore scroll
        removeLock()
      }
    }
  }, [isOpen])
}

export default useLockBodyScroll
