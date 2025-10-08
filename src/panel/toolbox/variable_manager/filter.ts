export type FilterType = 'string' | 'number' | 'array' | 'boolean' | 'object';

export type FiltersState = Record<FilterType, boolean>;

export const createDefaultFilters = (): FiltersState => ({
  string: true,
  number: true,
  array: true,
  boolean: true,
  object: true,
});
