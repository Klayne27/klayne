import { WORDLE_VALID_GUESSES } from "../../features/wordle/data/wordleWords"

export const useWordleValidation = () => {
  const isValidWord = (word) => WORDLE_VALID_GUESSES.has(word.toLowerCase())
  return { isValidWord }
}
