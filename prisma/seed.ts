import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { auth } from "../src/lib/auth";

/** Modules et menus de base du dashboard (+ quelques exemples). */
const MODULES: {
  name: string;
  order: number;
  menus: { name: string; url: string; icon: string; order: number }[];
}[] = [
  {
    name: "Administration",
    order: 1,
    menus: [
      { name: "Utilisateurs", url: "/dashboard/utilisateurs", icon: "users", order: 1 },
      { name: "Profils & permissions", url: "/dashboard/profils", icon: "shield", order: 2 },
      { name: "Modules & menus", url: "/dashboard/menus", icon: "layout-grid", order: 3 },
    ],
  },
  {
    name: "Organisation",
    order: 2,
    menus: [
      { name: "Compagnies", url: "/dashboard/compagnies", icon: "building-2", order: 1 },
      { name: "Agences", url: "/dashboard/agences", icon: "store", order: 2 },
      { name: "Points de vente", url: "/dashboard/points-de-vente", icon: "map-pin", order: 3 },
    ],
  },
  {
    name: "Catalogue",
    order: 3,
    menus: [
      { name: "Zones", url: "/dashboard/zones", icon: "map", order: 1 },
      { name: "Parcelles", url: "/dashboard/parcelles", icon: "land-plot", order: 2 },
    ],
  },
  {
    name: "Ventes",
    order: 4,
    menus: [
      { name: "Réservations", url: "/dashboard/reservations", icon: "bookmark", order: 1 },
      { name: "Contrats", url: "/dashboard/contrats", icon: "file-text", order: 2 },
      { name: "Échéances", url: "/dashboard/echeances", icon: "calendar-clock", order: 3 },
      { name: "Paiements", url: "/dashboard/paiements", icon: "wallet", order: 4 },
    ],
  },
  {
    // Menus d'exemple pour illustrer l'extension du système.
    name: "Exemples",
    order: 5,
    menus: [
      { name: "Tableau de bord", url: "/dashboard", icon: "gauge", order: 1 },
      { name: "Rapports", url: "/dashboard/rapports", icon: "bar-chart-3", order: 2 },
    ],
  },
];

async function seedProfiles() {
  const admin = await prisma.profile.upsert({
    where: { id: "profile-admin" },
    update: {},
    create: {
      id: "profile-admin",
      name: "Administrateur",
      type: "ADMIN",
      description: "Accès complet à la plateforme",
      isSystem: true,
    },
  });

  await prisma.profile.upsert({
    where: { id: "profile-client" },
    update: {},
    create: {
      id: "profile-client",
      name: "Client",
      type: "CLIENT",
      description: "Client final (réservations, contrats)",
      isSystem: true,
    },
  });

  return admin;
}

async function seedMenus() {
  const menuIds: string[] = [];

  for (const mod of MODULES) {
    const moduleId = `module-${mod.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    await prisma.module.upsert({
      where: { id: moduleId },
      update: { name: mod.name, order: mod.order },
      create: { id: moduleId, name: mod.name, order: mod.order },
    });

    for (const menu of mod.menus) {
      const menuId = `menu-${menu.url.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
      await prisma.menu.upsert({
        where: { id: menuId },
        update: { name: menu.name, url: menu.url, icon: menu.icon, order: menu.order, moduleId },
        create: {
          id: menuId,
          name: menu.name,
          url: menu.url,
          icon: menu.icon,
          order: menu.order,
          moduleId,
        },
      });
      menuIds.push(menuId);
    }
  }

  return menuIds;
}

async function grantAdminPermissions(profileId: string, menuIds: string[]) {
  for (const menuId of menuIds) {
    const id = `perm-${profileId}-${menuId}`;
    await prisma.profilePermission.upsert({
      where: { id },
      update: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
      create: {
        id,
        profileId,
        menuId,
        submenuId: null,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    });
  }
}

async function seedAdminUser(adminProfileId: string) {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Administrateur";

  if (!email || !password) {
    console.warn(
      "[seed] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD manquants — admin non créé. Renseignez-les dans .env puis relancez le seed.",
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] Admin ${email} déjà présent — aucune action.`);
    return;
  }

  // Création via l'API Better Auth → hash scrypt correct dans Account.
  await auth.api.signUpEmail({
    body: { email, password, name, profileId: adminProfileId },
  });

  // Compléter les champs qui ne passent pas par le signup public.
  await prisma.user.update({
    where: { email },
    data: {
      role: "admin",
      emailVerified: true,
      isValidated: true,
      profileId: adminProfileId,
    },
  });

  console.log(`[seed] Admin ${email} créé.`);
}

async function main() {
  const adminProfile = await seedProfiles();
  const menuIds = await seedMenus();
  await grantAdminPermissions(adminProfile.id, menuIds);
  await seedAdminUser(adminProfile.id);
  console.log("[seed] Terminé.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
