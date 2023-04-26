import type { Effect } from 'effector'
import type { SpecificRequestProps } from './ApiEndpoint'

type ListVariant = Record<string, string> | string[]

export const fabric = <R = any, P = void>(
  fn: (props?: SpecificRequestProps<P> | undefined) => Effect<P, R>
) => {
  function createList<L extends ListVariant>(list: L) {
    if (Array.isArray(list)) {
      return list.reduce<Record<keyof L, Effect<P, R>>>((acc, item) => {
        acc[item as keyof L] = fn(item)
        return acc
      }, {} as Record<keyof L, Effect<P, R>>)
    }
    const resultList = {} as Record<keyof L, Effect<P, R>>
    for (let key in list) {
      resultList[key] = fn(key)
    }
    return resultList
  }

  return {
    list: createList,
  }
}
