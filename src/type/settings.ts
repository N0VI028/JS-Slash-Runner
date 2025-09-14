import { z } from 'zod';

export const Settings = z
  .object({
    enabled: z.boolean().default(true),
  })
  .prefault({});
export type Settings = z.infer<typeof Settings>;
