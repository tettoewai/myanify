import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/db";
import bcrypt from "bcryptjs";

export const credentialsProvider = Credentials({
  async authorize(credentials) {
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
  },
});
