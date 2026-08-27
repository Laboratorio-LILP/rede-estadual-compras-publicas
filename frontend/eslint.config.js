// Configuracao do ESLint (formato plano, ESLint 9).
//
// O perfil de acessibilidade e estrito de proposito: os numeros da auditoria do
// legado (zero tratamento de teclado em 8.215 linhas, 28 rotulos orfaos) sao o
// que acontece sem regra (design-system.md, secao 5).

import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", "src/api/contrato.d.ts"] },

  js.configs.recommended,

  // Codigo da aplicacao: verificacao com informacao de tipo.
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, __RECPSP_API_URL__: "readonly" },
      parserOptions: {
        project: ["./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },

  // Ferramental do projeto: roda no Node, sem informacao de tipo.
  {
    files: ["vite.config.ts", "eslint.config.js", "scripts/**/*.mjs"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
);
