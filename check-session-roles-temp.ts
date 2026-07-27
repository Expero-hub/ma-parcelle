import "dotenv/config";
import { prisma } from "./src/lib/prisma";
import { auth } from "./src/lib/auth";

async function main() {
  // Find a staff user
  const user = await prisma.user.findFirst({
    where: { role: "staff" },
  });

  if (!user) {
    console.log("No staff user found");
    return;
  }

  console.log("Testing with user:", user.email, "role in DB:", user.role);

  // Create a temporary session
  const token = "temp-test-token-123456";
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
      ipAddress: "127.0.0.1",
      userAgent: "Test",
    },
  });

  try {
    // Mock headers with the cookie
    const headers = new Headers();
    headers.set("cookie", `better-auth.session_token=${token}`);

    // Call getSession
    const sessionData = await auth.api.getSession({ headers });
    console.log("Session Data User Object:", JSON.stringify(sessionData?.user, null, 2));
  } finally {
    // Clean up session
    await prisma.session.delete({ where: { id: session.id } });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
