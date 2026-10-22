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
    // Eight sizes (design D5, food-design-system): sizes that change with the viewport use clamp().
    fontSize: {
      caption: ["12px", { lineHeight: "16px" }],
      body: ["14px", { lineHeight: "20px" }],
      emphasis: ["16px", { lineHeight: "24px" }],
      section: ["clamp(1.125rem, 1.0rem + 0.5vw, 1.25rem)", { lineHeight: "28px", letterSpacing: "-0.01em" }],
      heading: ["clamp(1.375rem, 1.2rem + 0.6vw, 1.625rem)", { lineHeight: "30px", letterSpacing: "-0.015em" }],
      title: ["clamp(2rem, 1.5rem + 1.5vw, 2.75rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      display: ["clamp(2rem, 1.2rem + 3vw, 3.5rem)", { lineHeight: "1", letterSpacing: "-0.035em" }],
      metric: ["32px", { lineHeight: "36px", letterSpacing: "-0.02em" }],
    },
    // Four radii: 8 small elements, 12 controls, 20 cards and dialogs, full for pills.
    borderRadius: {
      none: "0",
      sm: "8px",
      lg: "12px",
      xl: "20px",
      full: "9999px",
    },
    extend: {
      fontFamily: {
        sans: ['Figtree', 'Figtree Fallback', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Bricolage Grotesque', 'Bricolage Fallback', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Tomato accent: costs, the logo tile and small highlights. Never a large surface.
        spice: {
          DEFAULT: "hsl(var(--spice))",
          soft: "hsl(var(--spice-soft))",
          foreground: "hsl(var(--spice-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "hsl(var(--primary-dark))",
          bright: "hsl(var(--primary-bright))",
          soft: "hsl(var(--primary-soft))",
          "soft-border": "hsl(var(--primary-soft-border))",
        },
        line: "hsl(var(--line))",
        sticker: "hsl(var(--sticker))",
        // Recipe-type tints: soft surface and its text colour (food-design-system).
        category: {
          breakfast: { soft: "hsl(var(--category-breakfast))", foreground: "hsl(var(--category-breakfast-foreground))" },
          warm: { soft: "hsl(var(--category-warm))", foreground: "hsl(var(--category-warm-foreground))" },
          cold: { soft: "hsl(var(--category-cold))", foreground: "hsl(var(--category-cold-foreground))" },
          dessert: { soft: "hsl(var(--category-dessert))", foreground: "hsl(var(--category-dessert-foreground))" },
          snack: { soft: "hsl(var(--category-snack))", foreground: "hsl(var(--category-snack-foreground))" },
          "recipe-part": { soft: "hsl(var(--category-recipe-part))", foreground: "hsl(var(--category-recipe-part-foreground))" },
          drink: { soft: "hsl(var(--category-drink))", foreground: "hsl(var(--category-drink-foreground))" },
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
        card: "0 1px 2px rgba(27, 31, 29, 0.06), 0 8px 24px rgba(27, 31, 29, 0.08)",
        soft: "0 1px 3px rgba(27, 31, 29, 0.12)",
        raised: "0 2px 4px rgba(27, 31, 29, 0.06), 0 16px 40px rgba(27, 31, 29, 0.14)",
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
