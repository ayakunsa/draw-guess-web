/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mat: '#0A5C4B',
        'mat-deep': '#074537',
        'dot-minor': '#2F8B75',
        'dot-major': '#7CCDB5',
        vermilion: '#FF4A1C',
        paper: '#FFF8E8',
        ink: '#10231E',
        'ink-soft': '#4A5C55',
        marigold: '#FFC21F',
        bubblegum: '#FF9CC7',
        sky: '#86D2FF',
      },
      fontFamily: {
        display: ['Bricolage Grotesque Variable', 'sans-serif'],
        body: ['Instrument Sans Variable', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
