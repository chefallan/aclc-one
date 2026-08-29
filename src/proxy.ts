import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { rateLimit, limiters, rateLimitResponse } from "@/lib/rate-limit";
import { generateRequestId } from "@/lib/utils";

// Security headers to add to all responses
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = generateRequestId();

  // Add request ID to headers for tracing
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  // Public paths - no auth required
  if (
    // The landing page is marketing: it must render for someone who has never
    // signed in. It was being redirected to /auth/signin, so the front door
    // was only visible to people already inside.
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    // The sign-up form needs the section list before anyone has an account.
    // Everything under /api/public is written to be safe unauthenticated.
    pathname.startsWith("/api/public/") ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    // A service worker script must be served directly. A browser treats a
    // redirect while fetching it as a registration failure, so leaving /sw.js
    // off this list meant the worker only ever installed for someone who was
    // already signed in.
    pathname === "/sw.js" ||
    // The icons the manifest names. Redirecting these fed the sign-in page
    // into the worker's cache under an icon's URL.
    pathname.startsWith("/icons/")
  ) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    let limiter = limiters.apiRead;
    if (pathname.includes("/auth/")) {
      limiter = limiters.auth;
    } else if (
      request.method === "POST" ||
      request.method === "PUT" ||
      request.method === "DELETE"
    ) {
      limiter = limiters.apiWrite;
    }

    const rateLimitResult = await rateLimit(request, limiter);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.headers, requestId);
    }
  }

  // JWT validation for protected routes
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    // API routes return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, requestId, error: "Unauthorized" },
        { status: 401 }
      );
    }
    // Page routes redirect to signin
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Role-based route protection
  const role = token.role as string;

  // Student-only routes
  if (pathname.startsWith("/dashboard/logs/new") && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // /dashboard/settings is a person's own account — their name, their phone,
  // their password. Every role needs it, so it is not gated. School-wide
  // configuration belongs on its own route with its own check.
  if (pathname.startsWith("/dashboard/students/import") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add request ID to response
  response.headers.set("x-request-id", requestId);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
