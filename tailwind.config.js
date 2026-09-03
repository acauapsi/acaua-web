/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Acauã Dark Petrol / Forest Teal ─────────────────────────
        teal: {
          50:  '#e8f4f4',
          100: '#c5dede',
          200: '#9dc8c8',
          300: '#72b0b0',
          400: '#4d9696',
          500: '#2d7070',  // teal médio
          600: '#1e5050',  // surface cards dark
          700: '#163232',  // background dark principal
          800: '#112424',  // background dark secundário
          900: '#0a1717',  // background dark profundo
          950: '#050c0c',
        },
        // ── Acauã Sage Green ───────────────────────────────────────
        sage: {
          300: '#9db89e',
          400: '#7a9e7e',
          500: '#5f8462',
          600: '#456848',
        },
        // ── Pure White & Bright Slate (textos sempre brancos/claros) ─
        cream: {
          50:  '#ffffff',
          100: '#ffffff',
          200: '#f5f0e8',  // light mode background
          300: '#ffffff',  // texto primário dark (Puro Branco)
          400: '#ffffff',  // texto branco
          500: '#f8fafc',  // texto quase branco
          600: '#f1f5f9',  // texto secundário claro
          700: '#e2e8f0',  // texto auxiliar
          800: '#cbd5e1',
          900: '#94a3b8',
        },
        // ── Legacy Aliases mapped to Teal / White ───────────────────
        gold: {
          50:  '#e8f4f4',
          100: '#c5dede',
          200: '#9dc8c8',
          300: '#72b0b0',
          400: '#4d9696',
          500: '#2d7070',
          550: '#1e5050',
          600: '#1e5050',
          650: '#163232',
          700: '#163232',
          800: '#112424',
          900: '#0a1717',
          950: '#050c0c',
        },
        // ── Charcoal (Neutral Dark Teal - Zero Slate Blue) ──────────
        charcoal: {
          50:  '#f5f0e8',
          100: '#ede8de',
          200: '#e0d8cc',
          300: '#c8bfb0',
          400: '#9db0b0',
          500: '#72b0b0',
          600: '#4d9696',
          700: '#2d7070',
          800: '#163232',
          900: '#112424',
          950: '#0a1717',
        }
      },
      fontFamily: {
        sans:    ['Outfit', 'Inter', 'sans-serif'],
        heading: ['Playfair Display', 'Georgia', 'serif'],
        serif:   ['Playfair Display', 'Georgia', 'serif'],
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  plugins: [],
}
