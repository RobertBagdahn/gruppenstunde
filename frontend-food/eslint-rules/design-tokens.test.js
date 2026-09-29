/**
 * RuleTester tests for `food/design-tokens` (run by Vitest, see vite.config.ts).
 */
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import plugin from './design-tokens.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const rule = plugin.rules['design-tokens'];

ruleTester.run('food/design-tokens', rule, {
  valid: [
    // semantic tokens, scale sizes and allowed radii
    '<div className="bg-warning-soft text-warning border-warning-border rounded-xl text-body" />',
    '<button className="rounded-lg text-caption hover:bg-muted md:text-section rounded-full" />',
    '<div className="rounded-t-xl rounded-none bg-card text-foreground" />',
    // token utilities with opacity and arbitrary token colours
    '<div className="bg-primary/10 text-[hsl(var(--primary))]" />',
    // dynamic parts of template literals are not judged
    '<div className={`text-${size} rounded-${radius} bg-${tone}-soft`} />',
    // conditional classes with tokens
    "<div className={active ? 'bg-success-soft text-success' : 'text-muted-foreground'} />",
    "cn('rounded-lg text-body', active && 'bg-primary text-primary-foreground')",
    // non-class strings and other functions are ignored
    "const message = 'rounded bg-amber-50 text-xs';",
    "format('text-xs')",
  ],
  invalid: [
    {
      code: '<div className="bg-amber-50 text-amber-700" />',
      errors: [{ messageId: 'palette' }, { messageId: 'palette' }],
    },
    {
      code: '<div className="hover:bg-red-500/10 dark:text-gray-400" />',
      errors: [{ messageId: 'palette' }, { messageId: 'palette' }],
    },
    {
      code: '<div className="bg-[#16a34a]" />',
      errors: [{ messageId: 'arbitraryColor' }],
    },
    {
      code: '<p className="text-xs md:text-2xl text-[11px]" />',
      errors: [{ messageId: 'fontSize' }, { messageId: 'fontSize' }, { messageId: 'fontSize' }],
    },
    {
      code: '<div className="rounded rounded-md rounded-t-2xl rounded-[5px]" />',
      errors: [{ messageId: 'radius' }, { messageId: 'radius' }, { messageId: 'radius' }, { messageId: 'radius' }],
    },
    {
      code: '<span className="material-symbols-outlined">restaurant</span>',
      errors: [{ messageId: 'materialSymbols' }],
    },
    {
      code: "<div className={active ? 'bg-emerald-500' : 'text-sm'} />",
      errors: [{ messageId: 'palette' }, { messageId: 'fontSize' }],
    },
    {
      code: '<div className={`px-2 text-xs ${active ? "rounded-md" : ""}`} />',
      errors: [{ messageId: 'fontSize' }, { messageId: 'radius' }],
    },
    {
      code: "const classes = cn('rounded-md', { 'bg-amber-50': warn }, ['text-lg']);",
      errors: [{ messageId: 'radius' }, { messageId: 'palette' }, { messageId: 'fontSize' }],
    },
    {
      code: "const button = cva('rounded-md', { variants: { size: { sm: 'text-xs' } } });",
      errors: [{ messageId: 'radius' }, { messageId: 'fontSize' }],
    },
    {
      // reported once even though reachable via className and via cn()
      code: "<div className={cn('text-xs')} />",
      errors: [{ messageId: 'fontSize' }],
    },
  ],
});
