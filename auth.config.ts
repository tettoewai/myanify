import type { NextAuthConfig } from "next-auth";
import { UserRole } from "@prisma/client";
import { googleProvider, credentialsProvider } from "@/lib/auth-providers";
import { prisma } from "@/db";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      // Admin only — listener app pages are public for SEO
      if (isOnAdmin) {
        if (isLoggedIn && auth.user?.role === UserRole.ADMIN) {
          return true;
        }
        return false;
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
            const dbUser = await prisma.user.findUnique({
              where: { email: user.email },
            });
            if (dbUser) {
              token.id = dbUser.id;
              token.role = dbUser.role;
              token.email = dbUser.email;
              token.isPremium = dbUser.isPremium;
            } else {
              token.id = user.id!;
              token.role = user.role;
              token.email = user.email!;
              token.isPremium = (user as any).isPremium ?? false;
            }
          } catch (err) {
            // Fallback to values from `user` if DB lookup fails
            token.id = user.id!;
            token.role = user.role;
            token.email = user.email!;
            token.isPremium = (user as any).isPremium ?? false;
          }
        } else {
          token.id = user.id!;
          token.role = user.role;
          token.email = user.email!;
          token.isPremium = (user as any).isPremium ?? false;
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
        if (typeof (token as any).isPremium === "boolean") {
          (session.user as any).isPremium = (token as any).isPremium;
        }
      }
      return session;
    },
  },
  providers: [googleProvider, credentialsProvider], // Add providers with an array, so we can add more later
} satisfies NextAuthConfig;
