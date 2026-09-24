/**
 * Primitives for decoding untrusted board documents. They narrow one step at a
 * time so a decoder reads as the contract it enforces, and never widens a
 * value beyond what it has actually checked.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Finite number inside an inclusive range. Rejects NaN and Infinity. */
export const isNumberWithin = (
  value: unknown,
  min: number,
  max: number,
): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max

/** Whole number inside an inclusive range, for ids, seeds and versions. */
export const isIntegerWithin = (
  value: unknown,
  min: number,
  max: number,
): value is number =>
  isNumberWithin(value, min, max) && Number.isInteger(value)
