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
  {
    id: "raleway",
    category: "fonts",
    trigger: "level",
    threshold: 14,
    items: ["raleway"],
    description: "Reach Level 14",
  },
  {
    id: "spectral",
    category: "fonts",
    trigger: "level",
    threshold: 22,
    items: ["spectral"],
    description: "Reach Level 22",
  },
  {
    id: "josefin_slab",
    category: "fonts",
    trigger: "totalMinutes",
    threshold: 4500,
    items: ["josefin_slab"],
    description: "Study 75 total hours",
  },
  {
    id: "bebas_neue",
    category: "fonts",
    trigger: "weeklyMinutes",
    threshold: 900,
    items: ["bebas_neue"],
    description: "Study 15 hours in a week",
  },
  {
    id: "permanent_marker",
    category: "fonts",
    trigger: "monthlyMinutes",
    threshold: 1200,
    items: ["permanent_marker"],
    description: "Study 20 hours in a month",
  },

  // ════════════════════════════════════════
  // RINGS — Progress Rewards
  // ════════════════════════════════════════
  {
    id: "slate_outline",
    category: "rings",
    trigger: "level",
    threshold: 5,
    items: ["slate_outline"],
    description: "Reach Level 5",
  },
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
    description: "Reach Level 10 — Freshman Pack",
  },

  // ── Tier 2: Single-color soft glow (Level 15–35) ──
  {
    id: "jade_glow",
    category: "rings",
    trigger: "level",
    threshold: 15,
    items: ["jade_glow"],
    description: "Reach Level 15",
  },
  {
    id: "elemental_pack",
    category: "rings",
    trigger: "level",
    threshold: 20,
    items: ["eternal_flame", "frozen_crystal"],
    description: "Reach Level 20",
  },
  {
    id: "rose_quartz",
    category: "rings",
    trigger: "level",
    threshold: 22,
    items: ["rose_quartz"],
    description: "Reach Level 22",
  },
  {
    id: "scholars_glow_unlock",
    category: "rings",
    trigger: "level",
    threshold: 25,
    items: ["scholars_glow"],
    description: "Reach Level 25",
  },
  {
    id: "copper_coil",
    category: "rings",
    trigger: "level",
    threshold: 28,
    items: ["copper_coil"],
    description: "Reach Level 28",
  },
  {
    id: "twilight_band",
    category: "rings",
    trigger: "level",
    threshold: 32,
    items: ["twilight_band"],
    description: "Reach Level 32",
  },
  {
    id: "nature_pack",
    category: "rings",
    trigger: "level",
    threshold: 35,
    items: ["ivy_league", "golden_hour"],
    description: "Reach Level 35",
  },

  // ── Tier 3: Dual-color / color-cycling (Level 40–60) ──
  {
    id: "prism_spin",
    category: "rings",
    trigger: "level",
    threshold: 40,
    items: ["prism_spin"],
    description: "Reach Level 40",
  },
  {
    id: "seafoam_wave",
    category: "rings",
    trigger: "level",
    threshold: 45,
    items: ["seafoam_wave"],
    description: "Reach Level 45",
  },
  {
    id: "diamond_cosmic",
    category: "rings",
    trigger: "level",
    threshold: 50,
    items: ["diamond_edge", "cosmic_dust"],
    description: "Reach Level 50",
  },
  {
    id: "void_static",
    category: "rings",
    trigger: "level",
    threshold: 55,
    items: ["void_static"],
    description: "Reach Level 55",
  },
  {
    id: "neon_halo_unlock",
    category: "rings",
    trigger: "level",
    threshold: 60,
    items: ["neon_halo_ring"],
    description: "Reach Level 60",
  },

  // ── Tier 4: Complex / intense (Level 65–80) ──
  {
    id: "zen_blossom_unlock",
    category: "rings",
    trigger: "level",
    threshold: 65,
    items: ["zen_blossom"],
    description: "Reach Level 65",
  },
  {
    id: "celestial_unlock",
    category: "rings",
    trigger: "level",
    threshold: 70,
    items: ["celestial_orbit"],
    description: "Reach Level 70",
  },
  {
    id: "phantom_drift",
    category: "rings",
    trigger: "level",
    threshold: 75,
    items: ["phantom_drift"],
    description: "Reach Level 75",
  },
  {
    id: "void_smoke_unlock",
    category: "rings",
    trigger: "level",
    threshold: 80,
    items: ["void_smoke"],
    description: "Reach Level 80",
  },

  // ── Tier 5: Elite (Level 85–100) ──
  {
    id: "magma_flow_unlock",
    category: "rings",
    trigger: "level",
    threshold: 85,
    items: ["magma_flow"],
    description: "Reach Level 85",
  },
  {
    id: "cyber_neon_unlock",
    category: "rings",
    trigger: "level",
    threshold: 90,
    items: ["cyber_neon_pulse"],
    description: "Reach Level 90",
  },
  {
    id: "quantum_flux",
    category: "rings",
    trigger: "level",
    threshold: 95,
    items: ["quantum_flux"],
    description: "Reach Level 95",
  },
  {
    id: "crimson_tide_unlock",
    category: "rings",
    trigger: "level",
    threshold: 100,
    items: ["crimson_tide"],
    description: "Reach Level 100",
  },

  // ── Total Hours ──
  {
    id: "sakura_10h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 600,
    items: ["sakura_ring"],
    description: "Study 10 total hours",
  },
  {
    id: "moonbeam_25h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 1500,
    items: ["moonbeam"],
    description: "Study 25 total hours",
  },
  {
    id: "amber_sunset_75h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 4500,
    items: ["amber_sunset"],
    description: "Study 75 total hours",
  },
  {
    id: "deep_ocean_150h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 9000,
    items: ["deep_ocean_ring"],
    description: "Study 150 total hours",
  },
  {
    id: "aurora_300h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 18000,
    items: ["aurora_borealis"],
    description: "Study 300 total hours",
  },
  {
    id: "starfield_500h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 30000,
    items: ["starfield_ring"],
    description: "Study 500 total hours",
  },
  {
    id: "singularity_750h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 45000,
    items: ["singularity_ring"],
    description: "Study 750 total hours",
  },
  {
    id: "solar_flare_1000h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 60000,
    items: ["solar_flare"],
    description: "Study 1000 total hours",
  },

  // ── Weekly Sprints (high intensity, temporary) ──
  {
    id: "electric_15h_wk",
    category: "rings",
    trigger: "weeklyMinutes",
    threshold: 900,
    items: ["electric_pulse"],
    description: "Study 15 hours in a week",
  },
  {
    id: "overdrive_20h_wk",
    category: "rings",
    trigger: "weeklyMinutes",
    threshold: 1200,
    items: ["overdrive_ring"],
    description: "Study 20 hours in a week",
  },
  {
    id: "neon_circuit_25h_wk",
    category: "rings",
    trigger: "weeklyMinutes",
    threshold: 1500,
    items: ["neon_circuit"],
    description: "Study 25 hours in a week",
  },
  {
    id: "grindstone_30h_wk",
    category: "rings",
    trigger: "weeklyMinutes",
    threshold: 1800,
    items: ["grindstone_ring"],
    description: "Study 30 hours in a week",
  },

  // ── Monthly Sprints (consistency, temporary) ──
  {
    id: "persistence_30h_mo",
    category: "rings",
    trigger: "monthlyMinutes",
    threshold: 1800,
    items: ["persistence_ring"],
    description: "Study 30 hours in a month",
  },
  {
    id: "marathon_50h_mo",
    category: "rings",
    trigger: "monthlyMinutes",
    threshold: 3000,
    items: ["marathon_ring"],
    description: "Study 50 hours in a month",
  },
  {
    id: "titan_70h_mo",
    category: "rings",
    trigger: "monthlyMinutes",
    threshold: 4200,
    items: ["titan_ring"],
    description: "Study 70 hours in a month",
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
  //──────────────────────────────────────────────────── NEW ADDITIONS  UNORGANIZED ────────────────────────────────────────────────────

  // ── NEW FONTS ────────────────────────────────────────────────────
  {
    id: "raleway",
    category: "fonts",
    trigger: "level",
    threshold: 14,
    items: ["raleway"],
    description: "Reach Level 14",
  },
  {
    id: "spectral",
    category: "fonts",
    trigger: "level",
    threshold: 22,
    items: ["spectral"],
    description: "Reach Level 22",
  },
  {
    id: "josefin_slab",
    category: "fonts",
    trigger: "totalMinutes",
    threshold: 4500,
    items: ["josefin_slab"],
    description: "Study 75 total hours",
  },
  {
    id: "bebas_neue",
    category: "fonts",
    trigger: "weeklyMinutes",
    threshold: 900,
    items: ["bebas_neue"],
    description: "Study 15 hours in a week",
  },
  {
    id: "permanent_marker",
    category: "fonts",
    trigger: "monthlyMinutes",
    threshold: 1200,
    items: ["permanent_marker"],
    description: "Study 20 hours in a month",
  },

  // ── NEW RINGS ────────────────────────────────────────────────────
  {
    id: "lavender_drift",
    category: "rings",
    trigger: "level",
    threshold: 7,
    items: ["lavender_drift"],
    description: "Reach Level 7",
  },
  {
    id: "spectral_shift",
    category: "rings",
    trigger: "level",
    threshold: 13,
    items: ["spectral_shift"],
    description: "Reach Level 13",
  },
  {
    id: "thunder_strike_unlock",
    category: "rings",
    trigger: "level",
    threshold: 38,
    items: ["thunder_strike"],
    description: "Reach Level 38",
  },
  {
    id: "blood_moon_unlock",
    category: "rings",
    trigger: "level",
    threshold: 62,
    items: ["blood_moon"],
    description: "Reach Level 62",
  },
  {
    id: "abyssal_unlock",
    category: "rings",
    trigger: "level",
    threshold: 68,
    items: ["abyssal"],
    description: "Reach Level 68",
  },
  {
    id: "verdant_pulse_unlock",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 2100,
    items: ["verdant_pulse"],
    description: "Study 35 total hours",
  },
  {
    id: "opal_sheen_unlock",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 7500,
    items: ["opal_sheen"],
    description: "Study 125 total hours",
  },
  {
    id: "emerald_depths_unlock",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 21000,
    items: ["emerald_depths"],
    description: "Study 350 total hours",
  },

  // ── NEW NAMEPLATES ────────────────────────────────────────────────
  {
    id: "np_silver_thread",
    category: "nameplates",
    trigger: "level",
    threshold: 8,
    items: ["silver_thread"],
    description: "Reach Level 8",
  },
  {
    id: "np_midnight_ink",
    category: "nameplates",
    trigger: "level",
    threshold: 35,
    items: ["midnight_ink"],
    description: "Reach Level 35",
  },
  {
    id: "np_crystalline",
    category: "nameplates",
    trigger: "level",
    threshold: 55,
    items: ["crystalline"],
    description: "Reach Level 55",
  },
  {
    id: "np_rose_gold",
    category: "nameplates",
    trigger: "totalMinutes",
    threshold: 3000,
    items: ["rose_gold_frame"],
    description: "Study 50 total hours",
  },
  {
    id: "np_laurel_wreath",
    category: "nameplates",
    trigger: "totalMinutes",
    threshold: 15000,
    items: ["laurel_wreath"],
    description: "Study 250 total hours",
  },
  {
    id: "np_storm_seal",
    category: "nameplates",
    trigger: "weeklyMinutes",
    threshold: 1500,
    items: ["storm_seal"],
    description: "Study 25 hours in a week",
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
