import { Event } from 'effector'
import { StateModel } from './model.state'
import { useStore } from 'effector-react'

export function useStateStore<T>(model: StateModel<T>): [T, Event<T>] {
  const state = useStore(model.$state)
  return [state, model.set]
}
