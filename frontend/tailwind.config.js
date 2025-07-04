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
      {
        light: {
          ...daisyUIThemes["light"],
          secondary: "#d6d6d6",
        },
      },
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
      "coffee",
      "halloween",
      "business",
      "cupcake",
      "luxury",
      "dracula",
      "cyberpunk",
      "retro",
      "pastel",
    ],
  },
};
