import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      // If caller asked for debug output, return session info (safe for dev)
      if (request.headers.get("x-debug") === "1") {
        return NextResponse.json(
          { error: "Unauthorized", session },
          { status: 401 }
        );
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isPremium: true,
        createdAt: true,
        updatedAt: true,
        passwordHash: true,
        paymentRequests: {
          where: {
            status: "PENDING",
          },
          take: 1,
        },
      },
    });

    // If user doesn't exist, create it (for OAuth users that might have been deleted)
    if (!user) {
      console.log(
        "[api/user/profile] User not found, creating new user for session.user.id:",
        session.user.id
      );
      const newUser = await prisma.user.create({
        data: {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.name || null,
          avatarUrl: null, // Will be updated if available
          role: session.user.role || "LISTENER",
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          isPremium: true,
          createdAt: true,
          updatedAt: true,
          passwordHash: true,
          paymentRequests: {
            where: {
              status: "PENDING",
            },
            take: 1,
          },
        },
      });
      // Return user data with hasPassword flag
      const { passwordHash, paymentRequests, ...userData } = newUser;
      return NextResponse.json({
        ...userData,
        hasPassword: !!passwordHash,
        hasPendingPremium: paymentRequests.length > 0,
      });
    }

    // Return user data with hasPassword flag
    const { passwordHash, paymentRequests, ...userData } = user;
    return NextResponse.json({
      ...userData,
      hasPassword: !!passwordHash,
      hasPendingPremium: paymentRequests.length > 0,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isPremium: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
