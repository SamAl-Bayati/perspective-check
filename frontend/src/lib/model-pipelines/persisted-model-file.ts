const DATABASE_NAME = 'perspective-check.modelFiles'
const DATABASE_VERSION = 1
const STORE_NAME = 'files'
const LAST_LOADED_FILE_KEY = 'lastLoadedFile'

type StoredProjectionFile = {
  name: string
  type: string
  lastModified: number
  data: Blob
}

const getIndexedDb = () => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('Browser storage is unavailable')
  }

  return window.indexedDB
}

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = getIndexedDb().open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open browser storage'))
  })

const runStoreRequest = async <TResult>(
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<TResult>
) => {
  const database = await openDatabase()

  return new Promise<TResult>((resolve, reject) => {
    let requestResult: TResult
    const transaction = database.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    const request = createRequest(store)

    request.onsuccess = () => {
      requestResult = request.result
    }

    request.onerror = () => {
      database.close()
      reject(request.error ?? new Error('Unable to access browser storage'))
    }

    transaction.oncomplete = () => {
      database.close()
      resolve(requestResult)
    }

    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Unable to complete browser storage update'))
    }

    transaction.onabort = () => {
      database.close()
      reject(transaction.error ?? new Error('Browser storage update was cancelled'))
    }
  })
}

const isStoredProjectionFile = (value: unknown): value is StoredProjectionFile => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.name === 'string' &&
    typeof record.type === 'string' &&
    typeof record.lastModified === 'number' &&
    record.data instanceof Blob
  )
}

export const getLastProjectionModelFile = async () => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null
  }

  const storedFile = await runStoreRequest<unknown>(
    'readonly',
    (store) => store.get(LAST_LOADED_FILE_KEY)
  )

  if (!isStoredProjectionFile(storedFile)) {
    return null
  }

  return new File([storedFile.data], storedFile.name, {
    type: storedFile.type,
    lastModified: storedFile.lastModified
  })
}

export const persistLastProjectionModelFile = async (file: File) => {
  await runStoreRequest<IDBValidKey>(
    'readwrite',
    (store) => store.put(
      {
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        data: file
      } satisfies StoredProjectionFile,
      LAST_LOADED_FILE_KEY
    )
  )
}

export const clearLastProjectionModelFile = async () => {
  await runStoreRequest<undefined>(
    'readwrite',
    (store) => store.delete(LAST_LOADED_FILE_KEY)
  )
}
