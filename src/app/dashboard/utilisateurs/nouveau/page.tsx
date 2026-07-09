import { requirePermission, getCurrentUser } from "@/lib/authz";
import { getScopedAgencyIds, getScopedPointOfSaleIds, type ScopedUser } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "@/app/dashboard/utilisateurs/nouveau/_components/create-user-form";

export default async function NewUserPage() {
  await requirePermission("create");
  const user = (await getCurrentUser())! as ScopedUser;
  const isAdmin = (user.role ?? "user") === "admin";

  const [agencyIds, posIds] = await Promise.all([
    getScopedAgencyIds(user),
    getScopedPointOfSaleIds(user),
  ]);

  const [profiles, agencies, pointsOfSale] = await Promise.all([
    prisma.profile.findMany({
      where: { active: true, ...(isAdmin ? {} : { type: { not: "ADMIN" } }) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.agency.findMany({
      where: agencyIds === null ? {} : { id: { in: agencyIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.pointOfSale.findMany({
      where: posIds === null ? {} : { id: { in: posIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-8">
      <h1 className="mb-6 font-display text-2xl font-semibold text-text">Créer un utilisateur</h1>
      <CreateUserForm profiles={profiles} agencies={agencies} pointsOfSale={pointsOfSale} />
    </div>
  );
}
