import ruebertPreset from './tailwind.preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [ruebertPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
};
