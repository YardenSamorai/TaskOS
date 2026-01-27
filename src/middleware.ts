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
    return NextResponse.next();
  }

  // Check authentication for protected routes
  if (!isPublicPath(pathname)) {
    const session = await auth();
    
    if (!session) {
      // Redirect to sign-in if not authenticated
      const locale = pathname.split("/")[1] || defaultLocale;
      const signInUrl = new URL(`/${locale}/sign-in`, request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Apply intl middleware for non-API routes
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
