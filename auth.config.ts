import type { NextAuthConfig } from "next-auth";
import { UserRole } from "@prisma/client";
import { googleProvider } from "@/lib/auth-providers";
import { prisma } from "@/db";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnRoot = nextUrl.pathname === "/";
      const isOnLanding = nextUrl.pathname.startsWith("/landing");
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isOnListener = nextUrl.pathname.startsWith("/artist") || 
                           nextUrl.pathname.startsWith("/genre") || 
                           nextUrl.pathname.startsWith("/library") || 
                           nextUrl.pathname.startsWith("/playlist") || 
                           nextUrl.pathname.startsWith("/premium") || 
                           nextUrl.pathname.startsWith("/search") || 
                           nextUrl.pathname.startsWith("/settings");

      // Allow landing page (public)
      if (isOnLanding) {
        return true;
      }

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

      // Protect root route - redirect unauthenticated users to landing
      if (isOnRoot) {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/landing", nextUrl));
        }
        // Allow authenticated users (both ADMIN and LISTENER)
        // ADMIN users will be redirected to /admin by middleware
        return true;
      }

      if (isOnAdmin) {
        if (isLoggedIn && auth.user?.role === UserRole.ADMIN) {
          return true;
        }
        return false; // Redirect unauthenticated users to landing page
      }

      // Protect listener pages - require authentication
      if (isOnListener) {
        if (!isLoggedIn) {
          return false; // Redirect to login
        }
        // Redirect ADMIN users away from listener routes to admin dashboard
        if (auth.user?.role === UserRole.ADMIN) {
          return Response.redirect(new URL("/admin", nextUrl));
        }
        return true;
      }

      return true;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (!existingUser) {
            // Create new user for Google OAuth
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name,
                avatarUrl: user.image,
                role: UserRole.LISTENER, // Default to LISTENER for Google sign-ins
              },
            });
          } else {
            // Update existing user with Google info if not set
            if (!existingUser.name && user.name) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  name: user.name,
                  avatarUrl: user.image || existingUser.avatarUrl,
                },
              });
            }
          }
        } catch (error) {
          console.error("Error handling Google sign-in:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Prefer the database user id when available (for OAuth flows)
        if (user.email) {
          try {
            const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
            if (dbUser) {
              token.id = dbUser.id;
              token.role = dbUser.role;
              token.email = dbUser.email;
            } else {
              token.id = user.id!;
              token.role = user.role;
              token.email = user.email!;
            }
          } catch (err) {
            // Fallback to values from `user` if DB lookup fails
            token.id = user.id!;
            token.role = user.role;
            token.email = user.email!;
          }
        } else {
          token.id = user.id!;
          token.role = user.role;
          token.email = user.email!;
        }
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
  providers: [googleProvider], // Add providers with an array, so we can add more later
} satisfies NextAuthConfig;
