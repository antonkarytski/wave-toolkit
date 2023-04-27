import {
  createEvent,
  restore,
  Store,
  Event,
  Unit,
  Tuple,
  InferValueFromTupleOfUnits,
} from 'effector'

class StateModelClass<T> {
  public readonly $state: Store<T>
  public readonly set = createEvent<T>()

  constructor(initial: T) {
    this.$state = restore(this.set, initial)
  }

  public reset(event: Event<any>): this
  public reset(event?: void): void
  public reset(event: any) {
    if (!event) return this.set(this.$state.defaultState)
    this.$state.reset(event)
    return this
  }

  on<E>(trigger: Unit<E>, reducer: (state: T, payload: E) => T | void): this
  on<E>(triggers: Unit<E>[], reducer: (state: T, payload: E) => T | void): this
  on<E extends Tuple<Unit<any>>>(
    triggers: E,
    reducer: (state: T, payload: InferValueFromTupleOfUnits<E>) => T | void,
  ): this
  public on(triggers: any, reducer: any) {
    this.$state.on(triggers, reducer)
    return this
  }
}

export function createStateModel<T>(initial: T) {
  return new StateModelClass(initial)
}

export type StateModel<T> = {
  reset: () => void
  $state: Store<T>
  set: Event<T>
}
