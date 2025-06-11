const nextJest = require('next/jest');

const createJestConfig = nextJest({
	// Provide the path to your Next.js app to load next.config.js and .env files
	dir: './'
});

// Add any custom config to be passed to Jest
const customJestConfig = {
	setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
	testEnvironment: 'jsdom',
	testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
	moduleNameMapping: {
		'^@/(.*)$': '<rootDir>/$1',
		'^@/components/(.*)$': '<rootDir>/components/$1',
		'^@/lib/(.*)$': '<rootDir>/lib/$1',
		'^@/hooks/(.*)$': '<rootDir>/hooks/$1',
		'^@/types/(.*)$': '<rootDir>/types/$1',
		'^@/app/(.*)$': '<rootDir>/app/$1'
	},
	collectCoverageFrom: [
		'components/**/*.{js,jsx,ts,tsx}',
		'app/**/*.{js,jsx,ts,tsx}',
		'lib/**/*.{js,jsx,ts,tsx}',
		'hooks/**/*.{js,jsx,ts,tsx}',
		'!**/*.d.ts',
		'!**/node_modules/**',
		'!**/.next/**',
		'!**/coverage/**'
	],
	coverageReporters: ['text', 'lcov', 'html'],
	testMatch: ['<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
	transform: {
		'^.+\\.(ts|tsx)$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.json'
			}
		]
	}
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
