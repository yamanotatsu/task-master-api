import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	/* config options here */
	eslint: {
		// ESLintエラーを無視してビルドを続行
		ignoreDuringBuilds: true
	},
	typescript: {
		// TypeScriptエラーを無視してビルドを続行
		ignoreBuildErrors: true
	}
};

export default nextConfig;
