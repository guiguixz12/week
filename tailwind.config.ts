import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1D9E75',
          50:  '#E8F7F2',
          100: '#C5EAD9',
          200: '#8ED5B8',
          300: '#57BF96',
          400: '#2DAD82',
          500: '#1D9E75',
          600: '#178561',
          700: '#116B4D',
          800: '#0B523A',
          900: '#063826',
        },
        sidebar: {
          dark:   '#161B22',
          border: '#2D333B',
          hover:  '#21262d',
        },
        surface: {
          DEFAULT: '#1C2128',
          subtle:  '#161B22',
          hover:   '#21262d',
          border:  '#2D333B',
        },
      },
    },
  },
  plugins: [],
}
export default config
