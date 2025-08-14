import daisyui from "daisyui"
import daisyUIThemes from "daisyui/src/theming/themes"
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "primary-glow": "var(--p)",
        "secondary-glow": "var(--s)",
      },
      height: {
        dvh: "100dvh",
        "screen-d": "var(--dvh)",
      },
      minHeight: {
        dvh: "100dvh",
        "screen-d": "var(--dvh)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255,255,255,0.1)" },
          "50%": { boxShadow: "0 0 40px rgba(255,255,255,0.3)" },
        },
        // Define a 'like-bounce' keyframe animation
        "like-bounce": {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.4)" }, // Main jump up
          "60%": { transform: "scale(0.8)" }, // Initial squash on landing
          "80%": { transform: "scale(1.1)" }, // Primary overshoot
          "90%": { transform: "scale(0.95)" }, // Secondary small squash
          "100%": { transform: "scale(1)" }, // Settle
        },
        // NEW: Pin animation (down and back up)
        "pin-down": {
          "0%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(4px)" }, // Move down
          "100%": { transform: "translateY(0)" }, // Move back up
        },
        // NEW: Bookmark animation (slight pop/scale)
        "bookmark-pop": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.2)" }, // Pop out slightly
        },
        "repost-spin": {
          "0%": { transform: "rotate(0deg) scale(1)" },
          "50%": { transform: "rotate(180deg) scale(1.3)" }, // Spin halfway and grow
          "100%": { transform: "rotate(360deg) scale(1)" }, // Complete the spin and return to normal size
        },
        // ✨ NEW: Keyframes for the count animation
        "slide-up-new": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-up-old": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(-100%)" },
        },
        "slide-down-new": {
          from: { transform: "translateY(-100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-down-old": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
      },
      animation: {
        "like-bounce": "like-bounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "pin-down": "pin-down 0.2s ease-out", // Faster animation for pin
        "bookmark-pop": "bookmark-pop 0.2s ease-out", // Faster animation for bookmark
        "repost-spin": "repost-spin 0.4s ease-in-out", // 0.4s duration for a smooth effect
        "slide-up-new": "slide-up-new 0.3s forwards",
        "slide-up-old": "slide-up-old 0.3s forwards",
        "slide-down-new": "slide-down-new 0.3s forwards",
        "slide-down-old": "slide-down-old 0.3s forwards",
        "fade-in": "fade-in 0.5s ease-out forwards",
      },
    },
  },
  plugins: [daisyui],

  daisyui: {
    themes: [
      {
        black: {
          ...daisyUIThemes["black"],
          primary: "rgb(29, 155, 240)",
          secondary: "rgb(24, 24, 24)",
        },
      },
      // {
      //   light: {
      //     ...daisyUIThemes["light"],
      //     secondary: "#d6d6d6",
      //   },
      // },
      {
        forest: {
          ...daisyUIThemes["forest"],
          secondary: "hsl(141, 69%, 10%)",
        },
      },
      {
        synthwave: {
          ...daisyUIThemes["synthwave"],
          secondary: "hsl(197, 87%, 20%)",
        },
      },
      {
        dim: {
          ...daisyUIThemes["dim"],
          secondary: "hsl(12, 100%, 30%)",
        },
      },
      {
        valentine: {
          ...daisyUIThemes["valentine"],
          secondary: "hsl(254, 86%, 90%)",
        },
      },
      {
        night: {
          ...daisyUIThemes["night"],
          secondary: "hsl(234, 89%, 24%)",
        },
      },
      {
        wireframe: {
          ...daisyUIThemes["wireframe"],
          secondary: "hsl(0, 0%, 92%)",
        },
      },
      {
        dim: {
          ...daisyUIThemes["dim"],
          secondary: "hsl(12, 100%, 68%)",
        },
      },
      {
        halloween: {
          ...daisyUIThemes["halloween"],
          secondary: "hsl(278, 100%, 20%)",
        },
      },
      {
        business: {
          ...daisyUIThemes["business"],
          secondary: "hsl(200, 13%, 30%)",
        },
      },
      {
        dracula: {
          ...daisyUIThemes["dracula"],
          secondary: "hsl(265, 89%, 20%)",
        },
      },
      "coffee",
      "cupcake",
      "cyberpunk",
      "retro",
      "pastel",
      "lemonade",
    ],
  },
}
