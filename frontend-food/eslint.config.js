import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'src/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Number formatting must go through src/lib/format.ts (the single source
    // of truth, kept in lockstep with the backend via a shared fixture) —
    // .toFixed() bypasses German-locale formatting and commercial rounding.
    files: ['**/*.tsx'],
    ignores: ['**/*.test.tsx', 'src/__tests__/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='toFixed']",
          message: 'Use formatNumber/formatEuro/formatWeight from @/lib/format instead of toFixed().',
        },
      ],
    },
  },
  {
    files: [
      'src/components/ingredients/IngredientMergeDialog.tsx',
      'src/components/meal/VariantSliderDialog.tsx',
      'src/components/recipe/InlineIngredientEditor.tsx',
      'src/components/recipe/WizardStepBasis.tsx',
      'src/components/recipe/WizardStepMethod.tsx',
      'src/pages/ingredients/IngredientDetailPage.tsx',
      'src/pages/ingredients/statistics/components/HeatmapExplorer.tsx',
      'src/pages/recipes/RecipeListPage.tsx',
    ],
    rules: {
      'react-hooks/exhaustive-deps': 'error',
    },
  },
);
