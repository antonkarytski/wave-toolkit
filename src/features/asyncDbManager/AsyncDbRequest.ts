import { noop } from '../../common/helpers'
import { dbDriverProvider, setUpDbDriver } from './driver'

export class AsyncDbRequest<T = string> {
  public static readonly setDriver = setUpDbDriver

  public readonly key
  private getMapFn: null | ((value: any) => T | undefined) = null
  private setMapFn: null | ((value: T, currentValue: any) => any | null) = null
  private resetFn: null | ((value: any) => any) = null

  constructor(key: string) {
    this.key = key
  }

  public readonly get = async (): Promise<T | undefined> => {
    const value = await dbDriverProvider.current.getItem(this.key)
    if (!value) return
    try {
      const parsed = JSON.parse(value)
      if (!this.getMapFn) return parsed
      return this.getMapFn(parsed)
    } catch {
      return value as any as T
    }
  }

  public readonly set = async (value: T) => {
    if (!this.setMapFn) {
      return dbDriverProvider.current.setItem(this.key, JSON.stringify(value))
    }
    let current = await dbDriverProvider.current.getItem(this.key)
    if (current) {
      current = JSON.parse(current)
    }
    const valueToSave = this.setMapFn(value, current)
    return dbDriverProvider.current.setItem(
      this.key,
      JSON.stringify(valueToSave)
    )
  }

  public readonly setSync = (value: T) => {
    this.set(value).catch(noop)
  }

  public readonly reset = () => {
    if (!this.resetFn) return dbDriverProvider.current.removeItem(this.key)
    return dbDriverProvider.current.getItem(this.key).then((value) => {
      if (!value) return
      const parsed = JSON.parse(value)
      const newValue = this.resetFn!(parsed)
      return dbDriverProvider.current.setItem(
        this.key,
        JSON.stringify(newValue)
      )
    })
  }

  public setMap<U>(mapper: (value: T, currentValue: U | undefined) => U) {
    this.setMapFn = mapper
    return this
  }

  public getMap<U>(mapper: (value: U | undefined) => T | undefined) {
    this.getMapFn = mapper
    return this
  }

  public resetMap<U>(mapper: (value: U | undefined) => U | undefined) {
    this.resetFn = mapper
    return this
  }
}

export function createDbRequest<T = string>(key: string) {
  return new AsyncDbRequest<T>(key)
}
