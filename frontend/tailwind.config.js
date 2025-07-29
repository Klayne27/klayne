import daisyui from "daisyui";
import daisyUIThemes from "daisyui/src/theming/themes";
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      height: {
        dvh: "100dvh",
        "screen-d": "var(--dvh)",
      },
      minHeight: {
        dvh: "100dvh",
        "screen-d": "var(--dvh)",
      },
      keyframes: {
        // Define a 'like-bounce' keyframe animation
        "like-bounce": {
          "0%, 100%": { transform: "scale(1)" }, // Start and end at normal size
          "50%": { transform: "scale(1.4)" }, // Enlarge in the middle
          "75%": { transform: "scale(0.5)" }, // Slightly shrink for a bounce effect
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
      },
      animation: {
        // Apply the keyframe animation
        "like-bounce": "like-bounce 0.3s ease-in-out", // 0.3 seconds duration, ease-in-out timing
        "pin-down": "pin-down 0.2s ease-out", // Faster animation for pin
        "bookmark-pop": "bookmark-pop 0.2s ease-out", // Faster animation for bookmark
        "repost-spin": "repost-spin 0.4s ease-in-out", // 0.4s duration for a smooth effect
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
};
