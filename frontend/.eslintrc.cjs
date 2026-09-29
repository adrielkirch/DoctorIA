module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    '@antfu/eslint-config-vue',
    'plugin:vue/vue3-recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:promise/recommended',
    'plugin:sonarjs/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:case-police/recommended',
    'plugin:regexp/recommended',


  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 13,
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
  },
  plugins: [
    'vue',
    '@typescript-eslint',
    'regex',
    'regexp',
  ],
  ignorePatterns: ['src/plugins/iconify/*.js', 'node_modules', 'dist', '*.d.ts', 'vendor', '*.json'],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',


    'comma-spacing': ['error', { before: false, after: true }],
    'key-spacing': ['error', { afterColon: true }],
    'n/prefer-global/process': ['off'],
    'sonarjs/cognitive-complexity': ['off'],

    'vue/first-attribute-linebreak': ['error', {
      singleline: 'beside',
      multiline: 'below',
    }],

    'antfu/top-level-function': 'off',
    '@typescript-eslint/no-explicit-any': 'off',


    'indent': ['error', 2],


    'comma-dangle': ['error', 'always-multiline'],


    'object-curly-spacing': ['error', 'always'],


    'camelcase': 'error',


    'max-len': 'off',


    'semi': ['error', 'never'],


    'arrow-parens': ['error', 'as-needed'],


    'newline-before-return': 'error',


    'lines-around-comment': [
      'error',
      {
        beforeBlockComment: true,
        beforeLineComment: true,
        allowBlockStart: true,
        allowClassStart: true,
        allowObjectStart: true,
        allowArrayStart: true,


        ignorePattern: '!SECTION',
      },
    ],


    '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_+$', argsIgnorePattern: '^_+$' }],

    'array-element-newline': ['error', 'consistent'],
    'array-bracket-newline': ['error', 'consistent'],

    'vue/multi-word-component-names': 'off',

    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: 'expression', next: 'const' },
      { blankLine: 'always', prev: 'const', next: 'expression' },
      { blankLine: 'always', prev: 'multiline-const', next: '*' },
      { blankLine: 'always', prev: '*', next: 'multiline-const' },
    ],


    'import/prefer-default-export': 'off',
    'import/newline-after-import': ['error', { count: 1 }],
    'no-restricted-imports': ['error', 'vuetify/components'],


    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],


    'import/no-unresolved': [2, {
      ignore: [
        '~pages$',
        'virtual:meta-layouts',
        '#auth$',
        '#components$',


        '.*\?raw',
      ],
    }],


    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error'],

    '@typescript-eslint/consistent-type-imports': 'error',


    'promise/always-return': 'off',
    'promise/catch-or-return': 'off',


    'vue/block-tag-newline': 'error',
    'vue/component-api-style': 'error',
    'vue/component-name-in-template-casing': ['error', 'PascalCase', { registeredComponentsOnly: false, ignores: ['/^swiper-/'] }],
    'vue/custom-event-name-casing': ['error', 'camelCase', {
      ignores: [
        '/^(click):[a-z]+((\d)|([A-Z0-9][a-z0-9]+))*([A-Z])?/',
      ],
    }],
    'vue/define-macros-order': 'error',
    'vue/html-comment-content-newline': 'error',
    'vue/html-comment-content-spacing': 'error',
    'vue/html-comment-indent': 'error',
    'vue/match-component-file-name': 'error',
    'vue/no-child-content': 'error',
    'vue/require-default-prop': 'off',

    'vue/no-duplicate-attr-inheritance': 'error',
    'vue/no-empty-component-block': 'error',
    'vue/no-multiple-objects-in-class': 'error',
    'vue/no-reserved-component-names': 'error',
    'vue/no-template-target-blank': 'error',
    'vue/no-useless-mustaches': 'error',
    'vue/no-useless-v-bind': 'error',
    'vue/padding-line-between-blocks': 'error',
    'vue/prefer-separate-static-class': 'error',
    'vue/prefer-true-attribute-shorthand': 'error',
    'vue/v-on-function-call': 'error',
    'vue/no-restricted-class': ['error', '/^(p|m)(l|r)-/'],
    'vue/valid-v-slot': ['error', {
      allowModifiers: true,
    }],


    'vue/no-irregular-whitespace': 'error',
    'vue/template-curly-spacing': 'error',


    'sonarjs/no-duplicate-string': 'off',
    'sonarjs/no-nested-template-literals': 'off',










    'regex/invalid': [
      'error',
      [
        {
          regex: '@/assets/images',
          replacement: '@images',
          message: 'Use \'@images\' path alias for image imports',
        },
        {
          regex: '@/assets/styles',
          replacement: '@styles',
          message: 'Use \'@styles\' path alias for importing styles from \'src/assets/styles\'',
        },
        {
          regex: '@core/\\w',
          message: 'You can\'t use @core when you are in @layouts module',
          files: {
            inspect: '@layouts/.*',
          },
        },
        {
          regex: 'useLayouts\\(',
          message: '`useLayouts` composable is only allowed in @layouts & @core directory. Please use `useThemeConfig` composable instead.',
          files: {
            inspect: '^(?!.*(@core|@layouts)).*',
          },
        },
      ],


      '\.eslintrc\.cjs',
    ],
  },
  settings: {
    'import/resolver': {
      node: true,
      typescript: {},
    },
  },
}
