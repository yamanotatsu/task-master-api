import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// Routes that don't require authentication
const publicRoutes = [
	'/login',
	'/signup',
	'/forgot-password',
	'/reset-password',
	'/auth/reset-password', // Supabase redirect path
	'/auth/callback', // Supabase callback route
	'/verify-email'
];

export async function middleware(request: NextRequest) {
	const { pathname, searchParams } = request.nextUrl;

	// Special handling for Supabase auth callbacks
	if (pathname === '/login' && searchParams.get('redirect')?.includes('reset-password')) {
		// This is likely a Supabase password reset callback
		// Extract the hash fragment from the original URL and redirect properly
		const redirectUrl = new URL('/auth/reset-password', request.url);
		// Preserve any query parameters
		searchParams.forEach((value, key) => {
			if (key !== 'redirect') {
				redirectUrl.searchParams.set(key, value);
			}
		});
		return NextResponse.redirect(redirectUrl);
	}

	// Check if the route is public
	const isPublicRoute = publicRoutes.some((route) =>
		pathname.startsWith(route)
	);

	// Create a response object that we can mutate
	const res = NextResponse.next();

	// Create a Supabase client configured to use cookies
	const supabase = createMiddlewareClient({ req: request, res });

	// Refresh session if expired - required for Server Components
	const {
		data: { session }
	} = await supabase.auth.getSession();

	// If the user is not authenticated and trying to access a protected route
	if (!isPublicRoute && !session) {
		const loginUrl = new URL('/login', request.url);
		loginUrl.searchParams.set('redirect', pathname);
		return NextResponse.redirect(loginUrl);
	}

	// If the user is authenticated and trying to access auth pages
	// Allow access to verify-email and reset-password pages even if authenticated
	const allowedAuthPages = ['/verify-email', '/reset-password', '/auth/reset-password'];
	const isAllowedAuthPage = allowedAuthPages.some(page => pathname.startsWith(page));
	
	if (isPublicRoute && session && !isAllowedAuthPage) {
		return NextResponse.redirect(new URL('/', request.url));
	}

	return res;
}

// Configure which routes the middleware should run on
export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 */
		'/((?!api|_next/static|_next/image|favicon.ico|public).*)'
	]
};
