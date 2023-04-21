import { Event, createEvent } from 'effector'

type XHREventListeners = {
  progress: Event<ProgressEvent>
}

class ResponseHeaders {
  request
  constructor(request: XMLHttpRequest) {
    this.request = request
  }
  get(name: string) {
    return this.request.getResponseHeader(name)
  }
  has(name: string): boolean {
    return this.request.getResponseHeader(name) !== null
  }
  forEach() {}
  set(name: string, value: string) {
    this.request.setRequestHeader(name, value)
  }
  delete(name: string) {
    this.request.setRequestHeader(name, '')
  }
  append(name: string, value: string) {
    this.request.setRequestHeader(name, value)
  }
}

export function xhr(
  info: RequestInfo | URL,
  settings?: RequestInit,
  eventListeners?: XHREventListeners
): Promise<Response> {
  const request = new XMLHttpRequest()
  request.open(
    settings?.method ?? 'GET',
    typeof info === 'string' ? info : info.toString()
  )
  request.setRequestHeader(
    'Accept',
    'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
  )
  if (settings?.headers) {
    Object.entries(settings.headers).forEach(([key, value]) => {
      request.setRequestHeader(key, value as string)
    })
  }
  if (eventListeners) {
    request.upload.onprogress = eventListeners.progress
  }
  const headers = new ResponseHeaders(request)
  const response = new Promise<Response>((resolve, reject) => {
    request.onerror = () => reject(request.response)
    request.onreadystatechange = () => {
      if (request.readyState !== 4) return
      if (!request.response) {
        reject({ error: { code: 1, message: 'no answer' } })
        return
      }
      if (request.response.error) {
        reject(request.response.error)
        return
      }
      resolve({
        ok: request.status >= 200 && request.status < 300,
        status: request.status,
        url: request.responseURL,
        type: request.responseType as ResponseType,
        headers,
        redirected: false,
        bodyUsed: settings?.body !== undefined,
        statusText: request.statusText,
        body: request.response,
        json(): Promise<any> {
          return Promise.resolve(request.response)
        },
        text(): Promise<string> {
          return Promise.resolve(request.response)
        },
        arrayBuffer(): Promise<ArrayBuffer> {
          return Promise.resolve(request.response)
        },
        blob(): Promise<Blob> {
          return Promise.resolve(request.response)
        },
        formData(): Promise<FormData> {
          return Promise.resolve(request.response)
        },
        clone(): Response {
          return {} as any
        },
      })
    }
  })

  request.send(settings?.body)

  return response
}

export function createXhr() {
  const progress = createEvent<ProgressEvent>()
  return {
    progress,
    request: (info: RequestInfo | URL, settings?: RequestInit) =>
      xhr(info, settings, { progress }),
  }
}
