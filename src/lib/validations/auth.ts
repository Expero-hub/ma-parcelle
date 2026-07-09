import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide."),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "8 caractères minimum."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirm"],
  });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

export const createUserSchema = z.object({
  email: z.string().email("Email invalide."),
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  phone: z.string().optional(),
  profileId: z.string().min(1, "Profil requis."),
  companyId: z.string().optional(),
  agencyIds: z.array(z.string()).optional().default([]),
  pointOfSaleIds: z.array(z.string()).optional().default([]),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const toggleUserSchema = z.object({ active: z.boolean() });
export type ToggleUserInput = z.infer<typeof toggleUserSchema>;
