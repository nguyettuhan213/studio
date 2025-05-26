// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './src/lib/firebase'; // Assuming your firebase init is here

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the request is for the protected dashboard route
  if (pathname.startsWith('/dashboard')) {
    // In a real-world scenario for Next.js middleware with Firebase Auth,
    // directly accessing `auth.currentUser` or using `onAuthStateChanged`
    // here is generally not reliable or feasible due to the nature of middleware
    // running in an edge runtime environment.

    // A common pattern is to check for an authenticated session token
    // stored in cookies or rely on a client-side check after the page loads,
    // or use a server-side check on the page itself.

    // For demonstration purposes, let's simulate a check.
    // REPLACE THIS SIMULATED CHECK with a proper authentication check
    // based on your chosen method (e.g., verifying a session cookie).

    const isAuthenticated = false; // Replace with actual auth check logic

    if (!isAuthenticated) {
      // If not authenticated, redirect to the homepage
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // If authenticated, allow the request to proceed
    return NextResponse.next();
  }

  // For other routes, allow the request to proceed
  return NextResponse.next();
}

// You can also define a matcher to specify which paths the middleware applies to
// export const config = {
//   matcher: '/dashboard/:path*',
// };