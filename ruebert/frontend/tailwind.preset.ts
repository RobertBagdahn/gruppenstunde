// Tailwind preset for Rübert layout D. Colours resolve to the HSL variables in src/styles/tokens.css.
// Usage in tailwind.config.ts: `presets: [ruebertPreset]`.

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const ruebertPreset = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: token('background'),
        shell: token('shell'),
        panel: token('panel'),
        sunken: token('sunken'),
        'row-hover': token('row-hover'),
        'row-active': token('row-active'),
        border: token('border'),
        'border-row': token('border-row'),
        'border-strong': token('border-strong'),
        foreground: {
          DEFAULT: token('foreground'),
          strong: token('foreground-strong'),
          2: token('foreground-2'),
        },
        'muted-foreground': token('muted-foreground'),
        link: token('link'),
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-foreground'),
          soft: token('accent-soft'),
          border: token('accent-border'),
          text: token('accent-text'),
        },
        warning: {
          soft: token('warning-soft'),
          border: token('warning-border'),
          text: token('warning-text'),
        },
        danger: { text: token('danger-text') },
        traffic: {
          red: token('traffic-red'),
          yellow: token('traffic-yellow'),
          green: token('traffic-green'),
          blue: token('traffic-blue'),
        },
        chart: {
          band: token('chart-band'),
          oos: token('chart-oos'),
          grid: token('chart-grid'),
        },
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        card: { DEFAULT: token('card'), foreground: token('card-foreground') },
        popover: { DEFAULT: token('popover'), foreground: token('popover-foreground') },
        input: token('input'),
        ring: token('ring'),
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        label: ['11px', { lineHeight: '1.3', letterSpacing: '0.08em', fontWeight: '600' }],
        caption: ['12px', { lineHeight: '1.4' }],
        dense: ['13px', { lineHeight: '1.45' }],
        body: ['14px', { lineHeight: '1.45' }],
        emphasis: ['16px', { lineHeight: '1.35' }],
        section: ['20px', { lineHeight: '1.25' }],
        title: ['24px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      spacing: {
        sidebar: 'var(--sidebar-width)',
        topbar: 'var(--topbar-height)',
      },
    },
  },
};

export default ruebertPreset;
