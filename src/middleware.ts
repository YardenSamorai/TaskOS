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

function isPublicApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/v1/");
}

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function validateOrigin(request: NextRequest): boolean {
  if (!STATE_CHANGING_METHODS.has(request.method)) return true;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const host = request.headers.get("host");
  if (!host) return false;

  const allowedOrigin = `${request.nextUrl.protocol}//${host}`;

  if (origin) {
    return origin === allowedOrigin || origin === `https://${host}` || origin === `http://${host}`;
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === host;
    } catch {
      return false;
    }
  }

  // No origin or referer on a state-changing request -> block
  return false;
}

const isProduction = process.env.NODE_ENV === "production";

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  if (isProduction) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.includes(".") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  // /api/v1/* = public API, Bearer token only -- skip session/CSRF checks
  if (isPublicApiRoute(pathname)) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Other API routes (session-based)
  if (isApiRoute(pathname)) {
    // Validate origin for state-changing requests (CSRF protection)
    if (STATE_CHANGING_METHODS.has(request.method) && !validateOrigin(request)) {
      return NextResponse.json(
        { error: "Forbidden: origin validation failed" },
        { status: 403 }
      );
    }

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
