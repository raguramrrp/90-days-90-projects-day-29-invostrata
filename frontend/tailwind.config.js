/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        workspace: "#F4F6F4",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#286B55",
          light: "#EAF3EE",
          dark: "#1c4d3d"
        },
        text: {
          primary: "#24312D",
          secondary: "#74817B",
          muted: "#9AA6A0"
        },
        border: {
          DEFAULT: "#E0E6E1",
          light: "#EEF2EF"
        },
        status: {
          warning: "#B7791F",
          warningBg: "#FEF7EC",
          critical: "#C2413B",
          criticalBg: "#FDF2F2",
          info: "#527A9B",
          infoBg: "#EEF4F8",
          success: "#286B55",
          successBg: "#EAF3EE"
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
