import cron from "node-cron";
import { getOrCreateWordlePuzzle } from "../lib/utils/wordleUtils.js";

export const ensureTodayWordlePuzzle = async () => {
  const puzzle = await getOrCreateWordlePuzzle();
  console.log(`Wordle puzzle ready for ${puzzle.date} (#${puzzle.puzzleNumber})`);
  return puzzle;
};

const wordleDailyReset = cron.schedule(
  "0 0 * * *",
  async () => {
    try {
      await ensureTodayWordlePuzzle();
    } catch (error) {
      console.error("Wordle daily reset error:", error);
    }
  },
  { scheduled: false },
);

export const startWordleDailyCronJob = () => {
  wordleDailyReset.start();
  console.log("Wordle daily reset cron job started");
};

export const stopWordleDailyCronJob = () => {
  wordleDailyReset.stop();
};
