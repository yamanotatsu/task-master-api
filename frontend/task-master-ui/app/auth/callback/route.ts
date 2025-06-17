import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get('code');
	const next = requestUrl.searchParams.get('next') ?? '/';

	if (code) {
		const cookieStore = cookies();
		const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

		// Exchange the code for a session
		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			// Redirect to intended destination
			return NextResponse.redirect(new URL(next, requestUrl.origin));
		}
	}

	// Return the user to an error page with instructions
	return NextResponse.redirect(
		new URL(`/login?error=Unable to verify session`, requestUrl.origin)
	);
}
