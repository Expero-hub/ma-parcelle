import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { auth } from "../src/lib/auth";

/** Un menu peut porter des sous-menus (récursif) via `children`. */
type SeedMenu = {
  name: string;
  url: string;
  icon: string;
  order: number;
  children?: SeedMenu[];
};

/** Modules et menus de base du dashboard (+ quelques exemples). */
const MODULES: {
  name: string;
  order: number;
  menus: SeedMenu[];
}[] = [
  {
    // Tableau de bord = menu 1 (accueil du dashboard).
    name: "Général",
    order: 1,
    menus: [{ name: "Tableau de bord", url: "/dashboard", icon: "gauge", order: 1 }],
  },
  {
    name: "Administration",
    order: 2,
    menus: [
      { 
        name: "Utilisateurs", 
        url: "/dashboard/utilisateurs", 
        icon: "users", 
        order: 1, 
        children: [{ name: "Clients", url: "/dashboard/utilisateurs/clients", icon: "users", order: 2 }],
      },
      { name: "Profils & permissions", url: "/dashboard/profils", icon: "shield", order: 3 },
      { name: "Modules & menus", url: "/dashboard/menus", icon: "layout-grid", order: 4 },
    ],
  },
  {
    name: "Organisation",
    order: 3,
    menus: [
      { name: "Compagnies", url: "/dashboard/compagnies", icon: "building-2", order: 1 },
      { name: "Agences", url: "/dashboard/agences", icon: "store", order: 2 },
    ],
  },
  {
    name: "Catalogue",
    order: 4,
    menus: [
      { name: "Zones", url: "/dashboard/zones", icon: "map", order: 1 },
      { name: "Parcelles", url: "/dashboard/parcelles", icon: "land-plot", order: 2 },
    ],
  },
  {
    name: "Importations",
    order: 5,
    menus: [
      { name: "Fichiers", url: "/dashboard/importations/fichiers", icon: "file-spreadsheet", order: 1 },
      { name: "Contrats", url: "/dashboard/importations/liste-des-contrats", icon: "file-text", order: 2 },
      { name: "Émissions", url: "/dashboard/importations/liste-des-emissions", icon: "calendar-clock", order: 3 },
      { name: "Encaissements", url: "/dashboard/importations/liste-des-encaissements", icon: "wallet", order: 4 },
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

  const client = await prisma.profile.upsert({
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

  return { admin, client };
}

/** Upsert un menu et, récursivement, ses sous-menus. Collecte tous les ids. */
async function upsertMenu(
  menu: SeedMenu,
  moduleId: string,
  parentId: string | null,
  collected: string[],
) {
  const menuId = `menu-${menu.url.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  await prisma.menu.upsert({
    where: { id: menuId },
    update: { name: menu.name, url: menu.url, icon: menu.icon, order: menu.order, moduleId, parentId },
    create: {
      id: menuId,
      name: menu.name,
      url: menu.url,
      icon: menu.icon,
      order: menu.order,
      moduleId,
      parentId,
    },
  });
  collected.push(menuId);

  for (const child of menu.children ?? []) {
    await upsertMenu(child, moduleId, menuId, collected);
  }
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
      await upsertMenu(menu, moduleId, null, menuIds);
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

  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      emailVerified: true,
      role: "admin",
      isValidated: true,
      active: true,
      profileId: adminProfileId,
    },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: hashed,
    },
  });

  console.log(`[seed] Admin ${email} créé.`);
}

async function seedTestClientUserAndContract(clientProfileId: string) {
  const clientEmail = "perodev10@gmail.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "Password123!";

  let clientUser = await prisma.user.findUnique({ where: { email: clientEmail } });

  if (!clientUser) {
    const ctx = await auth.$context;
    const hashed = await ctx.password.hash(password);

    clientUser = await prisma.user.create({
      data: {
        name: "John Doe",
        email: clientEmail,
        phone: "0123456789",
        emailVerified: true,
        role: "user",
        isValidated: true,
        active: true,
        profileId: clientProfileId,
      },
    });

    await prisma.account.create({
      data: {
        userId: clientUser.id,
        accountId: clientUser.id,
        providerId: "credential",
        password: hashed,
      },
    });
    console.log(`[seed] Client de test ${clientEmail} créé.`);
  }

  // 1. S'assurer qu'une agence et un point de vente existent
  let agency = await prisma.agency.findFirst({ where: { deletedAt: null } });
  if (!agency) {
    agency = await prisma.agency.create({
      data: {
        name: "Agence de Menontin",
        phone: "0123456789",
        address: "Cotonou, Menontin",
        active: true,
      },
    });
  }

  let pos = await prisma.pointOfSale.findFirst({ where: { agencyId: agency.id } });
  if (!pos) {
    pos = await prisma.pointOfSale.create({
      data: {
        name: "Point de Vente Menontin A",
        phone: "0123456789",
        address: "Cotonou",
        active: true,
        agencyId: agency.id,
      },
    });
  }

  // S'assurer qu'une zone et une parcelle de test existent
  let zone = await prisma.zone.findFirst({ where: { deletedAt: null } });
  if (!zone) {
    zone = await prisma.zone.create({
      data: {
        code: "ZN-COTONOU",
        commune: "Cotonou",
        district: "Fidjrossè",
        department: "Littoral",
        fullAddress: "Fidjrossè, Cotonou, Littoral, Bénin",
      },
    });
  }

  let parcelle = await prisma.parcelle.findFirst({ where: { deletedAt: null } });
  if (!parcelle) {
    parcelle = await prisma.parcelle.create({
      data: {
        reference: "Par10001",
        area: 1500,
        price: 5000000,
        status: "AVAILABLE",
        zoneId: zone.id,
        pointOfSaleId: pos.id,
        description: "Parcelle de test pour contrat client",
      },
    });
  } else if (!parcelle.pointOfSaleId) {
    parcelle = await prisma.parcelle.update({
      where: { id: parcelle.id },
      data: { pointOfSaleId: pos.id },
    });
  }

  // 2. Créer un contrat actif CNT001 pour perodev10@gmail.com
  let contract = await prisma.contract.findUnique({ where: { reference: "CNT001" } });
 
  if (!contract) {
    contract = await prisma.contract.create({
      data: {
        reference: "CNT001",
        totalAmount: 500000,
        status: "ACTIVE",
        periodicity: "MONTHLY",
        installmentAmount: 500000,
        startDate: new Date("2025-07-04"),
        endDate: new Date("2030-06-04"),
        isValidated: true,
        userId: clientUser.id,
        parcelleId: parcelle.id,
        agencyId: agency.id,
      },
    });
    console.log(`[seed] Contrat actif CNT001 rattaché à ${clientEmail} et à l'agence ${agency.name} créé.`);
  }

  // 3. Émissions (Installments)
  let emi1 = await prisma.installment.findUnique({ where: { reference: "Emi10001" } });
  if (!emi1) {
    emi1 = await prisma.installment.create({
      data: {
        reference: "Emi10001",
        startDate: new Date("2025-08-01"),
        endDate: new Date("2025-08-31"),
        amount: 500000,
        status: "PAID",
        contractId: contract.id,
      },
    });
  }

  let emi2 = await prisma.installment.findUnique({ where: { reference: "Emi10002" } });
  if (!emi2) {
    emi2 = await prisma.installment.create({
      data: {
        reference: "Emi10002",
        startDate: new Date("2025-09-01"),
        endDate: new Date("2025-09-30"),
        amount: 500000,
        status: "PAID",
        contractId: contract.id,
      },
    });
  }

  // 4. Encaissements (Payments)
  let enc1 = await prisma.payment.findUnique({ where: { reference: "Enc10001" } });
  if (!enc1) {
    await prisma.payment.create({
      data: {
        reference: "Enc10001",
        amount: 500000,
        paymentDate: new Date("2025-07-08"),
        agencyFee: 50000,
        comment: "RAS",
        installmentId: emi1.id,
      },
    });
  }

  let enc2 = await prisma.payment.findUnique({ where: { reference: "Enc10002" } });
  if (!enc2) {
    await prisma.payment.create({
      data: {
        reference: "Enc10002",
        amount: 500000,
        paymentDate: new Date("2025-07-08"),
        agencyFee: 50000,
        comment: "RAS",
        installmentId: emi2.id,
      },
    });
  }
}

async function main() {
  const { admin, client } = await seedProfiles();
  const menuIds = await seedMenus();
  await grantAdminPermissions(admin.id, menuIds);
  await seedAdminUser(admin.id);
  await seedTestClientUserAndContract(client.id);
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

