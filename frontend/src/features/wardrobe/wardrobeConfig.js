export const WARDROBE_CONFIG = {
  // ── Fonts ──────────────────────────────────────────────────────────────────
  scholarly_serif: {
    label: "Scholarly Serif",
    category: "fonts",
    preview: "A refined serif typeface for the studious mind.",
    unlockHint: "Reach Level 5",
    cssVars: { "--user-font": "'Georgia', 'Times New Roman', serif" },
  },
  typewriter_pro: {
    label: "Typewriter Pro",
    category: "fonts",
    preview: "Every character typed with intention.",
    unlockHint: "Study 50 total hours",
    cssVars: { "--user-font": "'Courier New', 'Courier', monospace" },
  },
  modern_minimalist: {
    label: "Modern Minimalist",
    category: "fonts",
    preview: "Clean, airy, distraction-free.",
    unlockHint: "Study 40 hours in a month",
    cssVars: { "--user-font": "'Inter', 'Helvetica Neue', sans-serif" },
  },
  retro_pixel: {
    label: "Retro Pixel",
    category: "fonts",
    preview: "Old-school 8-bit energy.",
    unlockHint: "Study 20 hours in a week",
    cssVars: { "--user-font": "'Press Start 2P', monospace" },
  },

  // ── Rings ──────────────────────────────────────────────────────────────────
  ring_bronze: {
    label: "Bronze Ring",
    category: "rings",
    unlockHint: "Reach Level 10",
    ringClass: "ring-2 ring-amber-700 ring-offset-2 ring-offset-base-100",
  },
  ring_silver: {
    label: "Silver Ring",
    category: "rings",
    unlockHint: "Reach Level 10",
    ringClass: "ring-2 ring-gray-400 ring-offset-2 ring-offset-base-100",
  },
  ring_gold: {
    label: "Gold Ring",
    category: "rings",
    unlockHint: "Reach Level 10",
    ringClass: "ring-2 ring-yellow-400 ring-offset-2 ring-offset-base-100",
  },
  ring_ruby: {
    label: "Ruby Ring",
    category: "rings",
    unlockHint: "Reach Level 10",
    ringClass: "ring-2 ring-red-500 ring-offset-2 ring-offset-base-100",
  },
  ring_sapphire: {
    label: "Sapphire Ring",
    category: "rings",
    unlockHint: "Reach Level 10",
    ringClass: "ring-2 ring-blue-500 ring-offset-2 ring-offset-base-100",
  },
  ring_emerald: {
    label: "Emerald Ring",
    category: "rings",
    unlockHint: "Reach Level 10",
    ringClass: "ring-2 ring-emerald-500 ring-offset-2 ring-offset-base-100",
  },
  ring_amethyst: {
    label: "Amethyst Ring",
    category: "rings",
    unlockHint: "Reach Level 10",
    ringClass: "ring-2 ring-purple-500 ring-offset-2 ring-offset-base-100",
  },
  ring_obsidian: {
    label: "Obsidian Ring",
    category: "rings",
    unlockHint: "Reach Level 10",
    ringClass: "ring-2 ring-gray-900 ring-offset-2 ring-offset-base-100",
  },
  ring_ivory: {
    label: "Ivory Ring",
    category: "rings",
    unlockHint: "Reach Level 10",
    ringClass: "ring-2 ring-stone-200 ring-offset-2 ring-offset-base-100",
  },
  ring_steel: {
    label: "Steel Ring",
    category: "rings",
    unlockHint: "Reach Level 10",
    ringClass: "ring-2 ring-slate-500 ring-offset-2 ring-offset-base-100",
  },
  scholars_glow: {
    label: "Scholar's Glow",
    category: "rings",
    unlockHint: "Reach Level 25",
    ringClass: "scholars-glow-ring", // CSS class below
  },
  diamond_edge: {
    label: "Diamond Edge",
    category: "rings",
    unlockHint: "Reach Level 50",
    ringClass: "diamond-edge-ring", // CSS class below
  },

  // ── Overlays ───────────────────────────────────────────────────────────────
  rainy_window: {
    label: "Rainy Window",
    category: "overlays",
    preview: "A calming rain effect.",
    unlockHint: "Study 150 total hours",
    overlayClass: "rainy-window-overlay",
  },
  sakura_breeze: {
    label: "Sakura Breeze",
    category: "overlays",
    preview: "Floating pink petals drift across the screen.",
    unlockHint: "Study 300 total hours",
    overlayClass: "sakura-breeze-overlay",
  },
  matrix_code: {
    label: "Matrix Code",
    category: "overlays",
    preview: "Falling green characters.",
    unlockHint: "Study 20 hours in a single week",
    overlayClass: "matrix-code-overlay",
  },
  nebula_mist: {
    label: "Nebula Mist",
    category: "overlays",
    preview: "Slow-moving space clouds drift behind your profile.",
    unlockHint: "Study 60 hours in a month",
    overlayClass: "nebula-mist-overlay",
  },
}

export const CATEGORY_LABELS = {
  fonts: "Fonts",
  rings: "Rings",
  overlays: "Overlays",
}
