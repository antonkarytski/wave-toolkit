export function removeLastSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}
export function removeFirstSlash(value: string) {
  return value.startsWith('/') ? value.slice(1) : value
}
export function removeSlashes(value: string) {
  let result = removeFirstSlash(value)
  result = removeLastSlash(result)
  return result
}
