// lib/utils/checkUnlocks.js
const UNLOCK_RULES = [
  // ════════════════════════════════════════
  // FONTS — Progress Rewards
  // ════════════════════════════════════════
  {
    id: "scholarly_serif",
    category: "fonts",
    trigger: "level",
    threshold: 5,
    items: ["scholarly_serif"],
    description: "Reach Level 5",
  },
  {
    id: "jetbrains_mono",
    category: "fonts",
    trigger: "level",
    threshold: 8,
    items: ["jetbrains_mono"],
    description: "Reach Level 8",
  },
  {
    id: "space_grotesk",
    category: "fonts",
    trigger: "level",
    threshold: 12,
    items: ["space_grotesk"],
    description: "Reach Level 12",
  },
  {
    id: "lora_serif",
    category: "fonts",
    trigger: "level",
    threshold: 18,
    items: ["lora_serif"],
    description: "Reach Level 18",
  },
  {
    id: "cinzel",
    category: "fonts",
    trigger: "level",
    threshold: 30,
    items: ["cinzel"],
    description: "Reach Level 30",
  },
  {
    id: "cormorant_garamond",
    category: "fonts",
    trigger: "level",
    threshold: 35,
    items: ["cormorant_garamond"],
    description: "Reach Level 35",
  },
  {
    id: "bangers",
    category: "fonts",
    trigger: "level",
    threshold: 40,
    items: ["bangers"],
    description: "Reach Level 40",
  },
  {
    id: "orbitron",
    category: "fonts",
    trigger: "level",
    threshold: 55,
    items: ["orbitron"],
    description: "Reach Level 55",
  },
  {
    id: "typewriter_pro",
    category: "fonts",
    trigger: "totalMinutes",
    threshold: 3000,
    items: ["typewriter_pro"],
    description: "Study 50 total hours",
  },
  {
    id: "playfair_display",
    category: "fonts",
    trigger: "totalMinutes",
    threshold: 6000,
    items: ["playfair_display"],
    description: "Study 100 total hours",
  },
  {
    id: "fira_code",
    category: "fonts",
    trigger: "totalMinutes",
    threshold: 9000,
    items: ["fira_code"],
    description: "Study 150 total hours",
  },
  {
    id: "dm_serif",
    category: "fonts",
    trigger: "totalMinutes",
    threshold: 15000,
    items: ["dm_serif"],
    description: "Study 250 total hours",
  },
  {
    id: "instrument_serif",
    category: "fonts",
    trigger: "totalMinutes",
    threshold: 30000,
    items: ["instrument_serif"],
    description: "Study 500 total hours",
  },
  // Sprint fonts
  {
    id: "modern_minimalist",
    category: "fonts",
    trigger: "monthlyMinutes",
    threshold: 2400,
    items: ["modern_minimalist"],
    description: "Study 40 hours in a month",
  },
  {
    id: "retro_pixel",
    category: "fonts",
    trigger: "weeklyMinutes",
    threshold: 1200,
    items: ["retro_pixel"],
    description: "Study 20 hours in a week",
  },

  // ════════════════════════════════════════
  // RINGS — Progress Rewards
  // ════════════════════════════════════════
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
    id: "elemental_pack",
    category: "rings",
    trigger: "level",
    threshold: 20,
    items: ["eternal_flame", "frozen_crystal", "electric_pulse"],
    description: "Reach Level 20",
  },
  {
    id: "scholars_glow",
    category: "rings",
    trigger: "level",
    threshold: 25,
    items: ["scholars_glow"],
    description: "Reach Level 25",
  },
  {
    id: "nature_pack",
    category: "rings",
    trigger: "level",
    threshold: 35,
    items: ["ivy_league", "sakura_ring", "golden_hour"],
    description: "Reach Level 35",
  },
  {
    id: "diamond_edge",
    category: "rings",
    trigger: "level",
    threshold: 50,
    items: ["diamond_edge"],
    description: "Reach Level 50",
  },
  {
    id: "cosmic_dust",
    category: "rings",
    trigger: "level",
    threshold: 50,
    items: ["cosmic_dust"],
    description: "Reach Level 50",
  },
  {
    id: "neon_pack",
    category: "rings",
    trigger: "level",
    threshold: 60,
    items: ["neon_circuit", "neon_halo_ring"],
    description: "Reach Level 60",
  },
  {
    id: "zen_blossom",
    category: "rings",
    trigger: "level",
    threshold: 65,
    items: ["zen_blossom"],
    description: "Reach Level 65",
  },
  {
    id: "celestial_orbit",
    category: "rings",
    trigger: "level",
    threshold: 70,
    items: ["celestial_orbit"],
    description: "Reach Level 70",
  },
  {
    id: "prestige_pack",
    category: "rings",
    trigger: "level",
    threshold: 80,
    items: ["aurora_borealis", "void_smoke"],
    description: "Reach Level 80",
  },
  {
    id: "magma_flow",
    category: "rings",
    trigger: "level",
    threshold: 85,
    items: ["magma_flow"],
    description: "Reach Level 85",
  },
  {
    id: "cyber_neon_pulse",
    category: "rings",
    trigger: "level",
    threshold: 90,
    items: ["cyber_neon_pulse"],
    description: "Reach Level 90",
  },
  {
    id: "legends_pack",
    category: "rings",
    trigger: "level",
    threshold: 100,
    items: ["solar_flare", "crimson_tide"],
    description: "Reach Level 100",
  },
  // Hour-gated rings
  {
    id: "ring_10h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 600,
    items: ["sakura_ring"],
    description: "Study 10 total hours",
  },
  {
    id: "ring_100h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 6000,
    items: ["golden_hour"],
    description: "Study 100 total hours",
  },
  {
    id: "ring_500h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 30000,
    items: ["aurora_borealis"],
    description: "Study 500 total hours",
  },
  {
    id: "ring_1000h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 60000,
    items: ["solar_flare"],
    description: "Study 1000 total hours",
  },
  // Sprint rings
  {
    id: "ring_weekly_sprint",
    category: "rings",
    trigger: "weeklyMinutes",
    threshold: 1500,
    items: ["electric_pulse"],
    description: "Study 25 hours in a week",
  },
  {
    id: "ring_monthly_champion",
    category: "rings",
    trigger: "monthlyMinutes",
    threshold: 3600,
    items: ["neon_circuit"],
    description: "Study 60 hours in a month",
  },

  // ════════════════════════════════════════
  // OVERLAYS — Progress Rewards
  // ════════════════════════════════════════
  {
    id: "snowfall",
    category: "overlays",
    trigger: "level",
    threshold: 15,
    items: ["snowfall"],
    description: "Reach Level 15",
  },
  {
    id: "fireflies",
    category: "overlays",
    trigger: "level",
    threshold: 22,
    items: ["fireflies"],
    description: "Reach Level 22",
  },
  {
    id: "northern_lights",
    category: "overlays",
    trigger: "level",
    threshold: 45,
    items: ["northern_lights"],
    description: "Reach Level 45",
  },
  {
    id: "star_rain",
    category: "overlays",
    trigger: "level",
    threshold: 70,
    items: ["star_rain"],
    description: "Reach Level 70",
  },
  {
    id: "dust_particles",
    category: "overlays",
    trigger: "totalMinutes",
    threshold: 3000,
    items: ["dust_particles"],
    description: "Study 50 total hours",
  },
  {
    id: "rainy_window",
    category: "overlays",
    trigger: "totalMinutes",
    threshold: 9000,
    items: ["rainy_window"],
    description: "Study 150 total hours",
  },
  {
    id: "sakura_breeze",
    category: "overlays",
    trigger: "totalMinutes",
    threshold: 18000,
    items: ["sakura_breeze"],
    description: "Study 300 total hours",
  },
  {
    id: "falling_leaves",
    category: "overlays",
    trigger: "totalMinutes",
    threshold: 12000,
    items: ["falling_leaves"],
    description: "Study 200 total hours",
  },
  {
    id: "fog_drift",
    category: "overlays",
    trigger: "totalMinutes",
    threshold: 24000,
    items: ["fog_drift"],
    description: "Study 400 total hours",
  },
  {
    id: "nebula_mist",
    category: "overlays",
    trigger: "totalMinutes",
    threshold: 6000,
    items: ["nebula_mist"],
    description: "Study 100 total hours",
  },
  {
    id: "confetti_burst",
    category: "overlays",
    trigger: "totalMinutes",
    threshold: 60000,
    items: ["confetti_burst"],
    description: "Study 1000 total hours",
  },
  // Sprint overlays
  {
    id: "matrix_code",
    category: "overlays",
    trigger: "weeklyMinutes",
    threshold: 1200,
    items: ["matrix_code"],
    description: "Study 20 hours in a week",
  },
  {
    id: "ember_storm",
    category: "overlays",
    trigger: "weeklyMinutes",
    threshold: 1800,
    items: ["ember_storm"],
    description: "Study 30 hours in a week",
  },
  {
    id: "crystal_frost",
    category: "overlays",
    trigger: "monthlyMinutes",
    threshold: 4800,
    items: ["crystal_frost"],
    description: "Study 80 hours in a month",
  },

  // ════════════════════════════════════════
  // NAMEPLATES — Progress Rewards
  // ════════════════════════════════════════
  {
    id: "np_golden_ribbon",
    category: "nameplates",
    trigger: "level",
    threshold: 5,
    items: ["golden_ribbon"],
    description: "Reach Level 5",
  },
  {
    id: "np_gothic_parchment",
    category: "nameplates",
    trigger: "level",
    threshold: 15,
    items: ["gothic_parchment"],
    description: "Reach Level 15",
  },
  {
    id: "np_cyber_hud",
    category: "nameplates",
    trigger: "level",
    threshold: 25,
    items: ["cyber_hud"],
    description: "Reach Level 25",
  },
  {
    id: "np_prismatic",
    category: "nameplates",
    trigger: "level",
    threshold: 40,
    items: ["prismatic"],
    description: "Reach Level 40",
  },
  {
    id: "np_obsidian_seal",
    category: "nameplates",
    trigger: "level",
    threshold: 60,
    items: ["obsidian_seal"],
    description: "Reach Level 60",
  },
  {
    id: "np_celestial_script",
    category: "nameplates",
    trigger: "level",
    threshold: 80,
    items: ["celestial_script"],
    description: "Reach Level 80",
  },
  {
    id: "np_scholar_crest",
    category: "nameplates",
    trigger: "totalMinutes",
    threshold: 6000,
    items: ["scholar_crest"],
    description: "Study 100 total hours",
  },
  {
    id: "np_inferno_tag",
    category: "nameplates",
    trigger: "weeklyMinutes",
    threshold: 1800,
    items: ["inferno_tag"],
    description: "Study 30 hours in a week",
  },
];

export { UNLOCK_RULES };

export const checkUnlocks = async (user) => {
  const totalMinutes = user.totalStudyDuration || 0;
  const weeklyMinutes = user.weeklyStats?.studyDuration || 0;
  const monthlyMinutes = user.monthlyStats?.studyDuration || 0;
  const level = user.pomodoroLevel || 0;

  const getValue = (trigger) => {
    switch (trigger) {
      case "level":
        return level;
      case "totalMinutes":
        return totalMinutes;
      case "weeklyMinutes":
        return weeklyMinutes;
      case "monthlyMinutes":
        return monthlyMinutes;
      default:
        return 0;
    }
  };

  const newlyUnlocked = [];

  // Ensure nameplates array exists (migration safety)
  if (!user.inventory.nameplates) user.inventory.nameplates = [];

  for (const rule of UNLOCK_RULES) {
    if (rule.trigger === "achievement") continue;
    if (getValue(rule.trigger) < rule.threshold) continue;

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
