'use client';

import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
	children
}) => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<>
			{children}
			{mounted && (
				<Toaster
					position="bottom-right"
					expand={false}
					richColors
					closeButton
					duration={4000}
					theme="light"
				/>
			)}
		</>
	);
};
