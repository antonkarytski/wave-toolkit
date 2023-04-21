import { createEffect, Store } from 'effector'
import { noop } from '../../common/helpers'
import { createDbRequest } from '../asyncDbManager/AsyncDbRequest'

type StorePersistProps<S> = {
  $store: Store<S>
  saveTo: string
  map?: (state: S) => any
}

export class StorePersist<
  P extends StorePersistProps<any>,
  T = P['map'] extends (...p: any[]) => any
    ? ReturnType<P['map']>
    : P['$store'] extends Store<infer S>
    ? S
    : never
> {
  private previousValue: T | null = null
  private _isInitiated = false
  public get isInitiated() {
    return this._isInitiated
  }
  private db
  public readonly resetDb

  private init = createEffect(() => {
    if (!this._isInitiated)
      return this.db.get().then((value) => {
        this.previousValue = value ?? null
        return value
      })
  })

  public readonly onInit = (watcher: (props: T | undefined | null) => void) => {
    if (this._isInitiated) {
      watcher(this.previousValue)
      return this
    }
    const unwatch = this.init.done.watch(({ result }) => {
      watcher(result)
      unwatch()
    })
    return this
  }

  constructor({ saveTo, $store, map }: P) {
    this.db = createDbRequest<T>(saveTo)
    this.resetDb = this.db.reset
    this.init.finally.watch(() => {
      this._isInitiated = true
    })

    if (map) {
      $store.updates.watch((state) => {
        const newValue = map(state)
        if (this.previousValue === newValue) return
        this.previousValue = newValue
        if (this._isInitiated) this.db.setSync(newValue)
      })
      return
    } else {
      $store.updates.watch((state) => {
        if (this.previousValue === state) return
        this.previousValue = state
        if (this._isInitiated) this.db.setSync(state)
      })
    }

    this.init().catch(noop)
  }
}

export function addStorePersist<P extends StorePersistProps<any>>(props: P) {
  return new StorePersist(props)
}
