#!/usr/bin/env node

/**
 * Security Configuration Validation Script
 * Validates that security settings are properly configured
 */

import { getSecurityConfig } from '../config/security.js';
import chalk from 'chalk';

const config = getSecurityConfig();

console.log(
	chalk.bold.blue('\n🔒 Task Master API Security Configuration Validation\n')
);

// Environment detection
console.log(chalk.yellow(`Environment: ${config.env}`));
console.log(chalk.yellow(`Development mode: ${config.isDevelopment}`));
console.log(chalk.yellow(`Production mode: ${config.isProduction}`));
console.log('');

// Validation results
const results = [];

// CORS validation
console.log(chalk.bold('🌐 CORS Configuration:'));
if (config.cors.origin) {
	results.push({
		check: 'CORS Origin Policy',
		status: 'pass',
		message: 'Configured'
	});
	console.log(chalk.green('  ✓ Origin policy configured'));
} else {
	results.push({
		check: 'CORS Origin Policy',
		status: 'warn',
		message: 'Open to all origins'
	});
	console.log(chalk.yellow('  ⚠ Open to all origins'));
}

if (config.cors.credentials) {
	results.push({
		check: 'CORS Credentials',
		status: 'pass',
		message: 'Enabled'
	});
	console.log(chalk.green('  ✓ Credentials support enabled'));
} else {
	results.push({
		check: 'CORS Credentials',
		status: 'fail',
		message: 'Disabled'
	});
	console.log(chalk.red('  ✗ Credentials support disabled'));
}

// CSP validation
console.log(chalk.bold('\n🛡️ Content Security Policy:'));
if (config.csp.defaultSrc && config.csp.defaultSrc.includes("'self'")) {
	results.push({
		check: 'CSP Default Source',
		status: 'pass',
		message: 'Restricted to self'
	});
	console.log(chalk.green('  ✓ Default source restricted to self'));
} else {
	results.push({
		check: 'CSP Default Source',
		status: 'fail',
		message: 'Not properly restricted'
	});
	console.log(chalk.red('  ✗ Default source not properly restricted'));
}

if (config.csp.objectSrc && config.csp.objectSrc.includes("'none'")) {
	results.push({
		check: 'CSP Object Source',
		status: 'pass',
		message: 'Blocked'
	});
	console.log(chalk.green('  ✓ Object source blocked'));
} else {
	results.push({
		check: 'CSP Object Source',
		status: 'warn',
		message: 'Not blocked'
	});
	console.log(chalk.yellow('  ⚠ Object source not blocked'));
}

// HSTS validation
console.log(chalk.bold('\n🔐 HTTP Strict Transport Security:'));
if (config.hsts.maxAge > 0) {
	results.push({
		check: 'HSTS Enabled',
		status: 'pass',
		message: `Max age: ${config.hsts.maxAge}s`
	});
	console.log(
		chalk.green(`  ✓ HSTS enabled (max age: ${config.hsts.maxAge}s)`)
	);

	if (config.hsts.includeSubDomains) {
		results.push({
			check: 'HSTS Subdomains',
			status: 'pass',
			message: 'Included'
		});
		console.log(chalk.green('  ✓ Includes subdomains'));
	} else {
		results.push({
			check: 'HSTS Subdomains',
			status: 'warn',
			message: 'Not included'
		});
		console.log(chalk.yellow('  ⚠ Subdomains not included'));
	}
} else {
	results.push({
		check: 'HSTS Enabled',
		status: config.isDevelopment ? 'info' : 'fail',
		message: 'Disabled'
	});
	const message = config.isDevelopment
		? '  ℹ HSTS disabled (development)'
		: '  ✗ HSTS disabled in production';
	console.log(config.isDevelopment ? chalk.blue(message) : chalk.red(message));
}

// Security headers validation
console.log(chalk.bold('\n📋 Security Headers:'));
const requiredHeaders = [
	'X-Content-Type-Options',
	'X-Frame-Options',
	'Referrer-Policy'
];

requiredHeaders.forEach((header) => {
	if (config.headers[header]) {
		results.push({
			check: `Header: ${header}`,
			status: 'pass',
			message: config.headers[header]
		});
		console.log(chalk.green(`  ✓ ${header}: ${config.headers[header]}`));
	} else {
		results.push({
			check: `Header: ${header}`,
			status: 'fail',
			message: 'Missing'
		});
		console.log(chalk.red(`  ✗ ${header}: Missing`));
	}
});

