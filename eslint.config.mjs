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
    },
  },
];

export default eslintConfig;
