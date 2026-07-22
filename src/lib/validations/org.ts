import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Raison sociale requise."),
  address: optionalText,
  phone: optionalText,
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const createAgencySchema = z.object({
  name: z.string().trim().min(1, "Nom requis."),
  address: optionalText,
  phone: optionalText,
});
export type CreateAgencyInput = z.infer<typeof createAgencySchema>;
