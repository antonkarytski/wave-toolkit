export * from './time/helpers'
export * from './string/helpers'
export function noop() {}
export function mapObject<T extends Record<string, any>, R>(
  obj: T,
  iterator: (value: T[keyof T], key: keyof T) => R,
): Record<keyof T, R> {
  const list = {} as { [Key in keyof T]: R }
  for (let key in obj) {
    list[key] = iterator(obj[key], key)
  }
  return list
}
