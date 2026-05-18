import { useCallback, useRef, useState } from "react"

const STAGGER_MS = 250 // Snappier stagger matching NYT feel
const HALF_FLIP_MS = 250 // Time it takes to rotate 90 degrees face-down

export function useWordleReveal() {
  const [reveal, setReveal] = useState(null)

  const resultRef = useRef(null)
  const startMsRef = useRef(null)
  const timersRef = useRef([])

  const beginReveal = useCallback((rowIndex, word) => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    resultRef.current = null
    startMsRef.current = Date.now()

    // Initialize all slots to 'idle'
    setReveal({
      rowIndex,
      word,
      phases: Array(5).fill("idle"),
      colors: Array(5).fill(null),
    })

    for (let i = 0; i < 5; i++) {
      // ── TIMER 1: Initiate 3D Flip-Out Face-Down Rotation ──
      timersRef.current.push(
        setTimeout(() => {
          setReveal((prev) => {
            if (prev?.rowIndex !== rowIndex) return prev
            const phases = [...prev.phases]
            phases[i] = "out" // COMMANDS FRAMER MOTION TO INTERCEPT ROTATION TO 90°
            return { ...prev, phases }
          })
        }, i * STAGGER_MS),
      )

      // ── TIMER 2: Midpoint Check (Swap state class colors & execute Flip-In) ──
      timersRef.current.push(
        setTimeout(
          () => {
            setReveal((prev) => {
              if (prev?.rowIndex !== rowIndex) return prev

              const result = resultRef.current
              // GUARD: If server data hasn't arrived yet, hold edge-on at 90°
              if (!result) return prev

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

  const commitResult = useCallback((result, rowIndex) => {
    resultRef.current = result
    const elapsed = startMsRef.current ? Date.now() - startMsRef.current : Infinity

    setReveal((prev) => {
      if (!prev || prev.rowIndex !== rowIndex) return prev

      const phases = [...prev.phases]
      const colors = [...prev.colors]

      prev.phases.forEach((phase, i) => {
        // Unblock any tile that already reached the 90° midpoint and is waiting for data
        if (phase === "out") {
          const midpointMs = i * STAGGER_MS + HALF_FLIP_MS
          if (elapsed >= midpointMs - 20) {
            phases[i] = "in"
            colors[i] = result[i]
          }
        }
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
