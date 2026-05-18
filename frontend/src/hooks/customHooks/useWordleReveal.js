// hooks/customHooks/useWordleReveal.js
//
// Drives the tile flip animation using CSS classes (tile-flip-out / tile-flip-in).
// No Framer Motion. No rotateX. No black flash.
//
// Flow per tile i:
//   t = i * STAGGER_MS          → set phase = "out"  (CSS plays flip-out: scaleY 1→0)
//   t = i * STAGGER_MS + HALF   → set phase = "in" + color  (CSS plays flip-in: scaleY 0→1)
//
// If the server result hasn't arrived by the midpoint, the tile holds at scaleY(0)
// (still in "out" phase, animation frozen at `forwards`) until commitResult fires.

import { useCallback, useRef, useState } from "react"

const STAGGER_MS = 300 // gap between each tile starting its flip
const HALF_MS = 250 // duration of the flip-out half (must match CSS flip-out duration)
const TOTAL_MS = 5 * STAGGER_MS + HALF_MS // ~1750ms for all 5 tiles to finish

export function useWordleReveal() {
  const [reveal, setReveal] = useState(null) // null = no animation in progress

  const resultRef = useRef(null) // server result, set by commitResult()
  const startRef = useRef(null) // Date.now() when beginReveal was called
  const timersRef = useRef([]) // all pending setTimeout ids

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  // ── beginReveal ───────────────────────────────────────────────────────────
  // Called immediately after the user hits Enter, before the API responds.
  const beginReveal = useCallback((rowIndex, word) => {
    clearTimers()
    resultRef.current = null
    startRef.current = Date.now()

    // All tiles start in "idle" (no CSS animation class, no color)
    setReveal({
      rowIndex,
      word,
      phases: Array(5).fill("idle"),
      colors: Array(5).fill(null),
    })

    for (let i = 0; i < 5; i++) {
      // Phase 1: start squishing this tile (flip-out)
      timersRef.current.push(
        setTimeout(() => {
          setReveal((prev) => {
            if (!prev || prev.rowIndex !== rowIndex) return prev
            const phases = [...prev.phases]
            phases[i] = "out"
            return { ...prev, phases }
          })
        }, i * STAGGER_MS),
      )

      // Phase 2: tile is flat (scaleY≈0) — swap color and unsquish (flip-in)
      timersRef.current.push(
        setTimeout(
          () => {
            setReveal((prev) => {
              if (!prev || prev.rowIndex !== rowIndex) return prev

              const result = resultRef.current
              // Server hasn't responded yet — stay in "out" (frozen flat).
              // commitResult() will unblock this tile when data arrives.
              if (!result) return prev

              const phases = [...prev.phases]
              const colors = [...prev.colors]
              phases[i] = "in"
              colors[i] = result[i]
              return { ...prev, phases, colors }
            })
          },
          i * STAGGER_MS + HALF_MS,
        ),
      )
    }

    // Clean up reveal state after the last tile finishes
    timersRef.current.push(
      setTimeout(
        () => {
          setReveal(null)
        },
        TOTAL_MS + HALF_MS + 100,
      ), // a little buffer after last flip-in finishes
    )
  }, [])

  // ── commitResult ──────────────────────────────────────────────────────────
  // Called in onSuccess. Unblocks any tiles stuck at scaleY(0) waiting for color.
  const commitResult = useCallback((result, rowIndex) => {
    resultRef.current = result
    const elapsed = startRef.current ? Date.now() - startRef.current : Infinity

    setReveal((prev) => {
      if (!prev || prev.rowIndex !== rowIndex) return prev

      const phases = [...prev.phases]
      const colors = [...prev.colors]

      for (let i = 0; i < 5; i++) {
        if (phases[i] === "out") {
          // This tile hit its midpoint timer but the guard blocked it (no result yet).
          // If we're past its midpoint, unblock immediately.
          const midpoint = i * STAGGER_MS + HALF_MS
          if (elapsed >= midpoint - 20) {
            phases[i] = "in"
            colors[i] = result[i]
          }
          // If we're NOT past its midpoint yet, the timer will fire later
          // and find resultRef.current already set, so it proceeds normally.
        }
      }

      return { ...prev, phases, colors }
    })
  }, [])

  // ── clearReveal ───────────────────────────────────────────────────────────
  // Called on error — cancel everything and reset.
  const clearReveal = useCallback(() => {
    clearTimers()
    resultRef.current = null
    startRef.current = null
    setReveal(null)
  }, [])

  return { reveal, beginReveal, commitResult, clearReveal }
}
