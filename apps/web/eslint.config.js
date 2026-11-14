import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.bun,
        ...globals.node
      },
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      // eslint-plugin-react 7.37.5 declares peer eslint only up to ^9.7. The two
      // rules below run the same on ESLint 10 without the shim; it stays as a
      // guard for plugin code that still calls rule-context methods ESLint 10
      // removed (lib/util/version.js has a context.getFilename() call).
      react: fixupPluginRules(react)
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none'
        }
      ]
    }
  }
];
