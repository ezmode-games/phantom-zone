/**
 * Test fixtures using zocker for property-based testing.
 * These fixtures generate valid test data from Zod schemas.
 */

import { zocker } from "zocker";
import type { z } from "zod/v4";

/**
 * Generate single test data instance from Zod schema
 */
export function generateTestData<T extends z.ZodType>(
  schema: T,
  seed?: number,
): z.infer<T> {
  return zocker(schema, seed !== undefined ? { seed } : undefined).generate();
}

/**
 * Generate array of test data from Zod schema
 */
export function generateTestArray<T extends z.ZodType>(
  schema: T,
  length: number,
  seed?: number,
): z.infer<T>[] {
  return Array.from({ length }, (_, i) =>
    generateTestData(schema, seed !== undefined ? seed + i : undefined),
  );
}

/**
 * Create fixture factory with override support
 */
export function createFixtureFactory<T extends z.ZodType>(
  schema: T,
  baseSeed?: number,
) {
  let counter = baseSeed ?? 0;

  return {
    generate(overrides?: Partial<z.infer<T>>): z.infer<T> {
      const base = zocker(schema, { seed: counter++ }).generate();
      return { ...base, ...overrides };
    },
    generateMany(count: number): z.infer<T>[] {
      return Array.from({ length: count }, () => this.generate());
    },
    reset(newSeed = 0) {
      counter = newSeed;
    },
  };
}
