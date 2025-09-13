import { z } from 'zod';

export const Settings = z.object({
  enabled: z.boolean().default(true),
});
export type Settings = z.infer<typeof Settings>;
