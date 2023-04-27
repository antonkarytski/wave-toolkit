export type DbDriver = {
  setItem: (key: string, value: string) => Promise<void>
  getItem: (key: string) => Promise<string | undefined | null>
  removeItem: (key: string) => Promise<void>
}

const localStorageDriver: DbDriver = {
  setItem: async (key, value) => localStorage.setItem(key, value),
  getItem: async key => localStorage.getItem(key),
  removeItem: async key => localStorage.removeItem(key),
}

export const DB_MANAGER_INITIAL_DRIVER: DbDriver = (() => {
  try {
    return require('@react-native-async-storage/async-storage').default
  } catch (e) {
    if (localStorage) {
      return localStorageDriver
    }
  }
})()

export const dbDriverProvider = {
  current: DB_MANAGER_INITIAL_DRIVER,
}

export const setUpDbDriver = (driver: DbDriver) => {
  dbDriverProvider.current = driver
}

setTimeout(() => {
  if (!dbDriverProvider.current) {
    throw new Error(
      'No db driver provided, please install @react-native-async-storage/async-storage, or call setUpDbDriver with your own DbDriver',
    )
  }
}, 10)
