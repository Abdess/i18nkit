const js = require('@eslint/js');
const globals = require('globals');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**', '.i18n/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
    rules: {
      // === COMPLEXITY LIMITS ===
      complexity: ['error', { max: 5 }],
      'max-depth': ['error', { max: 2 }],
      'max-nested-callbacks': ['error', { max: 2 }],
      'max-params': ['error', { max: 3 }],
      'max-statements': ['error', { max: 10 }],
      'max-lines-per-function': ['error', { max: 25, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],

      // === IMMUTABILITY & FUNCTIONAL ===
      'no-param-reassign': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-array-constructor': 'error',
      'no-object-constructor': 'error',

      // === COGNITIVE LOAD ===
      'no-else-return': 'error',
      'no-negated-condition': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'no-lonely-if': 'error',
      'prefer-template': 'error',

      // === SECURITY ===
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-prototype-builtins': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unsafe-negation': 'error',
      'no-loss-of-precision': 'error',
      'no-nonoctal-decimal-escape': 'error',

      // === CLARITY & SAFETY ===
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-shadow': ['error', { hoist: 'functions' }],
      'no-use-before-define': ['error', { functions: false }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-throw-literal': 'error',

      // === ASYNC/PROMISES ===
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      'no-promise-executor-return': 'error',
      'require-atomic-updates': 'error',
      'prefer-promise-reject-errors': 'error',
      'no-return-await': 'error',
      'require-await': 'error',

      // === MODERN JS ===
      'prefer-arrow-callback': 'error',
      'prefer-destructuring': ['error', { array: false, object: true }],
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'object-shorthand': ['error', 'always'],
      'arrow-body-style': ['error', 'as-needed'],
      'prefer-object-spread': 'error',
      'prefer-object-has-own': 'error',
      'prefer-exponentiation-operator': 'error',
      'prefer-regex-literals': 'error',
      'logical-assignment-operators': ['error', 'always'],

      // === ARRAY/LOOP ===
      'array-callback-return': 'error',
      'no-constructor-return': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unreachable-loop': 'error',
      'no-loop-func': 'error',

      // === CODE QUALITY ===
      'consistent-return': 'warn',
      'max-classes-per-file': ['error', 1],
      camelcase: ['error', { properties: 'never', ignoreDestructuring: true }],

      // === CODE STYLE ===
      'no-console': 'off',
      'no-duplicate-imports': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'block-scoped-var': 'error',
      'default-case-last': 'error',
      'default-param-last': 'error',
      'dot-notation': 'error',
      'grouped-accessor-pairs': 'error',
      'no-caller': 'error',
      'no-empty-function': 'warn',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-implicit-coercion': 'error',
      'no-invalid-this': 'error',
      'no-iterator': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-multi-str': 'error',
      'no-new': 'error',
      'no-new-wrappers': 'error',
      'no-octal-escape': 'error',
      'no-proto': 'error',
      'no-return-assign': 'error',
      'no-sequences': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-rename': 'error',
      'operator-assignment': ['error', 'always'],
      radix: 'error',
      yoda: 'error',
      'spaced-comment': ['error', 'always'],
      'symbol-description': 'error',
      'no-constant-binary-expression': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-unused-private-class-members': 'error',
    },
  },
  {
    files: ['bin/**/*.js'],
    rules: {
      'no-await-in-loop': 'off',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        before: 'readonly',
        after: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      'max-lines': 'off',
    },
  },
];
