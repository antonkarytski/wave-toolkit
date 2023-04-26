import {
  bodyToParams,
  convertToFormData,
  getUrlEnd,
  isContentTypeFormData,
  isObjectNotFormData,
} from './helpers'
import {
  MapperFn,
  Method,
  MethodSettings,
  RequestProps,
  RequestPropsGetter,
} from './types'
import { ServerManager } from '../serverManager/ServerManager'
import { removeSlashes } from '../../common/string/helpers'

type SpecificMethodSettings<T> = Omit<MethodSettings, 'method'> & {
  fn?: MapperFn<T>
}
type SpecificMethodProps<T> = MapperFn<T> | SpecificMethodSettings<T>

function isPrimitive(value: any): value is string | number | boolean | null {
  return value !== Object(value)
}

function checkForFormData<T>(data: T) {
  if (isObjectNotFormData(data)) return convertToFormData(data)
  return data
}

export class Endpoint {
  private readonly server: ServerManager | null = null
  private readonly _endpoint: string = ''
  private isProtected = false

  private get endpoint() {
    if (!this.server) return this._endpoint
    return this.server.api + this._endpoint
  }

  public constructor(server: ServerManager | null, endpoint: string)
  public constructor(server: ServerManager, endpoint?: string)
  public constructor(endpoint: string)
  public constructor(
    serverOrEndpoint: string | ServerManager | null,
    endpoint?: string,
  ) {
    if (typeof serverOrEndpoint === 'string') {
      this._endpoint = removeSlashes(serverOrEndpoint)
      console.log('ENDPOINT', this._endpoint)
      return
    }
    if (serverOrEndpoint) {
      this.server = serverOrEndpoint
      this._endpoint = endpoint ? `/${removeSlashes(endpoint)}` : ''
      return
    }
    this._endpoint = removeSlashes(endpoint || '')
    console.log('ENDPOINT!!', endpoint)
  }

  public setProtection(state: boolean) {
    this.isProtected = state
    return this
  }

  public unprotect() {
    return this.setProtection(false)
  }

  public protect() {
    return this.setProtection(true)
  }

  private createCommonRequestData(
    method: Method | MethodSettings,
  ): RequestProps {
    console.log('CREATE', method)
    if (typeof method === 'string') {
      return {
        withToken: this.isProtected,
        url: this.endpoint,
        method,
        rawResponse: false,
      }
    }
    const result: RequestProps = {
      method: method.method,
      withToken: method.withToken ?? this.isProtected,
      url: removeSlashes(`${this.endpoint}${getUrlEnd(method.endpoint)}`),
      rawResponse: method.rawResponse ?? false,
    }
    if (method.contentType) result.contentType = method.contentType
    return result
  }

  private methodWithBody<T>(
    method: Method | MethodSettings,
    fn?: MapperFn<T>,
  ): RequestPropsGetter<T> {
    const common = this.createCommonRequestData(method)
    return ((props: T) => {
      if (!fn) {
        if (props === undefined || props === null) return common
        if (isContentTypeFormData(common.contentType)) {
          return { ...common, body: checkForFormData(props) }
        }
        return { ...common, body: props }
      }
      const result = fn(props)
      if (props === undefined || props === null) return common
      if (isPrimitive(result)) {
        return { ...common, url: `${common.url}${getUrlEnd(result)}` }
      }
      const { body, url, entityId, ...rest } = result
      const urlEnd = getUrlEnd(url, entityId)
      const urlFull = `${common.url}${urlEnd}`
      const isFormData =
        isContentTypeFormData(rest.contentType) ||
        (!rest.contentType && isContentTypeFormData(common.contentType))
      if (isFormData) {
        const formData = checkForFormData(body)
        return { ...common, ...rest, body: formData, url: urlFull }
      }
      return { ...common, ...rest, body, url: urlFull }
    }) as RequestPropsGetter<T>
  }

  private methodWithParams<T>(
    method: Method | MethodSettings,
    fn?: MapperFn<T>,
  ): RequestPropsGetter<T> {
    const common = this.createCommonRequestData(method)
    console.log('COMMON', common)
    return ((props: T) => {
      if (!fn) {
        if (props === undefined || props === null) return common
        if (isPrimitive(props)) {
          return { ...common, url: `${common.url}/${props}` }
        }
        const params = bodyToParams(props)
        const url = params ? `${common.url}?${params}` : common.url
        return { ...common, url }
      }
      const result = fn(props)
      if (result === undefined || result === null) return common
      if (isPrimitive(result)) {
        return { ...common, url: `${common.url}${getUrlEnd(result)}` }
      }
      const { body, url, entityId, ...rest } = result
      const params = body ? bodyToParams(body) : ''
      const urlEnd = getUrlEnd(url, entityId)
      const urlParams = params ? `?${params}` : ''
      return {
        ...common,
        ...rest,
        url: `${common.url}${urlEnd}${urlParams}`,
      }
    }) as RequestPropsGetter<T>
  }

  public readonly method = <T>(
    method: Method | MethodSettings,
    fn?: MapperFn<T>,
  ): RequestPropsGetter<T> => {
    if (
      method === 'GET' ||
      (typeof method === 'object' && method.method === 'GET')
    ) {
      return this.methodWithParams(method, fn)
    }
    return this.methodWithBody(method, fn)
  }

  private specificMethod(method: Method) {
    return <T>(props?: SpecificMethodProps<T>): RequestPropsGetter<T> => {
      if (!props || typeof props === 'function') {
        return this.method(method, props)
      }
      const { fn, ...rest } = props
      return this.method({ method, ...rest }, fn)
    }
  }
  public readonly post = this.specificMethod('POST')
  public readonly get = this.specificMethod('GET')
  public readonly put = this.specificMethod('PUT')
  public readonly delete = this.specificMethod('DELETE')
  public readonly patch = this.specificMethod('PATCH')
  public createEndpoint(rawEndpoint: string) {
    const endpoint = removeSlashes(rawEndpoint)
    const endpointEntity = new Endpoint(
      this.server,
      `${this._endpoint}/${endpoint}`,
    )
    if (this.isProtected) endpointEntity.protect()
    return endpointEntity
  }
}
