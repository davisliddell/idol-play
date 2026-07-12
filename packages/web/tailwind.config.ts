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
        // Survivor-themed tribe colors
        'tribe-red': '#C8102E',
        'tribe-blue': '#003087',
        'tribe-yellow': '#FFD100',
        'tribe-green': '#00843D',
        'tribe-merged': '#6B238E',
        'tribe-orange': '#FF6F00',
      },
    },
  },
  plugins: [],
}
export default config
