import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // El React Compiler NO está en el build (vite usa @vitejs/plugin-react
      // plano), así que sus reglas generan falsos positivos sobre patrones
      // legítimos (mutar refs recibidos por prop, setState en effects de
      // sincronización, memoización manual). Se desactivan.
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      // Los contextos exportan hooks junto a componentes (patrón intencional);
      // solo afecta al fast refresh en dev, no es error.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
