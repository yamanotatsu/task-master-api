/**
 * Simple logger implementation for API routes
 * Mimics the FastMCP logger interface expected by direct functions
 */

export const logger = {
	info: (message, data) => {
		console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
		if (data) console.log(JSON.stringify(data, null, 2));
	},

	error: (message, data) => {
		console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
		if (data) console.error(JSON.stringify(data, null, 2));
	},

	warn: (message, data) => {
		console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
		if (data) console.warn(JSON.stringify(data, null, 2));
	},

	debug: (message, data) => {
		if (process.env.DEBUG === 'true') {
			console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
			if (data) console.log(JSON.stringify(data, null, 2));
		}
	}
};
