import { isRecord } from './validate.js'

/** `idle`: nothing is stored yet. `saved`: the stored document was restored. */
export type LoadStatus = 'idle' | 'saved' | 'unavailable' | 'invalid'
export type SaveStatus = 'saved' | 'unavailable' | 'full'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type PersistenceOptions<T> = {
  key: string
  /** Stamped onto every document; other versions go through `migrate`. */
  version: number
  /** Throws for anything untrustworthy. Never returns partially valid data. */
  decode: (document: Record<string, unknown>) => T
  /** Returns the document body; the store's `version` overrides any of its own. */
  encode: (value: T) => Record<string, unknown>
  /**
   * Upgrades a document stamped with another version into the current shape,
   * which is then decoded as usual. Return null (or throw) to reject it as
   * invalid. Without it, every other version is invalid.
   */
  migrate?: (
    document: Record<string, unknown>,
    fromVersion: number,
  ) => Record<string, unknown> | null
  /**
   * Defaults to `localStorage` where it exists. Returning null (or throwing)
   * reports `unavailable` instead of failing — SSR and blocked storage alike.
   */
  getStorage?: () => StorageLike | null
  /** Serialised length cap, applied on both save and load. */
  maxCharacters?: number
  /** Cheap pre-serialisation limit check; false reports `full`. */
  withinLimits?: (value: T) => boolean
}

export type Persistence<T> = {
  load: () => { value: T | null; status: LoadStatus }
  /** Throws for NaN or Infinity, which JSON would silently store as null. */
  save: (value: T) => SaveStatus
  remove: () => void
}

// Browsers disagree on the shape, and Safari reports a legacy numeric code.
const isQuotaExceeded = (error: unknown) => {
  if (typeof error !== 'object' || error === null) return false
  const { name, code } = error as { name?: unknown; code?: unknown }
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  )
}

// JSON writes NaN and Infinity as null, which decode would then reject, losing
// the whole document on the next load. That is a bug in the caller's data.
const finiteOnly = (name: string, value: unknown) => {
  if (typeof value === 'number' && !Number.isFinite(value))
    throw new Error(`Cannot save ${value} at "${name}": JSON stores it as null`)
  return value
}

/**
 * Versioned, size-limited persistence for a single document. Stored data is
 * untrusted: a document that does not decode cleanly is reported as invalid
 * rather than partially restored, and nothing is written back until the caller
 * saves again.
 */
export function createPersistence<T>({
  key,
  version,
  decode,
  encode,
  migrate,
  getStorage = () => (typeof localStorage === 'undefined' ? null : localStorage),
  maxCharacters = 2_000_000,
  withinLimits,
}: PersistenceOptions<T>): Persistence<T> {
  const storage = () => {
    try {
      return getStorage()
    } catch {
      return null
    }
  }
  return {
    load() {
      let raw: string | null
      try {
        const store = storage()
        if (!store) return { value: null, status: 'unavailable' }
        raw = store.getItem(key)
      } catch {
        return { value: null, status: 'unavailable' }
      }
      if (raw === null) return { value: null, status: 'idle' }
      try {
        if (raw.length > maxCharacters) throw new Error('Document is too large')
        const data: unknown = JSON.parse(raw)
        if (!isRecord(data)) throw new Error('Unsupported document')
        if (data.version === version)
          return { value: decode(data), status: 'saved' }
        const migrated =
          migrate && typeof data.version === 'number'
            ? migrate(data, data.version)
            : null
        if (!migrated) throw new Error('Unsupported document version')
        return { value: decode(migrated), status: 'saved' }
      } catch {
        return { value: null, status: 'invalid' }
      }
    },
    save(value) {
      if (withinLimits && !withinLimits(value)) return 'full'
      const raw = JSON.stringify({ ...encode(value), version }, finiteOnly)
      if (raw.length > maxCharacters) return 'full'
      try {
        const store = storage()
        if (!store) return 'unavailable'
        store.setItem(key, raw)
        return 'saved'
      } catch (error) {
        return isQuotaExceeded(error) ? 'full' : 'unavailable'
      }
    },
    remove() {
      try {
        storage()?.removeItem(key)
      } catch {
        // Nothing to report: the document is already unreachable.
      }
    },
  }
}
