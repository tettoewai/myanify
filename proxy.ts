import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;
  const isOnApiAuth = pathname.startsWith("/api/auth");
  const isOnLogin = pathname.startsWith("/login");
  const isOnAdmin = pathname.startsWith("/admin");
  const isOnRoot = pathname === "/";

  // Allow API auth routes (NextAuth handles its own authentication)
  if (isOnApiAuth) {
    return NextResponse.next();
  }

  // Handle login page - redirect if already logged in
  if (isOnLogin) {
    if (isLoggedIn) {
      const role = req.auth?.user?.role;
      if (role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", nextUrl));
      }
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  // Protect all routes - require authentication
  // If no session, redirect to login page
  if (!isLoggedIn) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
    );
  }

  const role = req.auth?.user?.role;

  // Protect admin routes - require ADMIN role
  if (isOnAdmin) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  // Redirect ADMIN users away from listener routes to admin dashboard
  if (role === "ADMIN") {
    // Allow root redirect to admin
    if (isOnRoot) {
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }
    // Redirect all other listener routes to admin
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  // LISTENER users can access all listener routes
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (all API routes handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
