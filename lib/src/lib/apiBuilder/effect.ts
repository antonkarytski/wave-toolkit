import { Effect, Event, createEffect } from 'effector'
import { createXhr } from '../request/xhr'
import {
  DoRequestProps,
  RequestDataGetter,
  RequestHandler,
  RequestProps,
  RequestPropsGetter,
} from './types'

type RawCreator<Params> = {
  <T>(mapper: (response: Response) => T): Effect<Params, T>
  (): Effect<Params, Response>
}

type EffectProgressSettings<Params, Response> = {
  progress: Event<ProgressEvent>
  copy: () => EffectWithProgress<Params, Response>
}

type ExtEffectMethods<Params, R> = {
  withProgress: () => EffectWithProgress<Params, R>
  raw: RawCreator<Params>
  url: (params: Params) => string
  requestProps: (params: Params) => RequestProps<Params>
  requestData: (params: Params) => Promise<{ data: RequestInit; url: string }>
  unprotect: () => ApiEffect<Params, R>
  protect: () => ApiEffect<Params, R>
}

type ApiEffect<Params, Response> = Effect<Params, Response> &
  ExtEffectMethods<Params, Response>

type EffectWithProgress<Params, Response> = ApiEffect<Params, Response> &
  EffectProgressSettings<Params, Response>

type CreateApiEffectProps<P> = {
  propsGetter: RequestPropsGetter<P>
  requestDataGetter: RequestDataGetter
  requestHandler: RequestHandler
}

export const createApiEffect = <R = any, P = void>(
  props: CreateApiEffectProps<P>
) => {
  const { propsGetter, requestHandler, requestDataGetter } = props
  const effect = createEffect((params: P) => {
    const requestProps = propsGetter(params)
    return requestHandler<R, P>(requestProps)
  }) as ApiEffect<P, R>

  const addProgress = (original: ApiEffect<P, R>) => {
    const effectWithProgress = original as any as EffectWithProgress<P, R>
    const xhr = createXhr()
    effectWithProgress.use((params: P) => {
      const requestProps = propsGetter(params)
      return requestHandler<R, P>(requestProps, xhr.request)
    })
    effectWithProgress.progress = xhr.progress
    effectWithProgress.copy = () => addProgress(createApiEffect(props))
    return effectWithProgress
  }

  const modifyEffectHandler = <MR = R>(updates: Partial<DoRequestProps<P>>) => {
    return (params: P) => {
      const requestProps = propsGetter(params)
      return requestHandler<MR, P>({ ...requestProps, ...updates })
    }
  }

  const createModifiedCopy = (updates: Partial<DoRequestProps<P>>) => {
    const effectCopy = createApiEffect(props)
    effectCopy.use(modifyEffectHandler(updates))
    return effectCopy
  }

  effect.withProgress = () => addProgress(effect)
  effect.raw = <T>(mapper?: (response: Response) => T) => {
    const rawHandler = modifyEffectHandler<Response>({ rawResponse: true })
    if (!mapper) {
      const effectRaw = effect as unknown as ApiEffect<P, Response>
      return effectRaw.use(rawHandler)
    }
    const effectRaw = effect as unknown as ApiEffect<P, T>
    return effectRaw.use((params: P) => rawHandler(params).then(mapper))
  }
  effect.requestData = async (params) => {
    const requestProps = propsGetter(params)
    const data = await requestDataGetter(requestProps)
    return { data, url: requestProps.url }
  }
  effect.requestProps = (params) => propsGetter(params)
  effect.url = (params) => propsGetter(params).url
  effect.protect = () => createModifiedCopy({ withToken: true })
  effect.unprotect = () => createModifiedCopy({ withToken: false })

  return effect
}
