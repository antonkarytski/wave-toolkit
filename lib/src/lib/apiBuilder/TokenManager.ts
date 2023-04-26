import { attach, createEffect, createEvent, restore } from 'effector'
import { getTokenStatus } from './helpers.token'
import {
  TokenRefresher,
  TokenSettings,
  TokenStatus,
  Tokens,
} from './types.token'
import { days, minutes } from '../../common/time/helpers'
import { addStorePersist } from '../models/model.db'

const TOKEN_SAVE_DEFAULT_KEY = '@token_info'
type TokenModel = Tokens & {
  startTime: number
}
type TokenListener = (tokens: TokenModel | null) => void

export class TokenManager {
  private readonly refresher: TokenRefresher
  private readonly persist
  private readonly accessLifeTime
  private readonly refreshLifeTime

  private _onInit: TokenListener | null = null
  private _onInitResolve: TokenListener | null = null

  public readonly reset = createEvent()
  public readonly setSaved = createEvent<TokenModel>()
  public readonly set = createEvent<Tokens>()
  public readonly $store = restore(this.setSaved, null)
    .on(this.set, (_, tokens) => ({ ...tokens, startTime: Date.now() }))
    .reset(this.reset)

  constructor(
    refresher: TokenRefresher = () => Promise.resolve(null),
    {
      accessLifeTime = minutes(30),
      refreshLifeTime = days(30),
      dbField = TOKEN_SAVE_DEFAULT_KEY,
    }: TokenSettings = {}
  ) {
    this.refresher = refresher
    this.accessLifeTime = accessLifeTime
    this.refreshLifeTime = refreshLifeTime

    this.persist = addStorePersist({
      $store: this.$store,
      saveTo: dbField,
    })
    this.persist.onInit((result) => {
      if (result) this.setSaved(result)
      const initProps = result ?? this.$store.getState() ?? null
      this._onInitResolve?.(initProps)
      this._onInit?.(initProps)
      this._onInit = null
      this._onInitResolve = null
    })
  }

  public readonly get = attach({
    source: this.$store,
    mapParams: (_: void, token) => token,
    effect: createEffect(
      async (token: TokenModel | null): Promise<Tokens | null | undefined> => {
        if (!token) return null
        const status = getTokenStatus({
          token: token.access,
          startTime: token.startTime,
          lifeTime: this.accessLifeTime,
          refreshTime: this.refreshLifeTime,
        })
        if (status === TokenStatus.FRESH) return token
        if (status === TokenStatus.EXPIRED) return this.refresh()
        if (status === TokenStatus.REFRESH_EXPIRED) {
          this.reset()
          return null
        }
        if (status === TokenStatus.NONE) return null
      }
    ),
  })

  public readonly refresh = attach({
    source: this.$store,
    mapParams: (_: void, source) => source,
    effect: createEffect(async (tokens: Tokens | null) => {
      if (!tokens) return null
      const token = await this.refresher(tokens)
      if (!token) return null
      this.set(token)
      return token
    }),
  })

  public onInit(fn?: TokenListener) {
    if (this.persist.isInitiated) {
      const state = this.$store.getState() ?? null
      if (fn) fn(state)
      return {
        promise: Promise.resolve(this.$store.getState() ?? null),
      }
    }
    this._onInit = fn ?? null
    return {
      promise: new Promise<TokenModel | null>((resolve) => {
        this._onInitResolve = resolve
      }),
    }
  }
}
