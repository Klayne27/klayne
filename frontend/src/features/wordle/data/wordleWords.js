// frontend/src/features/wordle/data/wordleWords.js
import solutionsRaw from "./valid_solutions.csv?raw"
import guessesRaw from "./valid_guesses.csv?raw"

const parseWords = (raw) =>
  raw
    .split(/\r?\n/)
    .map((w) => w.trim().replace(/^"|"$/g, "").toLowerCase())
    .filter((w) => /^[a-z]{5}$/.test(w))

// Solutions are valid guesses too, so union both sets
export const WORDLE_VALID_GUESSES = new Set([
  ...parseWords(solutionsRaw),
  ...parseWords(guessesRaw),
])
