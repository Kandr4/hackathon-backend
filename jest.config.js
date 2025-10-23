module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/app.js',
    '!src/config/**',
    '!src/middlewares/**',
    '!src/utils/**',
    '!src/models/**',
    '!src/services/**',
    '!src/routes/**',
    '!tests/**',
  ],
  reporters: ['default', 'jest-junit'],
};