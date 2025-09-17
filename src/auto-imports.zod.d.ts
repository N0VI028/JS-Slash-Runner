export {};

declare global {
  // @ts-ignore
  export * as z from 'zod';
  // @ts-ignore
  import('zod');
}
