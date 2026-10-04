import tailwindcssAnimate from 'tailwindcss-animate';
import tailwindcssTypography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    // Exactly five font sizes (design tokens); Tailwind's default scale is replaced.
    fontSize: {
      caption: ["12px", { lineHeight: "16px" }],
      body: ["14px", { lineHeight: "20px" }],
      emphasis: ["16px", { lineHeight: "24px" }],
      section: ["20px", { lineHeight: "28px" }],
      title: ["28px", { lineHeight: "36px" }],
    },
    // Exactly three radii: 8 px controls, 12 px cards/dialogs, full for pills.
    borderRadius: {
      none: "0",
      lg: "8px",
      xl: "12px",
      full: "9999px",
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          bright: "hsl(var(--primary-bright))",
          soft: "hsl(var(--primary-soft))",
          "soft-border": "hsl(var(--primary-soft-border))",
        },
        // Area colours: tone + tint, only for icon tiles, nav indicator and small accents.
        area: {
          recipes: { DEFAULT: "hsl(var(--area-recipes))", soft: "hsl(var(--area-recipes-soft))" },
          ingredients: { DEFAULT: "hsl(var(--area-ingredients))", soft: "hsl(var(--area-ingredients-soft))" },
          planner: { DEFAULT: "hsl(var(--area-planner))", soft: "hsl(var(--area-planner-soft))" },
          shopping: { DEFAULT: "hsl(var(--area-shopping))", soft: "hsl(var(--area-shopping-soft))" },
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          soft: "hsl(var(--success-soft))",
          border: "hsl(var(--success-border))",
          bright: "hsl(var(--success-bright))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          soft: "hsl(var(--warning-soft))",
          border: "hsl(var(--warning-border))",
          bright: "hsl(var(--warning-bright))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
          soft: "hsl(var(--danger-soft))",
          border: "hsl(var(--danger-border))",
          bright: "hsl(var(--danger-bright))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          soft: "hsl(var(--info-soft))",
          border: "hsl(var(--info-border))",
          bright: "hsl(var(--info-bright))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        nutri: {
          a: "hsl(var(--nutri-a))",
          b: "hsl(var(--nutri-b))",
          c: "hsl(var(--nutri-c))",
          d: "hsl(var(--nutri-d))",
          e: "hsl(var(--nutri-e))",
          "dark-text": "hsl(var(--nutri-dark-text))",
        },
      },
      boxShadow: {
        // Cards on the light background: fine, warm shadow instead of a grey border.
        card: "0 1px 2px rgb(31 41 55 / 0.05), 0 4px 16px rgb(31 41 55 / 0.05)",
        soft: "0 1px 2px rgb(31 41 55 / 0.05), 0 4px 16px rgb(31 41 55 / 0.05)",
        raised: "0 2px 4px rgb(31 41 55 / 0.06), 0 12px 28px rgb(31 41 55 / 0.08)",
      },
      keyframes: {
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "scale-in": "scale-in 0.4s ease-out forwards",
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssTypography],
};