// Rate limiting validation
console.log(chalk.bold('\n🚦 Rate Limiting:'));
const rateLimitEnabled = process.env.ENABLE_RATE_LIMIT === 'true';
if (rateLimitEnabled) {
	results.push({ check: 'Rate Limiting', status: 'pass', message: 'Enabled' });
	console.log(chalk.green('  ✓ Rate limiting enabled'));
	console.log(
		chalk.gray(
			`    Global: ${config.rateLimit.global.max} requests per ${config.rateLimit.global.windowMs}ms`
		)
	);
	console.log(
		chalk.gray(
			`    Auth: ${config.rateLimit.auth.max} requests per ${config.rateLimit.auth.windowMs}ms`
		)
	);
} else {
	results.push({
		check: 'Rate Limiting',
		status: config.isDevelopment ? 'info' : 'warn',
		message: 'Disabled'
	});
	const message = config.isDevelopment
		? '  ℹ Rate limiting disabled (development)'
		: '  ⚠ Rate limiting disabled';
	console.log(
		config.isDevelopment ? chalk.blue(message) : chalk.yellow(message)
	);
}

// Feature policy validation
console.log(chalk.bold('\n🎛️ Permissions Policy:'));
const restrictedFeatures = ['geolocation', 'camera', 'microphone'];
let featurePolicyConfigured = false;

restrictedFeatures.forEach((feature) => {
	if (
		config.featurePolicy[feature] &&
		config.featurePolicy[feature].includes("'none'")
	) {
		featurePolicyConfigured = true;
		console.log(chalk.green(`  ✓ ${feature}: Blocked`));
	}
});

if (featurePolicyConfigured) {
	results.push({
		check: 'Permissions Policy',
		status: 'pass',
		message: 'Configured'
	});
} else {
	results.push({
		check: 'Permissions Policy',
		status: 'warn',
		message: 'Not configured'
	});
	console.log(chalk.yellow('  ⚠ Permissions policy not configured'));
}

// Environment-specific recommendations
console.log(chalk.bold('\n💡 Environment-Specific Recommendations:'));

if (config.isDevelopment) {
	console.log(chalk.blue('  ℹ Development environment detected'));
	console.log(
		chalk.gray('    • Security settings are relaxed for development')
	);
	console.log(chalk.gray('    • Enable ENABLE_RATE_LIMIT=true for testing'));
	console.log(chalk.gray('    • Review CORS origins before production'));
}

if (config.isProduction) {
	console.log(chalk.green('  ✓ Production environment detected'));

	// Production-specific checks
	if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
		results.push({
			check: 'Session Secret',
			status: 'fail',
			message: 'Weak or missing'
		});
		console.log(
			chalk.red('    ✗ SESSION_SECRET should be at least 32 characters')
		);
	}

	if (!process.env.ALLOWED_ORIGINS) {
		results.push({
			check: 'CORS Origins',
			status: 'warn',
			message: 'Not explicitly configured'
		});
		console.log(chalk.yellow('    ⚠ ALLOWED_ORIGINS not configured'));
	}

	if (!rateLimitEnabled) {
		console.log(
			chalk.red('    ✗ Rate limiting should be enabled in production')
		);
	}
}

// Summary
console.log(chalk.bold('\n📊 Summary:'));
const passed = results.filter((r) => r.status === 'pass').length;
const failed = results.filter((r) => r.status === 'fail').length;
const warnings = results.filter((r) => r.status === 'warn').length;
const info = results.filter((r) => r.status === 'info').length;

console.log(`  ${chalk.green('✓')} Passed: ${passed}`);
console.log(`  ${chalk.red('✗')} Failed: ${failed}`);
console.log(`  ${chalk.yellow('⚠')} Warnings: ${warnings}`);
console.log(`  ${chalk.blue('ℹ')} Info: ${info}`);

// Overall status
if (failed > 0) {
	console.log(
		chalk.bold.red('\n❌ Security configuration has issues that need attention')
	);
	process.exit(1);
} else if (warnings > 0) {
	console.log(
		chalk.bold.yellow(
			'\n⚠️ Security configuration is functional but has recommendations'
		)
	);
	process.exit(0);
} else {
	console.log(chalk.bold.green('\n✅ Security configuration looks good!'));
	process.exit(0);
}
