import { isRecord } from './validate.js'

export type PersistenceStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'unavailable'
  | 'invalid'
  | 'full'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type PersistenceOptions<T> = {
  key: string
  /** Stamped onto every document; other versions are rejected on load. */
  version: number
  /** Throws for anything untrustworthy. Never returns partially valid data. */
  decode: (document: Record<string, unknown>) => T
  /** Returns the document body; the version is added by the store. */
  encode: (value: T) => Record<string, unknown>
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
  load: () => { value: T | null; status: PersistenceStatus }
  save: (value: T) => PersistenceStatus
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
        if (!isRecord(data) || data.version !== version)
          throw new Error('Unsupported document version')
        return { value: decode(data), status: 'saved' }
      } catch {
        return { value: null, status: 'invalid' }
      }
    },
    save(value) {
      if (withinLimits && !withinLimits(value)) return 'full'
      const raw = JSON.stringify({ version, ...encode(value) })
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
