export const events = {
  extension_enabled: 'extension_enabled',
  extension_disabled: 'extension_disabled',
} as const;

export type Events = {
  [events.extension_enabled]: undefined;
  [events.extension_disabled]: undefined;
};
