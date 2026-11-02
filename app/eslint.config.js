// ESLint flat config: recommended JS and TypeScript rules, the Playwright rules for e2e/, and
// eslint-config-prettier last so formatting is Prettier's job alone (npm run format).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'test-results',
      'playwright-report',
      'e2e/.generated',
      'e2e/shots',
      'tests/golden',
      'tests/fixtures',
      'public',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // `catch (e) {}` is the app's way of ignoring an API that is not there (clipboard, badge, share)
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  // the app itself runs in the browser
  { files: ['src/**/*.ts'], languageOptions: { globals: globals.browser } },
  // the build fills __ASSETS__ in (vite.config.ts)
  { files: ['src/sw.js'], languageOptions: { globals: { ...globals.serviceworker, __ASSETS__: 'readonly' } } },
  // tests, configs and the Playwright specs run in Node and reach into the page
  {
    files: ['tests/unit/**/*.ts', 'e2e/**/*.ts', 'vite.config.ts', 'playwright.config.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['e2e/**/*.spec.ts', 'e2e/helpers.ts'],
  },
  // unit tests and specs read raw ledgers and page objects
  { files: ['tests/unit/**/*.ts', 'e2e/**/*.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  {
    files: ['e2e/**/*.ts'],
    rules: {
      // App wraps page.fill/click/selectOption on purpose: the specs read like the original scripts
      'playwright/prefer-locator': 'off',
      // App's expect* helpers and visual.spec's shot() are the assertions in many tests
      'playwright/expect-expect': ['error', { assertFunctionPatterns: ['expect', '^shot$'] }],
      // secure and visual skip on a condition (remote server, no baselines)
      'playwright/no-skipped-test': ['error', { allowConditional: true }],
    },
  },
  // the legacy runner is CommonJS
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  prettier,
);
