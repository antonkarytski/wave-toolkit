import { Effect, Event, createEffect } from 'effector'
import { createXhr } from '../request/xhr'
import { CreateApiEffectProps, RequestProps } from './types'
import { ApiContext } from './types.modules'

export type RawCreator<Params> = {
  <T>(mapper: (response: Response) => T): Effect<Params, T>
  (): Effect<Params, Response>
}

export type ApiEffectFields<Params, R> = {
  withProgress: () => ApiProgressEffect<Params, R>
  raw: RawCreator<Params>
  url: (params: Params) => string
  requestProps: (params: Params) => RequestProps<Params>
  requestData: (params: Params) => Promise<{ data: RequestInit; url: string }>
  unprotect: () => ApiEffect<Params, R>
  protect: () => ApiEffect<Params, R>
}
export type ApiProgressEffectFields<Params, Response> = {
  progress: Event<ProgressEvent>
  copy: () => ApiProgressEffect<Params, Response>
}

export type ApiEffect<Params, Response> = Effect<Params, Response> &
  ApiEffectFields<Params, Response>
export type ApiProgressEffect<Params, Response> = ApiEffect<Params, Response> &
  ApiProgressEffectFields<Params, Response>

export const createApiEffect = <R = any, P = void>(
  props: CreateApiEffectProps<P>,
  context: ApiContext,
) => {
  const propsGetter = context.endpoint.method(props, props.fn)
  const effect = createEffect((params: P) => {
    const requestProps = propsGetter(params)
    return context.requestHandler<R, P>(requestProps)
  }) as ApiEffect<P, R>

  const addProgress = (original: ApiEffect<P, R>) => {
    const effectWithProgress = original as any as ApiProgressEffect<P, R>
    const xhr = createXhr()
    effectWithProgress.use((params: P) => {
      const requestProps = propsGetter(params)
      return context.requestHandler<R, P>(requestProps, xhr.request)
    })
    effectWithProgress.progress = xhr.progress
    effectWithProgress.copy = () =>
      addProgress(createApiEffect<R, P>(props, context))
    return effectWithProgress
  }

  const modify = <MR = R>(updates: Partial<CreateApiEffectProps<P>>) => {
    return (params: P) => {
      const requestProps = propsGetter(params)
      return context.requestHandler<MR, P>({ ...requestProps, ...updates })
    }
  }

  const createCopy = (updates: Partial<CreateApiEffectProps<P>>) => {
    return createApiEffect<R, P>({ ...props, ...updates }, context)
  }

  effect.withProgress = () => addProgress(effect)
  effect.raw = <T>(mapper?: (response: Response) => T) => {
    const rawHandler = modify<Response>({ rawResponse: true })
    if (!mapper) {
      const effectRaw = effect as unknown as ApiEffect<P, Response>
      return effectRaw.use(rawHandler)
    }
    const effectRaw = effect as unknown as ApiEffect<P, T>
    return effectRaw.use((params: P) => rawHandler(params).then(mapper))
  }
  effect.requestData = async params => {
    const requestProps = propsGetter(params)
    const data = await context.requestDataGetter(requestProps)
    return { data, url: requestProps.url }
  }
  effect.requestProps = params => propsGetter(params)
  effect.url = params => propsGetter(params).url
  effect.protect = () => createCopy({ withToken: true })
  effect.unprotect = () => createCopy({ withToken: false })

  return effect
}
