import { Effect, Event } from 'effector'
import { CreateApiEffectProps, MapperFn, Method, RequestProps } from './types'
import { createApiEffect } from './effect'
import { ApiContext } from './types.modules'
import { Endpoint } from './Endpoint'

export type CreateApiEndpointSettings = {
  withToken?: boolean
}

type ApiEndpointProps = ApiContext & CreateApiEndpointSettings

export type SpecificRequestProps<Params> =
  | Omit<CreateApiEffectProps<Params>, 'method'>
  | MapperFn<Params>
  | string
  | number

function prepareRequestProps<Params = void>(
  method: Method,
  props?: SpecificRequestProps<Params>,
): CreateApiEffectProps<Params> {
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

  private context(endpoint?: Endpoint): ApiContext {
    return {
      endpoint: endpoint || this._endpoint,
      requestHandler: this.requestHandler,
      requestDataGetter: this.requestDataGetter,
    }
  }

  public endpoint(endpoint: string, settings?: CreateApiEndpointSettings) {
    const newEndpoint = this._endpoint.createEndpoint(endpoint)
    if (settings?.withToken !== undefined) {
      newEndpoint.setProtection(settings.withToken)
    }
    return new ApiEndpoint(this.context(newEndpoint))
  }

  public request<R = any, P = void>(props: CreateApiEffectProps<P>) {
    return createApiEffect<R, P>(props, this.context())
  }

  public method<Response = any, Params = void>(
    method: Method,
    props?: SpecificRequestProps<Params>,
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
