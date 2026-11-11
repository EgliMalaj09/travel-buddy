// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  // Atomic design (HARD RULE, 11 Nov 2026): core components never use feature components.
  {
    files: ['src/components/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components',
                '@/components/feature',
                '@/components/feature/*',
                '../feature',
                '../feature/*',
              ],
              message: 'core components may only use other core components (import from ./X).',
            },
          ],
        },
      ],
    },
  },
  // Feature components use core through '@/components/core', never the '@/components' barrel (avoids import loops).
  {
    files: ['src/components/feature/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/components',
              message: "Import from '@/components/core' (or './X' for another feature component).",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'src/api/schema.d.ts'],
  },
]);
