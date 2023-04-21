import { UnionFrom } from '../../types/helpers'
import { noop } from '../../common/helpers'
import { dbDriverProvider, setUpDbDriver } from './driver'

type SetDbFn<
  K extends Record<string, string>,
  P extends Record<UnionFrom<K>, any>,
  R
> = <N extends UnionFrom<K>, V extends P[N] = P[N]>(name: N, value: V) => R

type Logger = {
  error: (message: string, e: any) => void
}

type AsyncDbSettings = {
  logger?: Logger
}

const dummyLogger: Logger = {
  error: noop,
}

export class AsyncDbManager<
  F extends Record<string, string>,
  P extends Record<UnionFrom<F>, any>,
  Field extends string = UnionFrom<F>
> {
  public static readonly setDriver = setUpDbDriver

  public readonly fields
  private readonly logger = dummyLogger

  constructor(fields: F, setting?: AsyncDbSettings) {
    this.fields = fields
    Object.freeze(this.fields)
    if (setting?.logger) this.logger = setting?.logger
  }

  public readonly get = async <N extends keyof P, V = P[N]>(
    name: N
  ): Promise<V | undefined> => {
    try {
      const value = await dbDriverProvider.current.getItem(name as string)
      if (!value) return
      try {
        return JSON.parse(value)
      } catch {
        return value as any as V
      }
    } catch (e) {
      this.logger.error('Get db', e)
      throw e
    }
  }

  public readonly set: SetDbFn<F, P, Promise<void>> = async (name, value) => {
    try {
      await dbDriverProvider.current.setItem(name, JSON.stringify(value))
    } catch (e) {
      this.logger.error('Set db', e)
      throw e
    }
  }

  public readonly setSync: SetDbFn<F, P, void> = (name, value) => {
    this.set(name, value).catch(noop)
  }

  private readonly resetField = (name: Field) =>
    dbDriverProvider.current.removeItem(name)

  public readonly resetFields = async (name: Field | Field[]) => {
    try {
      if (!Array.isArray(name)) return this.resetField(name)
      await Promise.all(name.map((singleName) => this.resetField(singleName)))
    } catch (e) {
      this.logger.error('Reset db', e)
      throw e
    }
  }

  public readonly clear = () => {
    return Promise.all(
      Object.values(this.fields).map((field) => this.resetField(field as Field))
    )
  }
}
