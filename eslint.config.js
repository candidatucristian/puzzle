import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'dist/**', '.artifacts/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  { files: ['src/**/*.js', 'tools/**/*.js'], languageOptions: { globals: globals.browser } },
  { files: ['*.js', 'scripts/**/*.js', 'tests/**/*.js'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { rules: { 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }], 'no-empty': ['error', { allowEmptyCatch: true }] } },
];
