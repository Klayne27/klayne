// lib/utils/checkUnlocks.js

/**
 * Each rule is self-contained — drop a new object here to add a new unlock.
 *
 * trigger types:
 *   "level"        — pomodoroLevel >= threshold
 *   "totalHours"   — totalStudyDuration (minutes) / 60 >= threshold
 *   "weeklyHours"  — weeklyStats.studyDuration (minutes) / 60 >= threshold
 *   "monthlyHours" — monthlyStats.studyDuration (minutes) / 60 >= threshold
 *   "achievement"  — manually triggered externally (e.g. leaderboard wins)
 */
const UNLOCK_RULES = [
  // ── Fonts ─────────────────────────────────────────────────────────────────
  {
    id: "scholarly_serif",
    category: "fonts",
    trigger: "level",
    threshold: 5,
    items: ["scholarly_serif"],
    description: "Reach Level 5",
  },
  {
    id: "typewriter_pro",
    category: "fonts",
    trigger: "totalHours",
    threshold: 50,
    items: ["typewriter_pro"],
    description: "Study 50 total hours",
  },
  {
    id: "modern_minimalist",
    category: "fonts",
    trigger: "monthlyHours",
    threshold: 40,
    items: ["modern_minimalist"],
    description: "Study 40 hours in a single month",
  },
  {
    id: "retro_pixel",
    category: "fonts",
    trigger: "weeklyHours",
    threshold: 20,
    items: ["retro_pixel"],
    description: "Study 20 hours in a single week",
  },

  // ── Rings ─────────────────────────────────────────────────────────────────
  {
    id: "freshman_major_pack",
    category: "rings",
    trigger: "level",
    threshold: 10,
    items: [
      "ring_bronze",
      "ring_silver",
      "ring_gold",
      "ring_ruby",
      "ring_sapphire",
      "ring_emerald",
      "ring_amethyst",
      "ring_obsidian",
      "ring_ivory",
      "ring_steel",
    ],
    description: "Reach Level 10 — Freshman Major Pack",
  },
  {
    id: "scholars_glow",
    category: "rings",
    trigger: "level",
    threshold: 25,
    items: ["scholars_glow"],
    description: "Reach Level 25 — The Scholar's Glow",
  },
  {
    id: "diamond_edge",
    category: "rings",
    trigger: "level",
    threshold: 50,
    items: ["diamond_edge"],
    description: "Reach Level 50 — Diamond Edge",
  },

  // ── Overlays ──────────────────────────────────────────────────────────────
  {
    id: "rainy_window",
    category: "overlays",
    trigger: "totalHours",
    threshold: 150,
    items: ["rainy_window"],
    description: "Study 150 total hours",
  },
  {
    id: "sakura_breeze",
    category: "overlays",
    trigger: "totalHours",
    threshold: 300,
    items: ["sakura_breeze"],
    description: "Study 300 total hours",
  },
  {
    id: "matrix_code",
    category: "overlays",
    trigger: "weeklyHours",
    threshold: 20,
    items: ["matrix_code"],
    description: "Study 20 hours in a single week",
  },
  {
    id: "nebula_mist",
    category: "overlays",
    trigger: "monthlyHours",
    threshold: 60,
    items: ["nebula_mist"],
    description: "Study 60 hours in a single month",
  },
];

// Export rules so the frontend can show unlock conditions
export { UNLOCK_RULES };

/**
 * Idempotent — safe to call after every session.
 * Returns array of newly unlocked item IDs (empty if nothing new).
 *
 * NOTE: totalStudyDuration and stats durations are stored in MINUTES.
 */
export const checkUnlocks = async (user) => {
  const totalHours = (user.totalStudyDuration || 0) / 60;
  const weeklyHours = (user.weeklyStats?.studyDuration || 0) / 60;
  const monthlyHours = (user.monthlyStats?.studyDuration || 0) / 60;
  const level = user.pomodoroLevel || 0;

  const getValue = (trigger) => {
    switch (trigger) {
      case "level":
        return level;
      case "totalHours":
        return totalHours;
      case "weeklyHours":
        return weeklyHours;
      case "monthlyHours":
        return monthlyHours;
      default:
        return 0;
    }
  };

  const newlyUnlocked = [];

  for (const rule of UNLOCK_RULES) {
    if (rule.trigger === "achievement") continue; // handled externally

    const met = getValue(rule.trigger) >= rule.threshold;
    if (!met) continue;

    const owned = user.inventory[rule.category] || [];
    const missing = rule.items.filter((item) => !owned.includes(item));
    if (missing.length === 0) continue;

    user.inventory[rule.category].push(...missing);
    newlyUnlocked.push(...missing);
  }

  if (newlyUnlocked.length > 0) {
    user.markModified("inventory");
    await user.save();
  }

  return newlyUnlocked;
};
