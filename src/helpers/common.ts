export function ensureNonNullable<T>(obj: T, name: string): NonNullable<T> {
  if (!obj) {
    throw new Error(`${name} not found`)
  }
  return obj
}
