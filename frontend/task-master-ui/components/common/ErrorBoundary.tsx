'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('Error caught by boundary:', error, errorInfo);
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
		// Use window.location.href to navigate to home page instead of reload
		// This ensures a clean state reset
		window.location.href = '/';
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return <>{this.props.fallback}</>;
			}

			return (
				<div className="min-h-screen flex items-center justify-center p-4">
					<Card className="max-w-md w-full">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-red-600">
								<AlertTriangle className="h-5 w-5" />
								エラーが発生しました
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<p className="text-gray-600">
								申し訳ございません。予期しないエラーが発生しました。
							</p>

							{this.state.error && (
								<div className="bg-gray-50 rounded-lg p-3">
									<p className="text-sm font-mono text-gray-700">
										{this.state.error.message}
									</p>
								</div>
							)}

							<div className="flex gap-3">
								<Button onClick={this.handleReset} className="flex-1">
									<RefreshCw className="mr-2 h-4 w-4" />
									ページを再読み込み
								</Button>
								<Button
									variant="outline"
									onClick={() => window.history.back()}
									className="flex-1"
								>
									前のページに戻る
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}
