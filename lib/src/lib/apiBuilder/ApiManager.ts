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
import { createApiEffect } from './effect'
import { ApiContext } from './types.modules'

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
  public static singleRequest<Response = any, Params = void>(
    props: CreateRequestProps<Params>,
  ) {
    const rawApiManager = new ApiManager()
    return rawApiManager.request<Response, Params>(props)
  }

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

  private getContext(endpoint: Endpoint): ApiContext {
    return {
      endpoint,
      requestDataGetter: this.prepareData.bind(this),
      requestHandler: this.doRequest.bind(this),
    }
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
    const endpoint = new Endpoint(this.server, '')
    if (props.withToken) endpoint.protect()
    return createApiEffect<Response, Params>(props, this.getContext(endpoint))
  }

  public endpoint(endpoint: string, settings?: CreateApiEndpointSettings) {
    const endpointEntity = new Endpoint(this.server, endpoint)
    if (settings?.withToken) endpointEntity.protect()
    return new ApiEndpoint(this.getContext(endpointEntity))
  }

  public debug(settings: DebugSettings = {}) {
    this.debugger.on(settings)
    return this
  }
}
