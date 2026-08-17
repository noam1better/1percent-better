import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),

  // ── React / browser source ────────────────────────────────────────
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Classic react-hooks rules only — skip the React Compiler rules
      // that ship in react-hooks@7 recommended (refs, set-state-in-effect,
      // purity, immutability, etc.) since this project doesn't use the compiler.
      'react-hooks/rules-of-hooks':  'error',
      'react-hooks/exhaustive-deps': 'warn',

      // react-refresh — allow constant exports alongside components
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Allow empty catch blocks — intentional silent error swallowing
      'no-empty': ['error', { allowEmptyCatch: true }],

      // Ignore _-prefixed variables (intentionally unused / placeholder destructures)
      'no-unused-vars': ['error', {
        varsIgnorePattern:               '^_',
        argsIgnorePattern:               '^_',
        destructuredArrayIgnorePattern:  '^_',
        caughtErrors:                    'none',
      }],
    },
  },

  // ── Service Worker ────────────────────────────────────────────────
  {
    files: ['public/sw.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.serviceworker },
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // ── Cloud Functions (Node.js / CommonJS) ──────────────────────────
  {
    files: ['functions/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals:    globals.node,
      sourceType: 'commonjs',
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // ── Jest test files ───────────────────────────────────────────────
  {
    files: ['functions/__tests__/**/*.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
  },
])
