import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'src/generated/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  prettier,
  {
    rules: {
      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: '*',
          next: ['function', 'if', 'block-like'],
        },
        {
          blankLine: 'always',
          prev: ['function', 'if', 'block-like'],
          next: '*',
        },
      ],
    },
  },
)
