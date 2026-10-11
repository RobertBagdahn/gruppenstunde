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
    // Five text sizes plus two display sizes (Feldküche); Tailwind's default scale is replaced.
    fontSize: {
      caption: ["12px", { lineHeight: "16px" }],
      body: ["14px", { lineHeight: "20px" }],
      emphasis: ["16px", { lineHeight: "24px" }],
      section: ["20px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
      title: ["28px", { lineHeight: "34px", letterSpacing: "-0.02em" }],
      // Key figures (costs, kcal, portions) in stat tiles.
      metric: ["32px", { lineHeight: "36px", letterSpacing: "-0.02em" }],
      // Page titles inside the hero band only.
      display: ["clamp(2.25rem, 1.5rem + 3vw, 4rem)", { lineHeight: "1", letterSpacing: "-0.035em" }],
    },
    // Exactly three radii: 10 px controls, 16 px cards/dialogs, full for pills.
    borderRadius: {
      none: "0",
      lg: "10px",
      xl: "16px",
      full: "9999px",
    },
    extend: {
      fontFamily: {
        sans: ['Figtree', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Bricolage Grotesque', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Pine hero band behind navigation and page titles (Feldküche).
        hero: {
          DEFAULT: "hsl(var(--hero))",
          foreground: "hsl(var(--hero-foreground))",
          muted: "hsl(var(--hero-muted))",
          soft: "hsl(var(--hero-soft))",
        },
        // Tomato accent: costs, the logo tile and small highlights. Never a large surface.
        spice: {
          DEFAULT: "hsl(var(--spice))",
          soft: "hsl(var(--spice-soft))",
          foreground: "hsl(var(--spice-foreground))",
        },
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
        // Cards on the sage background: soft, long shadow instead of a grey border.
        card: "0 1px 2px rgb(20 35 27 / 0.06), 0 12px 32px -18px rgb(20 35 27 / 0.22)",
        soft: "0 1px 2px rgb(20 35 27 / 0.06), 0 6px 16px -10px rgb(20 35 27 / 0.18)",
        raised: "0 2px 4px rgb(20 35 27 / 0.06), 0 22px 40px -20px rgb(20 35 27 / 0.32)",
        // Surfaces that overlap the hero band (key-figure strip).
        float: "0 1px 2px rgb(20 35 27 / 0.06), 0 24px 48px -24px rgb(20 35 27 / 0.45)",
      },
      transitionTimingFunction: {
        // Default easing for page and section motion.
        out: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      },
      keyframes: {
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Route change: the new page fades in. Opacity only: a transform would make
        // `position: fixed` bars inside the page position against the wrapper while it runs.
        "page-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Cards and sections arriving one after another (see .stagger).
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // A changed number (portions, totals) gives a small nudge.
        pop: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
        "sheet-up": {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "page-in": "page-in 360ms cubic-bezier(0.2, 0.7, 0.2, 1) backwards",
        rise: "rise 420ms cubic-bezier(0.2, 0.7, 0.2, 1) backwards",
        pop: "pop 260ms cubic-bezier(0.2, 0.7, 0.2, 1)",
        "sheet-up": "sheet-up 320ms cubic-bezier(0.2, 0.7, 0.2, 1) backwards",
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssTypography],
};
