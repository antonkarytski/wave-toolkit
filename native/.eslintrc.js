module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: ['plugin:react-hooks/recommended', 'prettier'],
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        'no-unused-vars': 'warn',
        '@typescript-eslint/no-shadow': ['error'],
        'no-shadow': 'warn',
        'no-undef': 'off',
        semi: 'off',
      },
    },
  ],
}
