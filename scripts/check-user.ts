import "dotenv/config";
import { prisma } from "@/db";

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: tsx scripts/check-user.ts <id-or-email>");
    process.exit(1);
  }

  const where = arg.includes("@") ? { email: arg } : { id: arg };

  const user = await prisma.user.findUnique({ where });

  if (!user) {
    console.log("User not found for:", where);
    process.exit(0);
  }

  console.log("User found:", {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt,
  });

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
