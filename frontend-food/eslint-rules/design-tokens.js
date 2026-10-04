/**
 * ESLint rule `food/design-tokens` (food-design-system spec).
 *
 * Checks Tailwind classes in `className` attributes and in the string
 * arguments of `cn()`, `clsx()` and `cva()` and reports:
 * - Tailwind palette colours (`bg-amber-50`, `text-gray-500`, …) and
 *   arbitrary hex/rgb colours — use the semantic tokens instead,
 * - font sizes outside the scale (`text-xs`, `text-2xl`, `text-[11px]`) —
 *   use text-caption/body/emphasis/section/title,
 * - radii other than rounded-lg/xl/full/none,
 * - removed gradient utilities and the dark solid `bg-warning` surface,
 * - Material Symbols classes — use the Lucide `Icon` component.
 */

const PALETTE_HUES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const COLOR_UTILITIES =
  'bg|text|border(?:-[trblxy])?|ring|ring-offset|from|via|to|fill|stroke|outline|divide|placeholder|decoration|accent|caret|shadow';

const CHECKS = [
  {
    id: 'palette',
    test: new RegExp(`^(?:${COLOR_UTILITIES})-(?:${PALETTE_HUES})-(?:50|[1-9]00|950)(?:/\\d+)?$`),
    message: 'Tailwind-Palettenfarbe „{{token}}“: nutze semantische Tokens (z. B. warning, danger, muted).',
  },
  {
    id: 'arbitraryColor',
    test: new RegExp(`^(?:${COLOR_UTILITIES})-\\[(?:#|rgba?\\()`),
    message: 'Freie Farbe „{{token}}“: nutze semantische Tokens.',
  },
  {
    id: 'fontSize',
    test: /^text-(?:xs|sm|base|lg|xl|[2-9]xl|\[[\d.]+(?:px|rem|em)\])$/,
    message: 'Schriftgröße „{{token}}“ außerhalb der Skala: nutze text-caption, text-body, text-emphasis, text-section oder text-title.',
  },
  {
    id: 'radius',
    test: /^rounded(?:-(?:t|b|l|r|tl|tr|bl|br|s|e|ss|se|es|ee))?(?:-(?:sm|md|2xl|3xl|\[.*\]))?$/,
    message: 'Radius „{{token}}“ nicht erlaubt: nutze rounded-lg (Bedienelemente), rounded-xl (Karten) oder rounded-full.',
  },
  {
    id: 'removedGradient',
    test: /^gradient-(?:hero|primary|warm|fun|sunset|rainbow)$/,
    message: 'Verlauf „{{token}}“ wurde entfernt: nutze helle Token-Flächen (food-frontend-friendly-ux).',
  },
  {
    id: 'darkWarningSurface',
    test: /^bg-warning$/,
    message: '„{{token}}“ ist eine dunkle Fläche: nutze bg-warning-soft (Hinweise) oder bg-warning-bright (Balken, Punkte).',
  },
  {
    id: 'materialSymbols',
    test: /^material-symbols/,
    message: 'Material Symbols sind nicht erlaubt: nutze <Icon name="…" /> aus @/components/ui/icon.',
  },
];

const CLASS_HELPERS = new Set(['cn', 'clsx', 'cva']);

/** Strip variants (`hover:`, `md:`, `[&>svg]:`) and the important modifier. */
function baseUtility(token) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i++) {
    const ch = token[i];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    else if (ch === ':' && depth === 0) start = i + 1;
  }
  return token.slice(start).replace(/^!/, '').replace(/!$/, '');
}

function checkClassText(context, node, text, { partialStart = false, partialEnd = false } = {}) {
  const tokens = text.split(/\s+/);
  tokens.forEach((token, index) => {
    if (!token) return;
    // Tokens touching a `${…}` boundary are incomplete (e.g. `text-${size}`).
    if ((index === 0 && partialStart && !/^\s/.test(text)) || (index === tokens.length - 1 && partialEnd && !/\s$/.test(text))) {
      return;
    }
    const utility = baseUtility(token);
    for (const check of CHECKS) {
      if (check.test.test(utility)) {
        context.report({ node, messageId: check.id, data: { token } });
        return;
      }
    }
  });
}

/** String nodes already checked per lint run (a node can be reached via className and via cn()). */
const checkedNodes = new WeakMap();

function firstVisit(context, node) {
  let seen = checkedNodes.get(context);
  if (!seen) {
    seen = new WeakSet();
    checkedNodes.set(context, seen);
  }
  if (seen.has(node)) return false;
  seen.add(node);
  return true;
}

/** Recursively check every string that can end up in the class list. */
function checkExpression(context, node) {
  if (!node) return;
  if ((node.type === 'Literal' || node.type === 'TemplateLiteral') && !firstVisit(context, node)) return;
  switch (node.type) {
    case 'Literal':
      if (typeof node.value === 'string') checkClassText(context, node, node.value);
      break;
    case 'TemplateLiteral':
      node.quasis.forEach((quasi, index) => {
        checkClassText(context, quasi, quasi.value.cooked ?? quasi.value.raw, {
          partialStart: index > 0,
          partialEnd: index < node.quasis.length - 1,
        });
      });
      node.expressions.forEach((expression) => checkExpression(context, expression));
      break;
    case 'ConditionalExpression':
      checkExpression(context, node.consequent);
      checkExpression(context, node.alternate);
      break;
    case 'LogicalExpression':
      checkExpression(context, node.right);
      checkExpression(context, node.left);
      break;
    case 'ArrayExpression':
      node.elements.forEach((element) => checkExpression(context, element));
      break;
    case 'ObjectExpression':
      // clsx({ 'bg-amber-50': cond }) and cva variants ({ size: { sm: '…' } })
      node.properties.forEach((property) => {
        if (property.type !== 'Property') return;
        if (property.key.type === 'Literal') checkExpression(context, property.key);
        checkExpression(context, property.value);
      });
      break;
    case 'CallExpression':
      if (CLASS_HELPERS.has(calleeName(node.callee) ?? '')) {
        node.arguments.forEach((argument) => checkExpression(context, argument));
      }
      break;
    case 'JSXExpressionContainer':
      checkExpression(context, node.expression);
      break;
    default:
      break;
  }
}

function calleeName(callee) {
  return callee.type === 'Identifier' ? callee.name : null;
}

const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce food design tokens (colours, font sizes, radii, icons) in class names.' },
    schema: [],
    messages: Object.fromEntries(CHECKS.map((check) => [check.id, check.message])),
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className' && node.name.name !== 'class') return;
        checkExpression(context, node.value);
      },
      CallExpression(node) {
        if (!CLASS_HELPERS.has(calleeName(node.callee) ?? '')) return;
        node.arguments.forEach((argument) => checkExpression(context, argument));
      },
    };
  },
};

export default {
  meta: { name: 'eslint-plugin-food' },
  rules: { 'design-tokens': rule },
};
