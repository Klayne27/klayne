import { useCallback, useState } from "react"

/**
 * reveal shape:
 *   null                                  → idle
 *   { rowIndex, word, results: null }     → pending API response (tiles show as "filled")
 *   { rowIndex, word, results: string[] } → CSS flip animation running
 */
export function useWordleReveal() {
  const [reveal, setReveal] = useState(null)

  // Call immediately on submit so the guess appears right away
  const beginPending = useCallback((rowIndex, word) => {
    setReveal({ rowIndex, word, results: null })
  }, [])

  // Call when the API returns — triggers the flip animation
  const commitResult = useCallback((results) => {
    setReveal((prev) => (prev ? { ...prev, results } : null))
  }, [])

  const clearReveal = useCallback(() => setReveal(null), [])

  return { reveal, beginPending, commitResult, clearReveal }
}
