// All unlock rules in one place — add new ones here only
const UNLOCK_RULES = [
  // Level-based unlocks
  {
    id: "scholarly_serif",
    type: "fonts",
    trigger: "level",
    threshold: 5,
    items: ["scholarly_serif"],
  },
  {
    id: "freshman_major_pack",
    type: "rings",
    trigger: "level",
    threshold: 10,
    // Bundle: pushes multiple items at once
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
  },
  {
    id: "neon_halo",
    type: "rings",
    trigger: "level",
    threshold: 20,
    items: ["neon_halo"],
  },
  // Hour-based unlocks (totalStudyDuration is in seconds)
  {
    id: "typewriter_pro",
    type: "fonts",
    trigger: "hours",
    threshold: 50,
    items: ["typewriter_pro"],
  },
  {
    id: "cyber_study",
    type: "themes",
    trigger: "hours",
    threshold: 100,
    items: ["cyber_study"],
  },
  {
    id: "rainy_window",
    type: "overlays",
    trigger: "hours",
    threshold: 150,
    items: ["rainy_window"],
  },
];

/**
 * Idempotent — safe to call after every session.
 * Returns array of newly unlocked item IDs (empty if nothing new).
 */
export const checkUnlocks = async (user) => {
  const totalHours = (user.totalStudyDuration || 0) / 60;
  const level = user.pomodoroLevel || 0;
  const newlyUnlocked = [];

  for (const rule of UNLOCK_RULES) {
    const metThreshold =
      rule.trigger === "level" ? level >= rule.threshold : totalHours >= rule.threshold;

    if (!metThreshold) continue;

    const category = user.inventory[rule.type] || [];

    // Check if ALL items in this rule's bundle are already owned (idempotency)
    const allOwned = rule.items.every((item) => category.includes(item));
    if (allOwned) continue;

    // Add only the missing ones
    const missing = rule.items.filter((item) => !category.includes(item));
    user.inventory[rule.type].push(...missing);
    newlyUnlocked.push(...missing);
  }

  if (newlyUnlocked.length > 0) {
    await user.save();
  }

  return newlyUnlocked;
};
