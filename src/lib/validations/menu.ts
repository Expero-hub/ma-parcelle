import { z } from "zod";

const nullableText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

export const menuSchema = z.object({
  name: z.string().trim().min(1, "Nom du menu requis.").max(80, "80 caracteres maximum."),
  moduleId: z.string().min(1, "Module requis."),
  parentId: nullableText,
  url: nullableText,
  icon: nullableText,
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export type MenuInput = z.infer<typeof menuSchema>;
