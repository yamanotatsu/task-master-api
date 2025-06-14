/**
 * Simple logger implementation for API routes
 * Mimics the FastMCP logger interface expected by direct functions
 */

export const logger = {
	info: (message) => {
		console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
	},

	error: (message) => {
		console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
	},

	warn: (message) => {
		console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
	},

	debug: (message) => {
		if (process.env.DEBUG === 'true') {
			console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
		}
	}
};
