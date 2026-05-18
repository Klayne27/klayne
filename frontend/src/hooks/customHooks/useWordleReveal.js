import { useCallback, useRef, useState } from "react"

const STAGGER_MS = 350 // gap between each tile starting its flip
const HALF_FLIP_MS = 350 // duration of each half (out OR in)

/**
 * Manages the per-tile reveal animation, completely decoupled from server timing.
 *
 * Flow:
 *  - beginReveal(rowIndex, word)  → starts flip timers immediately on submit
 *  - commitResult(result, rowIndex) → called when server responds; unblocks
 *    any tiles still holding at 90° and pre-loads colors for upcoming tiles
 *  - clearReveal() → called after all tiles finish (~2100ms)
 */
export function useWordleReveal() {
  const [reveal, setReveal] = useState(null)
  // reveal: { rowIndex, word, phases: Array<'idle'|'out'|'in'>, colors: Array<string|null> }

  const resultRef = useRef(null) // server result, arrives async
  const startMsRef = useRef(null) // timestamp of beginReveal(), used in commitResult
  const timersRef = useRef([])

  const beginReveal = useCallback((rowIndex, word) => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    resultRef.current = null
    startMsRef.current = Date.now()

    setReveal({
      rowIndex,
      word,
      phases: Array(5).fill("idle"),
      colors: Array(5).fill(null),
    })

    for (let i = 0; i < 5; i++) {
      // ── Phase 1: start rotating the tile face-down ───────────────────
      timersRef.current.push(
        setTimeout(() => {
          setReveal((prev) => {
            if (prev?.rowIndex !== rowIndex) return prev
            const phases = [...prev.phases]
            phases[i] = "out"
            return { ...prev, phases }
          })
        }, i * STAGGER_MS),
      )

      // ── Phase 2 (midpoint): apply color & rotate back ────────────────
      // If server hasn't responded yet the tile stays in 'out' (held at 90°).
      // commitResult() will flip all still-waiting 'out' tiles when data arrives.
      timersRef.current.push(
        setTimeout(
          () => {
            setReveal((prev) => {
              if (prev?.rowIndex !== rowIndex) return prev
              const result = resultRef.current
              if (!result) return prev // hold at 90° — commitResult() will resolve
              const phases = [...prev.phases]
              const colors = [...prev.colors]
              phases[i] = "in"
              colors[i] = result[i]
              return { ...prev, phases, colors }
            })
          },
          i * STAGGER_MS + HALF_FLIP_MS,
        ),
      )
    }
  }, [])

  /**
   * Called as soon as the server responds.
   * Immediately unblocks any tiles whose midpoint has already passed (they're
   * holding at 90°), and stores the result for tiles whose midpoints haven't
   * fired yet (their timer will pick it up from resultRef).
   */
  const commitResult = useCallback((result, rowIndex) => {
    resultRef.current = result
    const elapsed = startMsRef.current ? Date.now() - startMsRef.current : Infinity

    setReveal((prev) => {
      if (!prev || prev.rowIndex !== rowIndex) return prev

      const phases = [...prev.phases]
      const colors = [...prev.colors]

      prev.phases.forEach((phase, i) => {
        if (phase !== "out") return // 'idle' tiles are handled by their own timer

        const midpointMs = i * STAGGER_MS + HALF_FLIP_MS
        // Only flip-in if this tile's midpoint has already elapsed
        // (i.e. it's genuinely holding at 90° waiting for us)
        if (elapsed >= midpointMs - 30) {
          phases[i] = "in"
          colors[i] = result[i]
        }
        // else: timer hasn't fired yet; it will read resultRef on its own schedule
      })

      return { ...prev, phases, colors }
    })
  }, [])

  const clearReveal = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    resultRef.current = null
    startMsRef.current = null
    setReveal(null)
  }, [])

  return { reveal, beginReveal, commitResult, clearReveal }
}
