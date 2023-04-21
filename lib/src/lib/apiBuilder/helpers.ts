import { ApiError } from './errors'
import { ContentType, RequestFnProps } from './types'
import { removeSlashes } from '../../common/string/helpers'

const arrayParamsToString = (body: object) => {
  const notEmptyArray = (arr: (string | number)[]) =>
    Array.isArray(arr) && !!arr.length

  return Object.entries(body)
    .filter(([, value]) => notEmptyArray(value))
    .map(([key, value]) => {
      return value.map((i: string | number) => `${key}=${i}`).join('&')
    })
    .join('&')
}

export function bodyToParams(body: object) {
  const isAvailableValue = (value: any) =>
    value !== undefined &&
    value !== '' &&
    value !== null &&
    !Array.isArray(value)

  const stringifiedArrayParams = arrayParamsToString(body)

  let result = Object.entries(body)
    .filter(([, value]) => isAvailableValue(value))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  if (stringifiedArrayParams.length) {
    result += `&${stringifiedArrayParams}`
  }
  return result
}

export function getUrlEnd(
  value: number | string | undefined,
  entityId?: number | string
) {
  let result: string = ''
  if (typeof value === 'string') result = `/${removeSlashes(value)}`
  if (typeof value === 'number') result = `/${value}`
  if (entityId) result += `/${entityId}`
  return result
}

export function prepareRequestData<Body>({
  withToken,
  tokenType = 'Bearer',
  token,
  body,
  method,
  contentType = ContentType.JSON,
}: RequestFnProps<Body>) {
  const headers: HeadersInit = {
    'Content-Type': contentType,
  }
  if (withToken) headers.Authorization = `${tokenType} ${token}`
  const data: RequestInit = { method, headers }
  if (body) {
    if (contentType === ContentType.JSON) {
      data.body = JSON.stringify(body)
    }
    if (isContentTypeFormData(contentType)) {
      data.body = body as any as FormData
    }
  }
  return data
}

export async function doRequest<Body>(props: RequestFnProps<Body>) {
  if (props.withToken && !props.token) {
    throw ApiError.noTokenProvided()
  }
  return fetch(props.url, prepareRequestData(props))
}

export async function request<Response, Body = any>(
  props: RequestFnProps<Body>
) {
  const response = await doRequest(props)
  const contentType = response.headers.get('content-type')
  const isJsonAvailable = contentType === 'application/json'
  if (response.ok) {
    if (!isJsonAvailable) return null as Response
    return (await response.json()) as Response
  }
  throw await ApiError.fromResponse(response)
}

export function convertToFormData(list: Record<string, any>) {
  const formData = new FormData()
  Object.entries(list).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

export function isObjectNotFormData(body: any): body is FormData {
  return body && typeof body === 'object' && !(body instanceof FormData)
}

export function isContentTypeFormData(type?: string) {
  return type === ContentType.FORM_DATA || type === ContentType.FORM_ENCODED
}
