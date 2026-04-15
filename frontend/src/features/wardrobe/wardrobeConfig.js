// Registry: maps item keys → display metadata + CSS classes/variables
// Never import this in hot paths — only in wardrobe UI and StyleWrapper

export const WARDROBE_CONFIG = {
  // ── Themes ─────────────────────────────────────────────────────────────────
  cyber_study: {
    label: "Cyber Study",
    category: "themes",
    preview: "Animated neon gradient background",
    cssVars: {
      "--user-bg-gradient": "linear-gradient(135deg, #0f0c29, #302b63, #24243e, #1a1a2e)",
      "--user-bg-animate": "cyberbg 8s ease infinite",
    },
    bodyClass: "theme-cyber-study",
  },

  // ── Fonts ──────────────────────────────────────────────────────────────────
  scholarly_serif: {
    label: "Scholarly Serif",
    category: "fonts",
    preview: "A refined serif typeface for the studious mind.",
    cssVars: {
      "--user-font": "'Georgia', 'Times New Roman', serif",
    },
  },
  typewriter_pro: {
    label: "Typewriter Pro",
    category: "fonts",
    preview: "Every character typed with intention.",
    cssVars: {
      "--user-font": "'Courier New', 'Courier', monospace",
    },
  },

  // ── Rings ──────────────────────────────────────────────────────────────────
  ring_bronze: {
    label: "Bronze Ring",
    category: "rings",
    ringClass: "ring-2 ring-amber-700 ring-offset-2 ring-offset-base-100",
  },
  ring_silver: {
    label: "Silver Ring",
    category: "rings",
    ringClass: "ring-2 ring-gray-400 ring-offset-2 ring-offset-base-100",
  },
  ring_gold: {
    label: "Gold Ring",
    category: "rings",
    ringClass: "ring-2 ring-yellow-400 ring-offset-2 ring-offset-base-100",
  },
  ring_ruby: {
    label: "Ruby Ring",
    category: "rings",
    ringClass: "ring-2 ring-red-500 ring-offset-2 ring-offset-base-100",
  },
  ring_sapphire: {
    label: "Sapphire Ring",
    category: "rings",
    ringClass: "ring-2 ring-blue-500 ring-offset-2 ring-offset-base-100",
  },
  ring_emerald: {
    label: "Emerald Ring",
    category: "rings",
    ringClass: "ring-2 ring-emerald-500 ring-offset-2 ring-offset-base-100",
  },
  ring_amethyst: {
    label: "Amethyst Ring",
    category: "rings",
    ringClass: "ring-2 ring-purple-500 ring-offset-2 ring-offset-base-100",
  },
  ring_obsidian: {
    label: "Obsidian Ring",
    category: "rings",
    ringClass: "ring-2 ring-gray-900 ring-offset-2 ring-offset-base-100",
  },
  ring_ivory: {
    label: "Ivory Ring",
    category: "rings",
    ringClass: "ring-2 ring-stone-200 ring-offset-2 ring-offset-base-100",
  },
  ring_steel: {
    label: "Steel Ring",
    category: "rings",
    ringClass: "ring-2 ring-slate-500 ring-offset-2 ring-offset-base-100",
  },
  neon_halo: {
    label: "Neon Halo",
    category: "rings",
    // Animated ring — uses a CSS class defined in index.css
    ringClass: "neon-halo-ring",
  },

  // ── Overlays ───────────────────────────────────────────────────────────────
  rainy_window: {
    label: "Rainy Window",
    category: "overlays",
    preview: "A calming rain effect on your profile banner.",
    overlayClass: "rainy-window-overlay",
  },
}

export const CATEGORY_LABELS = {
  themes: "Themes",
  fonts: "Fonts",
  rings: "Rings",
  overlays: "Overlays",
}
