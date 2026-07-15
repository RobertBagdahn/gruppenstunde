import { z } from "zod";

export const permissionBaseSchema = z.object({
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});

export type PermissionFields = z.infer<typeof permissionBaseSchema>;
