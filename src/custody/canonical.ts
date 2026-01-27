type CanonicalPrimitive = string | number | boolean | null
export type CanonicalValue =
  | CanonicalPrimitive
  | CanonicalValue[]
  | { [key: string]: CanonicalValue }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toCanonical = (value: unknown): CanonicalValue => {
  if (value === null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (typeof value === 'object' && value && 'toJSON' in value) {
    return toCanonical((value as { toJSON: () => unknown }).toJSON())
  }
  if (Array.isArray(value)) {
    return value.map((entry) => toCanonical(entry))
  }
  if (isRecord(value)) {
    const keys = Object.keys(value).sort()
    const result: Record<string, CanonicalValue> = {}
    for (const key of keys) {
      const entry = value[key]
      if (typeof entry === 'undefined') continue
      result[key] = toCanonical(entry)
    }
    return result
  }
  return null
}

export const canonicalize = (value: unknown): CanonicalValue => toCanonical(value)

export const canonicalStringify = (value: unknown): string =>
  JSON.stringify(toCanonical(value))
