const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const globals = require('globals');
const react = require('eslint-plugin-react');
const prettier = require('eslint-plugin-prettier');
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
        NodeJS: true,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      prettier,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React recommended rules
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,

      // Custom rules
      'prettier/prettier': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // Server-side code (Vercel functions + shared lib) runs in Node, not the
    // browser: declare Node globals so `process` / `Buffer` are not flagged.
    files: ['api/**/*.ts', 'api/**/*.tsx', 'lib/**/*.ts', 'tests/api/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        // mocked fetch signatures in tests annotate DOM types
        RequestInit: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
      },
    },
  },
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/pyproject.toml',
      '**/LICENSE',
      '**/*lock.*',
      '**/*.html',
      '**/*.md',
      '**/*.css',
      '**/*.svg',
      '**/*.png',
      '**/*.jpg',
      '**/*.ico',
      '**/*.lock',
      '**/*.min.js',
    ],
  },
];
