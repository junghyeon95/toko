const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : isRecord(value)
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
      : value

const keyOf = (value: unknown): string => JSON.stringify(canonical(value)) ?? 'undefined'

export const same = (a: unknown, b: unknown): boolean => keyOf(a) === keyOf(b)

const without = (list: readonly unknown[], taken: readonly unknown[]): unknown[] => {
  const rest = taken.map(keyOf)
  return list.filter(item => {
    const at = rest.indexOf(keyOf(item))
    if (at < 0) {
      return true
    }
    rest.splice(at, 1)
    return false
  })
}

export const mergeShared = <T>(synced: unknown, local: T, stored: unknown, counters: readonly string[] = [], levels: readonly string[] = []): T => {
  if (same(local, synced)) {
    return stored as T
  }
  if (same(stored, synced) || same(stored, local)) {
    return local
  }
  if (Array.isArray(local) && Array.isArray(stored)) {
    const before = Array.isArray(synced) ? synced : []
    return [...without(stored, without(before, local)), ...without(local, before)] as T
  }
  if (isRecord(local) && isRecord(stored)) {
    const before = isRecord(synced) ? synced : {}
    const keys = [...new Set([...Object.keys(stored), ...Object.keys(local)])]
    return Object.fromEntries(
      keys
        .map(key => {
          const [was, mine, theirs] = [before[key], local[key], stored[key]]
          const isNumber = typeof was === 'number' && typeof mine === 'number' && typeof theirs === 'number'
          const isCounter = isNumber && counters.includes(key)
          const isLevel = isNumber && levels.includes(key) && mine !== was && theirs !== was
          return [key, isCounter ? theirs + mine - was : isLevel ? mine + Math.max(0, theirs - was) : mergeShared(was, mine, theirs)] as const
        })
        .filter(([, value]) => value !== undefined),
    ) as T
  }
  return local
}
