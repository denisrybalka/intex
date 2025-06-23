import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Downgrade from error to warning
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': 'warn', // Downgrade from error to warning
      '@typescript-eslint/no-unsafe-function-type': 'warn', // Downgrade from error to warning
      '@typescript-eslint/ban-ts-comment': 'warn', // Downgrade from error to warning
      'no-case-declarations': 'warn' // Downgrade from error to warning
    }
  },
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: {
        jest: true,
        expect: true,
        describe: true,
        it: true,
        beforeEach: true,
        afterEach: true
      }
    }
  }
];
