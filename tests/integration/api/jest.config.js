export default {
  displayName: 'API Integration Tests',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/integration/api/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/api/setup.js'],
  testTimeout: 30000, // 30 seconds default timeout
  verbose: true,
  collectCoverageFrom: [
    'api/**/*.js',
    '!api/index.js', // Exclude entry point
    '!api/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};