import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Sans_JP } from 'next/font/google';
import Link from 'next/link';
import { ThemeProvider } from '@/components/theme-provider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ToastProvider } from '@/providers/ToastProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/lib/auth';
import { UserDropdown } from '@/components/common/UserDropdown';
// import { NavigationProgress } from '@/components/navigation/NavigationProgress';
import './globals.css';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
	display: 'swap'
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
	display: 'swap'
});

const notoSansJP = Noto_Sans_JP({
	variable: '--font-noto-sans-jp',
	subsets: ['latin'],
	weight: ['400', '500', '700'],
	display: 'swap'
});

export const metadata: Metadata = {
	title: 'Task Master - AI-Powered Task Management',
	description:
		'Advanced task management system with AI-powered task generation and analysis'
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ja" suppressHydrationWarning>
			<body
				className={`${geistSans.className} ${notoSansJP.className} antialiased min-h-screen bg-background`}
				style={{
					'--font-geist-sans': geistSans.style.fontFamily,
					'--font-geist-mono': geistMono.style.fontFamily,
					'--font-noto-sans-jp': notoSansJP.style.fontFamily
				} as React.CSSProperties}
			>
				<ErrorBoundary>
					<ThemeProvider defaultTheme="light" storageKey="task-master-theme">
						<QueryProvider>
							<AuthProvider>
								<ToastProvider>
									{/* <NavigationProgress /> */}
									<div className="relative flex min-h-screen flex-col">
										<header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
											<div className="max-w-screen-2xl mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8">
												<Link
													href="/"
													className="mr-8 flex items-center space-x-2"
												>
													<div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
														<span className="text-white font-bold text-lg">
															T
														</span>
													</div>
													<span className="text-xl font-bold">Task Master</span>
												</Link>
												<nav className="flex items-center space-x-8 flex-1 justify-center">
													<Link
														href="/"
														className="transition-colors hover:text-primary text-gray-700 font-medium"
													>
														ダッシュボード
													</Link>
													<Link
														href="/settings/members"
														className="transition-colors hover:text-primary text-gray-700 font-medium"
													>
														担当者管理
													</Link>
													<Link
														href="/settings"
														className="transition-colors hover:text-primary text-gray-700 font-medium"
													>
														設定
													</Link>
												</nav>
												<div className="ml-auto flex items-center space-x-4">
													<UserDropdown />
												</div>
											</div>
										</header>
										<main className="flex-1 bg-gray-50">{children}</main>
									</div>
								</ToastProvider>
							</AuthProvider>
						</QueryProvider>
					</ThemeProvider>
				</ErrorBoundary>
			</body>
		</html>
	);
}
