/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#F8F6F1",
        surface: "#FFFFFF",
        surfaceSecondary: "#F4F1EB",
        surfaceMuted: "#EEEAE2",
        textPrimary: "#15263B",
        textSecondary: "#687586",
        textMuted: "#89919B",
        primary: {
          DEFAULT: "#B96C32",        // Muted copper-orange
          hover: "#A65C28",
        },
        copper: {
          DEFAULT: "#B96C32",
          hover: "#A65C28",
          light: "#FBF6F0",
        },
        navy: {
          DEFAULT: "#15263B",        // Deep navy
          secondary: "#244B60",
          hover: "#1D3A4B",
          dark: "#0E1B2A",
        },
        status: {
          success: "#26764F",
          successBg: "#EAF4ED",
          warning: "#C47B16",
          warningBg: "#FFF3E1",
          error: "#B83D37",
          errorBg: "#FBECEA",
        },
        border: {
          DEFAULT: "#E4DED4",
          divider: "#EAE5DC",
          light: "#EFECE6",
        },
        selectedRow: "#F9F5EE",
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
