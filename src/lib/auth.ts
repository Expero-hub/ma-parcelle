import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";

import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      firstName: { type: "string", required: false },
      lastName: { type: "string", required: false },
      phone: { type: "string", required: false },
      address: { type: "string", required: false },
      isValidated: { type: "boolean", required: false, defaultValue: false },
      active: { type: "boolean", required: false, defaultValue: true },
      profileId: { type: "string", required: true },
      companyId: { type: "string", required: false },
      createdById: { type: "string", required: false },
    },
  },
  plugins: [admin()],
});
