import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Libelle requis.").max(80, "80 caracteres maximum."),
  description: z.string().trim().max(240, "240 caracteres maximum.").optional().nullable(),
  active: z.boolean().optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;
