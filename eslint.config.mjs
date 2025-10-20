import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      'src/ic/declarations/**/*', // Auto-generated ICP declarations - no linting needed
      '**/ic/declarations/**/*', // Alternative path pattern
    ],
  },
  {
    rules: {
      // Disable jsx-a11y/alt-text for Lucide icon components (they're SVGs, not img elements)
      'jsx-a11y/alt-text': 'off',
      // Allow unused variables that start with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Temporarily disable wire type restrictions for ICP implementation
      // TODO: Re-enable after creating proper domain types for ICP
      // 'no-restricted-imports': [
      //   'error',
      //   {
      //     patterns: [
      //       {
      //         group: ['@/ic/declarations/backend/backend.did'],
      //         message: 'Wire types only allowed in lib/ directory. Use domain types from @/types/upload instead.',
      //       },
      //     ],
      //   },
      // ],
    },
  },
  // Override for ICP-specific files that legitimately need backend types
  {
    files: [
      'src/app/[lang]/user/icp/page.tsx',
      'src/ic/backend.ts',
      'src/services/upload/icp-upload.ts',
      'src/services/upload/icp-with-processing.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];

export default eslintConfig;
