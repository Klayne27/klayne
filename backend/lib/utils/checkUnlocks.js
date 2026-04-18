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
    threshold: 3,
    items: ["slate_outline"],
    description: "Reach Level 3",
  },
  {
    id: "ring_bronze_unlock",
    category: "rings",
    trigger: "level",
    threshold: 6,
    items: ["ring_bronze"],
    description: "Reach Level 6 — Bronze Ring",
  },
  {
    id: "ring_silver_unlock",
    category: "rings",
    trigger: "level",
    threshold: 8,
    items: ["ring_silver"],
    description: "Reach Level 8 — Silver Ring",
  },
  {
    id: "ring_gold_unlock",
    category: "rings",
    trigger: "level",
    threshold: 10,
    items: ["ring_gold"],
    description: "Reach Level 10 — Gold Ring",
  },
  {
    id: "ring_ruby_unlock",
    category: "rings",
    trigger: "level",
    threshold: 12,
    items: ["ring_ruby"],
    description: "Reach Level 12 — Ruby Ring",
  },
  {
    id: "ring_sapphire_unlock",
    category: "rings",
    trigger: "level",
    threshold: 14,
    items: ["ring_sapphire"],
    description: "Reach Level 14 — Sapphire Ring",
  },
  {
    id: "ring_emerald_unlock",
    category: "rings",
    trigger: "level",
    threshold: 16,
    items: ["ring_emerald"],
    description: "Reach Level 16 — Emerald Ring",
  },
  {
    id: "ring_amethyst_unlock",
    category: "rings",
    trigger: "level",
    threshold: 18,
    items: ["ring_amethyst"],
    description: "Reach Level 18 — Amethyst Ring",
  },
  {
    id: "ring_obsidian_unlock",
    category: "rings",
    trigger: "level",
    threshold: 20,
    items: ["ring_obsidian"],
    description: "Reach Level 20 — Obsidian Ring",
  },
  {
    id: "ring_ivory_unlock",
    category: "rings",
    trigger: "level",
    threshold: 22,
    items: ["ring_ivory"],
    description: "Reach Level 22 — Ivory Ring",
  },
  {
    id: "ring_steel_unlock",
    category: "rings",
    trigger: "level",
    threshold: 24,
    items: ["ring_steel"],
    description: "Reach Level 24 — Steel Ring",
  },

  // ── Tier 2: Single-color soft glow (Level 15–35) ──
  {
    id: "neon_halo_unlock",
    category: "rings",
    trigger: "level",
    threshold: 30,
    items: ["neon_halo_ring"],
    description: "Reach Level 30",
  },
  {
    id: "frozen_crystal",
    category: "rings",
    trigger: "level",
    threshold: 32,
    items: ["frozen_crystal"],
    description: "Reach Level 32",
  },
  {
    id: "rose_quartz",
    category: "rings",
    trigger: "level",
    threshold: 34,
    items: ["rose_quartz"],
    description: "Reach Level 34",
  },
  {
    id: "scholars_glow_unlock",
    category: "rings",
    trigger: "level",
    threshold: 36,
    items: ["scholars_glow"],
    description: "Reach Level 36",
  },
  {
    id: "copper_coil",
    category: "rings",
    trigger: "level",
    threshold: 38,
    items: ["copper_coil"],
    description: "Reach Level 38",
  },
  {
    id: "lavender_drift",
    category: "rings",
    trigger: "level",
    threshold: 40,
    items: ["lavender_drift"],
    description: "Reach Level 40",
  },
  {
    id: "blood_moon_unlock",
    category: "rings",
    trigger: "level",
    threshold: 42,
    items: ["blood_moon"],
    description: "Reach Level 42",
  },
  {
    id: "twilight_band",
    category: "rings",
    trigger: "level",
    threshold: 44,
    items: ["twilight_band"],
    description: "Reach Level 44",
  },
  {
    id: "nature_pack",
    category: "rings",
    trigger: "level",
    threshold: 46,
    items: ["ivy_league"],
    description: "Reach Level 46",
  },
  {
    id: "spectral_shift",
    category: "rings",
    trigger: "level",
    threshold: 48,
    items: ["spectral_shift"],
    description: "Reach Level 48",
  },
  {
    id: "thunder_strike_unlock",
    category: "rings",
    trigger: "level",
    threshold: 50,
    items: ["thunder_strike"],
    description: "Reach Level 50",
  },

  // ── Tier 3: Dual-color / color-cycling (Level 40–60) ──
  {
    id: "prism_spin",
    category: "rings",
    trigger: "level",
    threshold: 55,
    items: ["prism_spin"],
    description: "Reach Level 55",
  },
  {
    id: "seafoam_wave",
    category: "rings",
    trigger: "level",
    threshold: 57,
    items: ["seafoam_wave"],
    description: "Reach Level 57",
  },

  {
    id: "diamond_edge",
    category: "rings",
    trigger: "level",
    threshold: 59,
    items: ["diamond_edge"],
    description: "Reach Level 59",
  },
  {
    id: "void_static",
    category: "rings",
    trigger: "level",
    threshold: 61,
    items: ["void_static"],
    description: "Reach Level 61",
  },
  {
    id: "cosmic_dust",
    category: "rings",
    trigger: "level",
    threshold: 63,
    items: ["cosmic_dust"],
    description: "Reach Level 63",
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
    id: "abyssal_unlock",
    category: "rings",
    trigger: "level",
    threshold: 67,
    items: ["abyssal"],
    description: "Reach Level 67",
  },
  {
    id: "celestial_unlock",
    category: "rings",
    trigger: "level",
    threshold: 69,
    items: ["celestial_orbit"],
    description: "Reach Level 69",
  },
  {
    id: "phantom_drift",
    category: "rings",
    trigger: "level",
    threshold: 71,
    items: ["phantom_drift"],
    description: "Reach Level 71",
  },
  {
    id: "void_smoke_unlock",
    category: "rings",
    trigger: "level",
    threshold: 73,
    items: ["void_smoke"],
    description: "Reach Level 73",
  },

  // ── Tier 5: Elite (Level 85–100) ──
  {
    id: "magma_flow_unlock",
    category: "rings",
    trigger: "level",
    threshold: 75,
    items: ["magma_flow"],
    description: "Reach Level 75",
  },
  {
    id: "cyber_neon_unlock",
    category: "rings",
    trigger: "level",
    threshold: 77,
    items: ["cyber_neon_pulse"],
    description: "Reach Level 77",
  },
  {
    id: "quantum_flux",
    category: "rings",
    trigger: "level",
    threshold: 79,
    items: ["quantum_flux"],
    description: "Reach Level 79",
  },
  {
    id: "crimson_tide_unlock",
    category: "rings",
    trigger: "level",
    threshold: 81,
    items: ["crimson_tide"],
    description: "Reach Level 81",
  },

  // ── Total Hours ──
  {
    id: "sakura_250h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 15000,
    items: ["sakura_ring"],
    description: "Study 250 total hours",
  },
  {
    id: "moonbeam_350h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 21000,
    items: ["moonbeam"],
    description: "Study 350 total hours",
  },
  {
    id: "amber_sunset_500h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 30000,
    items: ["amber_sunset"],
    description: "Study 500 total hours",
  },
  {
    id: "deep_ocean_150h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 36000,
    items: ["deep_ocean_ring"],
    description: "Study 600 total hours",
  },
  {
    id: "aurora_750h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 45000,
    items: ["aurora_borealis"],
    description: "Study 750 total hours",
  },
  {
    id: "starfield_500h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 51000,
    items: ["starfield_ring"],
    description: "Study 850 total hours",
  },
  {
    id: "singularity_750h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 60000,
    items: ["singularity_ring"],
    description: "Study 1000 total hours",
  },
  {
    id: "solar_flare_1000h",
    category: "rings",
    trigger: "totalMinutes",
    threshold: 90000,
    items: ["solar_flare"],
    description: "Study 1500 total hours",
  },

  // ── Weekly Sprints (high intensity, temporary) ──
  {
    id: "grindstone_15h_wk",
    category: "rings",
    trigger: "weeklyMinutes",
    threshold: 900,
    items: ["grindstone_ring"],
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
    id: "electric_30h_wk",
    category: "rings",
    trigger: "weeklyMinutes",
    threshold: 1800,
    items: ["electric_pulse"],
    description: "Study 30 hours in a week",
  },

  // ── Monthly Sprints (consistency, temporary) ──
  {
    id: "persistence_60h_mo",
    category: "rings",
    trigger: "monthlyMinutes",
    threshold: 3600,
    items: ["persistence_ring"],
    description: "Study 60 hours in a month",
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
