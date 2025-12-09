import type { NextAuthConfig } from "next-auth";
import { UserRole } from "@prisma/client";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnRoot = nextUrl.pathname === "/";
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) {
          // Redirect to appropriate app based on role
          const role = auth.user?.role;
          if (role === UserRole.ADMIN) {
            return Response.redirect(new URL("/admin", nextUrl));
          }
          // LISTENER users go to main page
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      // Protect root route - require authentication
      if (isOnRoot) {
        if (!isLoggedIn) {
          return false; // Redirect to login page
        }
        // Allow authenticated users (both ADMIN and LISTENER)
        // ADMIN users will be redirected to /admin by proxy.ts
        return true;
      }

      if (isOnAdmin) {
        if (isLoggedIn && auth.user?.role === UserRole.ADMIN) {
          return true;
        }
        return false; // Redirect unauthenticated users to login page
      }

      return true;
    },
    jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
      }
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  providers: [], // Add providers with an array, so we can add more later
} satisfies NextAuthConfig;
