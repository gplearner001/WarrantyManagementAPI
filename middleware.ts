import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Extract the token from the session
    const token = req.nextauth?.token;
    
    // If no token is present, return unauthorized
    if (!token) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
        },
      });
    }

    // Add the user ID to the headers for the API route
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', token.userId as string);

    // Continue with the modified request
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
);

// Update the matcher to be more specific
export const config = {
  matcher: [
    "/api/warranty/:path*",
    "/api/warranty",
  ]
};