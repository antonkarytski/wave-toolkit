import { Endpoint } from './Endpoint'
import { RequestDataGetter, RequestHandler } from './types'

export type ApiContext = {
  endpoint: Endpoint
  requestHandler: RequestHandler
  requestDataGetter: RequestDataGetter
}
