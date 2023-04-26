import { createEffect } from 'effector'
import { ServerManager } from '../serverManager/ServerManager'
import { ApiDebug, DebugSettings } from './ApiDebug'
import { ApiEndpoint, CreateApiEndpointSettings } from './ApiEndpoint'
import { Endpoint } from './Endpoint'
import { TokenManager } from './TokenManager'
import { ApiError } from './errors'
import { prepareRequestData } from './helpers'
import {
  ContentType,
  CreateRequestProps,
  DoRequestProps,
  RequestFnProps,
} from './types'
import { TokenRefresher, TokenSettings } from './types.token'

export type RequestModelProps = {
  server?: ServerManager
  tokenRefresher?: TokenRefresher
  tokenSettings?: TokenSettings
  requestRepeatFilter?: RequestRepeatFilter
}
export type RequestRepeatFilter = <T>(
  props: DoRequestProps<T>,
  response: Response,
  context: ApiManager,
) => Promise<DoRequestProps<T> | undefined | null>

export class ApiManager {
  public readonly token
  public readonly debugger = new ApiDebug()
  private readonly server: ServerManager | null = null
  private readonly requestRepeatFilter: RequestRepeatFilter | null = null

  constructor({
    server,
    tokenRefresher,
    tokenSettings,
  }: RequestModelProps = {}) {
    if (server) this.server = server
    this.token = new TokenManager(tokenRefresher, tokenSettings)
  }

  private async retrieveToken(props: RequestFnProps<any>) {
    if (!props.withToken) return null
    if (props.token) return props.token
    const token = await this.token.get()
    if (!token) throw ApiError.needLogin()
    return token.access
  }

  private async prepareData(props: DoRequestProps<any>): Promise<RequestInit> {
    const token = await this.retrieveToken(props)
    const requestProps = { ...props, token }
    this.debugger.props(requestProps)
    return prepareRequestData(requestProps)
  }

  private async doRequest<R, Params>(
    props: DoRequestProps<Params>,
    driver = fetch,
  ): Promise<R> {
    const requestData = await this.prepareData(props)
    const response = await driver(props.url, requestData)
    const contentType = response.headers.get('content-type')
    const isJsonAvailable = contentType === ContentType.JSON
    this.debugger.response(response)
    if (props.rawResponse) return response as R
    if (response.ok) {
      if (!isJsonAvailable) {
        return null as R
      }
      return (await response.json()) as R
    }
    if (this.requestRepeatFilter) {
      const newProps = await this.requestRepeatFilter(props, response, this)
      if (newProps) return this.doRequest(newProps, driver)
    }
    if (!isJsonAvailable) throw ApiError.unknown(response)
    throw await ApiError.fromResponse(response)
  }

  public request<Response = any, Params = void>(
    props: CreateRequestProps<Params>,
  ) {
    const endpoint = new Endpoint(this.server, props.endpoint)
    if (props.withToken) endpoint.protect()
    const propsGetter = endpoint.method(props.method, props.fn)
    return createEffect((params: Params) => {
      const requestProps = propsGetter(params)
      return this.doRequest<Response, Params>(requestProps)
    })
  }

  public endpoint(endpoint: string, settings?: CreateApiEndpointSettings) {
    const endpointEntity = new Endpoint(this.server, endpoint)
    if (settings?.withToken) endpointEntity.protect()
    return new ApiEndpoint({
      endpoint: endpointEntity,
      requestHandler: this.doRequest.bind(this),
      requestDataGetter: this.prepareData.bind(this),
    })
  }

  public debug(settings: DebugSettings = {}) {
    this.debugger.on(settings)
    return this
  }
}
