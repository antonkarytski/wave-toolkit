import { Effect, Event, createEffect } from 'effector'
import { createXhr } from '../request/xhr'
import { Endpoint, MethodSettings } from './Endpoint'
import {
  MapperFn,
  Method,
  RequestDataGetter,
  RequestHandler,
  RequestProps,
} from './types'

type CreateApiEndpointRequest<Params> = {
  fn?: MapperFn<Params>
  rawResponse?: boolean
} & MethodSettings

export type CreateApiEndpointSettings = {
  withToken?: boolean
}

type ApiEndpointProps = {
  endpoint: Endpoint
  requestHandler: RequestHandler
  requestDataGetter: RequestDataGetter
} & CreateApiEndpointSettings

export type SpecificRequestProps<Params> =
  | Omit<CreateApiEndpointRequest<Params>, 'method'>
  | MapperFn<Params>
  | string
  | number

function prepareRequestProps<Params = void>(
  method: Method,
  props?: SpecificRequestProps<Params>
): CreateApiEndpointRequest<Params> {
  if (!props) return { method }
  if (typeof props === 'function') return { fn: props, method }
  if (typeof props === 'string' || typeof props === 'number') {
    return { endpoint: props, method }
  }
  return { ...props, method }
}

export class ApiEndpoint {
  private readonly _endpoint
  private readonly requestHandler
  private readonly requestDataGetter

  constructor(props: ApiEndpointProps) {
    this.requestHandler = props.requestHandler
    this._endpoint = props.endpoint
    this.requestDataGetter = props.requestDataGetter
  }

  public protect() {
    this._endpoint.protect()
    return this
  }

  public unprotect() {
    this._endpoint.unprotect()
    return this
  }

  public endpoint(endpoint: string, settings?: CreateApiEndpointSettings) {
    const newEndpoint = this._endpoint.createEndpoint(endpoint)
    if (settings?.withToken !== undefined) {
      newEndpoint.setProtection(settings.withToken)
    }
    return new ApiEndpoint({
      endpoint: newEndpoint,
      requestHandler: this.requestHandler,
      requestDataGetter: this.requestDataGetter,
    })
  }

  public request<R = any, P = void>(props: CreateApiEndpointRequest<P>) {
    const propsGetter = this._endpoint.method(props, props.fn)
    const effect = createEffect((params: P) => {
      const requestProps = propsGetter(params)
      return this.requestHandler<R, P>(requestProps)
    }) as Effect<P, R> & ExtEffectMethods<P, R>

    const copyWithProgress = () => {
      const xhr = createXhr()
      const effectCopy = createEffect((params: P) => {
        const requestProps = propsGetter(params)
        return this.requestHandler<R, P>(requestProps, xhr.request)
      }) as EffectWithProgress<P, R>
      effectCopy.progress = xhr.progress
      effectCopy.copy = copyWithProgress
      return effectCopy
    }

    effect.withProgress = () => {
      const effectWithProgress = effect as EffectWithProgress<P, R>
      const xhr = createXhr()
      effectWithProgress.use((params: P) => {
        const requestProps = propsGetter(params)
        return this.requestHandler<R, P>(requestProps, xhr.request)
      })
      effectWithProgress.progress = xhr.progress
      effectWithProgress.copy = copyWithProgress
      return effectWithProgress
    }

    effect.raw = <T>(mapper?: (response: Response) => T) => {
      const propsGetterWithRaw = this._endpoint.method(
        { ...props, rawResponse: true },
        props.fn
      )
      if (mapper) {
        const effectRaw = effect as unknown as Effect<P, T>
        return effectRaw.use((params: P) => {
          const requestProps = propsGetterWithRaw(params)
          const result = this.requestHandler<Response, P>(requestProps)
          return result.then(mapper)
        })
      }
      const effectRaw = effect as unknown as Effect<P, Response>
      return effectRaw.use((params: P) => {
        const requestProps = propsGetterWithRaw(params)
        return this.requestHandler<Response, P>(requestProps)
      })
    }

    effect.requestData = (params) => {
      const requestProps = propsGetter(params)
      return this.requestDataGetter(requestProps).then((data) => ({
        data,
        url: requestProps.url,
      }))
    }
    effect.requestProps = (params) => propsGetter(params)
    effect.url = (params) => propsGetter(params).url
    effect.protect = () => this.request({ ...props, withToken: true })
    effect.unprotect = () => this.request({ ...props, withToken: false })

    return effect
  }

  public method<Response = any, Params = void>(
    method: Method,
    props?: SpecificRequestProps<Params>
  ) {
    const requestProps = prepareRequestProps(method, props)
    return this.request<Response, Params>(requestProps)
  }

  private specificMethodGetter(method: Method) {
    return <R = any, Params = void>(props?: SpecificRequestProps<Params>) => {
      return this.method<R, Params>(method, props)
    }
  }

  public readonly get = this.specificMethodGetter('GET')
  public readonly post = this.specificMethodGetter('POST')
  public readonly put = this.specificMethodGetter('PUT')
  public readonly delete = this.specificMethodGetter('DELETE')
  public readonly patch = this.specificMethodGetter('PATCH')
}

type EffectProgressSettings<Params, Response> = {
  progress: Event<ProgressEvent>
  copy: () => Effect<Params, Response> &
    EffectProgressSettings<Params, Response> &
    ExtEffectMethods<Params, Response>
}

type RawCreator<Params> = {
  <T>(mapper: (response: Response) => T): Effect<Params, T>
  (): Effect<Params, Response>
}

type ExtEffectMethods<Params, R> = {
  withProgress: () => Effect<Params, R> & EffectProgressSettings<Params, R>
  raw: RawCreator<Params>
  url: (params: Params) => string
  requestProps: (params: Params) => RequestProps<Params>
  requestData: (params: Params) => Promise<{ data: RequestInit; url: string }>
  unprotect: () => Effect<Params, R> & ExtEffectMethods<Params, R>
  protect: () => Effect<Params, R> & ExtEffectMethods<Params, R>
}

type EffectWithProgress<Params, Response> = Effect<Params, Response> &
  EffectProgressSettings<Params, Response> &
  ExtEffectMethods<Params, Response>
