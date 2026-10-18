module.exports = {
  env: {
    browser: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'eslint-config-prettier'],
  parserOptions: {
    sourceType: 'module',
  },
  ignorePatterns: ['__tests__/**'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
