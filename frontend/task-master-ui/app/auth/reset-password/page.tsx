'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

export default function AuthResetPasswordPage() {
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		// Get all search params
		const params = new URLSearchParams(searchParams);

		// Redirect to the correct reset-password page with all params
		router.replace(`/reset-password?${params.toString()}`);
	}, [router, searchParams]);

	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="text-center">
				<Spinner size="lg" />
				<p className="mt-4 text-gray-600">リダイレクト中...</p>
			</div>
		</div>
	);
}
