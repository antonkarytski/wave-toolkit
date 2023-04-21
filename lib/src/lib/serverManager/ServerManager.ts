import { AsyncDbRequest } from '../asyncDbManager/AsyncDbRequest'
import { noop } from '../../common/helpers'
import { removeLastSlash, removeSlashes } from '../../common/string/helpers'

type ServerManagerProps = {
  initialRoot: string
  apiGenerator: (root: string) => string
  saveTo?: string
}

export class ServerManager {
  private _domain = ''
  private _server = ''
  private _api = `${this._server}/backend/api`
  private readonly apiGenerator = (value: string) => value
  private readonly dbManager: AsyncDbRequest | null = null

  private isInitiated: boolean | undefined = undefined
  private initPromise: Promise<string | undefined> | null = null

  public get domain() {
    return this._domain
  }

  public get url() {
    return this._server
  }

  public get api() {
    return this._api
  }

  private readonly initFromDb = async () => {
    if (!this.dbManager) {
      this.isInitiated = true
      return this._domain
    }
    if (this.initPromise) return this.initPromise
    this.initPromise = this.dbManager.get()

    this.initPromise
      .then((domain) => {
        if (domain) {
          this.isInitiated = true
          return this.changeDomain(domain)
        }
        this.isInitiated = false
      })
      .catch(() => {
        this.isInitiated = false
      })
      .finally(() => {
        this.initPromise = null
      })
    return this.initPromise
  }

  constructor({ apiGenerator, initialRoot, saveTo }: ServerManagerProps) {
    this._domain = removeSlashes(initialRoot)
    this._server = `https://${this._domain}`
    this.apiGenerator = apiGenerator
    this._api = removeLastSlash(apiGenerator(initialRoot))
    if (saveTo) this.dbManager = new AsyncDbRequest(saveTo)
    this.initFromDb().catch(noop)
  }

  private changeDomain(value: string) {
    this._domain = removeSlashes(value)
    this._server = `https://${this._domain}`
    this._api = removeLastSlash(this.apiGenerator(value))
  }

  public init = async () => {
    if (this.isInitiated === false) return
    if (this.isInitiated === true) return this._domain
    return this.initFromDb()
  }

  public setDomain = async (domain: string) => {
    this.changeDomain(domain)
    if (this.dbManager) return this.dbManager.set(this._domain)
  }
}
