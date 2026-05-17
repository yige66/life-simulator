/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-m-plus-rounded)', 'sans-serif'],
      },
      colors: {
        sakura: {
          DEFAULT: '#FFB7C5',
          dark: '#FF8FA3',
          glow: 'rgba(255, 183, 197, 0.4)',
        },
        aurora: {
          DEFAULT: '#A7F3D0',
          green: '#A7F3D0',
          glow: '#34D399',
        },
        night: '#1A0B2E',
        deep: '#2E073F',
        moonlight: '#F5F5F7',
        parchment: {
          DEFAULT: '#f4e4bc',
          dark: '#e2d1a4',
          text: '#4a3728',
        },
        leather: {
          brown: '#3d1f14',
        },
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      dropShadow: {
        'sakura': '0 0 15px rgba(255, 183, 197, 0.4)',
        'aurora': '0 0 15px rgba(167, 243, 208, 0.4)',
      }
    },
  },
  plugins: [],
};
