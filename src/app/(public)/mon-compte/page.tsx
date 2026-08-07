import { notFound } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./_components/profile-form";

export default async function MonComptePage() {
  const sessionUser = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });

  if (!user) {
    notFound();
  }

  const formattedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone ?? "",
    address: user.address ?? "",
    birthDate: user.birthDate ? user.birthDate.toISOString().split("T")[0] : "",
    role: user.role ?? "user",
  };

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8 animate-[fadeUp_.4s_ease_both]">
      <ProfileForm user={formattedUser} />
    </div>
  );
}
