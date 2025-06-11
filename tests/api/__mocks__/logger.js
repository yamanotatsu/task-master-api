import { jest } from '@jest/globals';

// Mock implementation for logger
export const logger = {
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
	debug: jest.fn()
};

export default logger;
