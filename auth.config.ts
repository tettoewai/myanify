import type { NextAuthConfig } from "next-auth";
import { UserRole } from "@prisma/client";
import { googleProvider, credentialsProvider } from "@/lib/auth-providers";
import { prisma } from "@/db";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For credentials login, check if email is verified
      if (account?.provider === "credentials" && user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // If user doesn't exist or email not verified, prevent sign in
        if (!dbUser?.emailVerified) {
          return false;
        }
        return true;
      }

      // For Google OAuth, auto-verify the email
      if (account?.provider === "google") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (!existingUser) {
            // Create new user with email already verified
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name,
                avatarUrl: user.image,
                role: UserRole.LISTENER,
                emailVerified: new Date(),
              },
            });
          } else {
            // If user exists but not verified, auto-verify them
            if (!existingUser.emailVerified) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  emailVerified: new Date(),
                },
              });
            }
            // Update name/avatar if needed
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

    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isRoot = nextUrl.pathname === "/";

      if (isLoggedIn && (isRoot || isOnLogin)) {
        return Response.redirect(new URL("/home", nextUrl));
      }

      if (isOnLogin) {
        return true;
      }

      if (isOnAdmin) {
        if (isLoggedIn && auth.user?.role === UserRole.ADMIN) {
          return true;
        }
        if (isLoggedIn) {
          return Response.redirect(new URL("/home", nextUrl));
        }
        return false;
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
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
              token.emailVerified = dbUser.emailVerified;
            } else {
              token.id = user.id!;
              token.role = user.role;
              token.email = user.email!;
              token.isPremium = (user as any).isPremium ?? false;
              token.emailVerified = (user as any).emailVerified ?? null;
            }
          } catch (err) {
            token.id = user.id!;
            token.role = user.role;
            token.email = user.email!;
            token.isPremium = (user as any).isPremium ?? false;
            token.emailVerified = (user as any).emailVerified ?? null;
          }
        } else {
          token.id = user.id!;
          token.role = user.role;
          token.email = user.email!;
          token.isPremium = (user as any).isPremium ?? false;
          token.emailVerified = (user as any).emailVerified ?? null;
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
        (session.user as any).emailVerified = (token as any).emailVerified;
      }
      return session;
    },
  },
  providers: [googleProvider, credentialsProvider],
} satisfies NextAuthConfig;
