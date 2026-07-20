import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";
import frontRules from "./tools/eslint-rules/index.mjs";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/*.d.ts",
      "pnpm-lock.yaml"
    ]
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        console: "readonly",
        document: "readonly",
        process: "readonly",
        window: "readonly"
      }
    }
  },
  ...tseslint.configs.recommended,
  {
    files: ["FrontProject/**/*.{ts,tsx}", "BackEnd/**/*.{ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin
    },
    settings: {
      next: {
        rootDir: ["FrontProject/", "BackEnd/"]
      }
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      front: frontRules
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      "no-undef": "off",
      "front/no-inline-style": "error",
      "front/no-raw-color": "error"
    }
  },
  {
    files: ["apps/**/*.{ts,tsx}", "FrontProject/**/*.{ts,tsx}"],
    rules: {
      "front/no-ad-hoc-ui-classname": "error",
      "front/prefer-ui-components": "error"
    }
  },
  {
    files: ["packages/ui/src/styles/tokens.ts"],
    rules: {
      "front/no-raw-color": "off"
    }
  }
];
