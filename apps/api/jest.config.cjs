// Jest: testes unitários (src, arquivos .spec.ts) e de integração/API (test, arquivos .e2e-spec.ts).
const transform = {
  '^.+\\.(t|j)s$': [
    '@swc/jest',
    {
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
        keepClassNames: true,
      },
      module: { type: 'commonjs' },
      sourceMaps: 'inline',
    },
  ],
};

module.exports = {
  projects: [
    {
      displayName: 'unit',
      rootDir: __dirname,
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
      transform,
    },
    {
      displayName: 'e2e',
      rootDir: __dirname,
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
      transform,
    },
  ],
};
