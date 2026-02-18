import { auth } from "@/lib/auth";
import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "@/i18n/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

// Public routes that don't require authentication
const publicPaths = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/terms",
  "/privacy",
  "/api/auth",
  "/api/webhooks",
];

function isPublicPath(pathname: string): boolean {
  // Remove locale prefix for checking
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?:\/|$)/, "/");
  
  return publicPaths.some((path) => {
    if (path === "/") {
      return pathWithoutLocale === "/" || pathname.match(/^\/[a-z]{2}$/);
    }
    return pathWithoutLocale.startsWith(path);
  });
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api");
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and _next
  if (
    pathname.includes(".") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  // Handle API routes (no intl middleware)
  if (isApiRoute(pathname)) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Check authentication for protected routes
  if (!isPublicPath(pathname)) {
    const session = await auth();
    
    if (!session) {
      const locale = pathname.split("/")[1] || defaultLocale;
      const signInUrl = new URL(`/${locale}/sign-in`, request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  const response = intlMiddleware(request);
  return addSecurityHeaders(response as NextResponse);
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
