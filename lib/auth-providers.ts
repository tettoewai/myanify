import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/db";
import bcrypt from "bcryptjs";

export async function authorizeCredentials(credentials: any) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: credentials.email as string },
  });

  if (!user || !user.passwordHash) {
    return null;
  }

  const passwordsMatch = await bcrypt.compare(
    credentials.password as string,
    user.passwordHash
  );

  if (!passwordsMatch) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export const credentialsProvider = Credentials({
  authorize: authorizeCredentials,
});

export const googleProvider = Google({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
});
