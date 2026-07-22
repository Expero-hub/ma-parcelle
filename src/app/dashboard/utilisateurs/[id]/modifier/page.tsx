import { notFound } from "next/navigation";

import { requirePermission, getCurrentUser } from "@/lib/authz";
import { getScopedAgencyIds, type ScopedUser } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { UpdateUserForm } from "./_components/update-user-form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("update");
  const { id } = await params;
  const user = (await getCurrentUser())! as ScopedUser;
  const isAdmin = (user.role ?? "user") === "admin";

  const agencyIds = await getScopedAgencyIds(user);

  const [targetUser, profiles, agencies, companies] = await Promise.all([
    prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileId: true,
        companyId: true,
        active: true,
        agencyMembers: { select: { agencyId: true } },
      },
    }),
    prisma.profile.findMany({
      where: { active: true, ...(isAdmin ? {} : { type: { not: "ADMIN" } }) },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
    prisma.agency.findMany({
      where: agencyIds === null ? {} : { id: { in: agencyIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.company.findMany({
      where: { active: true, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!targetUser) notFound();

  const formattedTarget = {
    id: targetUser.id,
    email: targetUser.email,
    firstName: targetUser.firstName ?? "",
    lastName: targetUser.lastName ?? "",
    phone: targetUser.phone ?? "",
    profileId: targetUser.profileId,
    companyId: targetUser.companyId ?? "",
    agencyIds: targetUser.agencyMembers.map((am) => am.agencyId),
    active: targetUser.active,
  };

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-8">
      <h1 className="mb-6 font-display text-2xl font-semibold text-text">Modifier l&apos;utilisateur</h1>
      <UpdateUserForm
        user={formattedTarget}
        profiles={profiles}
        agencies={agencies}
        companies={companies}
      />
    </div>
  );
}
