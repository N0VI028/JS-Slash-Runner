import { z } from 'zod';

export function validateInplace<T>(schema: z.ZodType<T>, data: any): z.infer<typeof schema> {
  const result = parsePrettified(schema, data);
  _.assign(data, result);
  return data;
}

export function parsePrettified(schema: z.ZodType<any>, data: any): z.infer<typeof schema> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw Error(z.prettifyError(result.error));
  }
  return result.data;
}
