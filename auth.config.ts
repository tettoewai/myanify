import type { NextAuthConfig } from "next-auth";
import { UserRole } from "@prisma/client";
import {
  googleProvider,
  spotifyProvider,
  credentialsProvider,
} from "@/lib/auth-providers";
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

      // For OAuth (Google / Spotify), auto-verify email + link Account row.
      // Same email across providers links to one User (auto-link).
      if (account?.provider === "google" || account?.provider === "spotify") {
        try {
          if (!user.email) {
            // Spotify can hide email if user-read-email scope denied
            console.error(
              `OAuth sign-in without email (provider=${account.provider})`,
            );
            return "/login?error=OAuthAccountNotLinked";
          }
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          let userId: string;
          if (!existingUser) {
            // Create new user with email already verified
            const created = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name,
                avatarUrl: user.image,
                role: UserRole.LISTENER,
                emailVerified: new Date(),
              },
            });
            userId = created.id;
          } else {
            userId = existingUser.id;
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
            if ((!existingUser.name && user.name) || (!existingUser.avatarUrl && user.image)) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  name: existingUser.name || user.name,
                  avatarUrl: existingUser.avatarUrl || user.image,
                },
              });
            }
          }

          // Upsert OAuth Account row so Spotify tokens can be refreshed
          // for playlist/library APIs (and Google stays linkable).
          if (account.providerAccountId) {
            await prisma.account.upsert({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
              create: {
                userId,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token ?? undefined,
                access_token: account.access_token ?? undefined,
                expires_at: account.expires_at ?? undefined,
                token_type: account.token_type ?? undefined,
                scope: account.scope ?? undefined,
                id_token: account.id_token ?? undefined,
                session_state:
                  typeof account.session_state === "string"
                    ? account.session_state
                    : undefined,
              },
              update: {
                userId,
                refresh_token: account.refresh_token ?? undefined,
                access_token: account.access_token ?? undefined,
                expires_at: account.expires_at ?? undefined,
                scope: account.scope ?? undefined,
                id_token: account.id_token ?? undefined,
              },
            });
          }
        } catch (error) {
          console.error(
            `Error handling ${account.provider} sign-in:`,
            error,
          );
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
        token.refreshToken = account.refresh_token ?? token.refreshToken;
        (token as any).accessTokenExpires =
          account.expires_at != null ? account.expires_at * 1000 : undefined;
        (token as any).provider = account.provider;
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
  providers: [googleProvider, spotifyProvider, credentialsProvider],
} satisfies NextAuthConfig;
