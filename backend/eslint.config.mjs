import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const modules = ['auth', 'profiles', 'scan', 'nutrition', 'plan', 'meals', 'streaks', 'feel', 'recipes'];

// Layer rule: routes -> controller -> service -> repository. Each layer lists what it must not import.
const forbiddenByLayer = {
  routes: ['service', 'repository', 'client'],
  controller: ['routes', 'repository', 'client'],
  service: ['routes', 'controller'],
  repository: ['routes', 'controller', 'service', 'client'],
  client: ['routes', 'controller', 'service', 'repository'],
  schemas: ['routes', 'controller', 'service', 'repository', 'client'],
  types: ['routes', 'controller', 'service', 'repository', 'client'],
};

// Module rule: another module may only be imported through its index.
// no-restricted-imports replaces (not merges) options, so each file gets one combined list.
const restrictedFor = (self, layer) => [
  ...forbiddenByLayer[layer].map((l) => ({
    group: [`**/*.${l}`, `**/${l}`],
    message: `A ${layer} file must not import a ${l} file (routes -> controller -> service -> repository).`,
  })),
  ...modules
    .filter((other) => other !== self)
    .map((other) => ({
      group: [`**/${other}/*`, `!**/${other}/index`],
      message: `Import the ${other} module through its index.ts only.`,
    })),
];

const moduleRules = modules.flatMap((self) =>
  Object.keys(forbiddenByLayer).map((layer) => ({
    files: [`src/modules/${self}/*.${layer}.ts`],
    rules: { 'no-restricted-imports': ['error', { patterns: restrictedFor(self, layer) }] },
  })),
);

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  ...moduleRules,
  // Shared code and the app root must not reach into a module's internals.
  {
    files: ['src/shared/**/*.ts', 'src/app.ts', 'src/server.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/*/*', '!**/modules/*/index'],
              message: 'Use a module index.ts only.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
