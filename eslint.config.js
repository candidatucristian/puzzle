import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'dist/**', 'dist-demo/**', 'site-dist/**', 'site/public/**', '.artifacts/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  { files: ['src/**/*.js', 'tools/**/*.js', 'site/**/*.js', 'todo/**/*.js'], languageOptions: { globals: { ...globals.browser, __DEMO_BUILD__: 'readonly', __FULL_BUILD__: 'readonly' } } },
  { files: ['*.js', 'site/vite.config.js', 'scripts/**/*.js', 'scripts/**/*.mjs', 'tests/**/*.js', 'art/**/*.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { rules: { 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }], 'no-empty': ['error', { allowEmptyCatch: true }] } },
];
