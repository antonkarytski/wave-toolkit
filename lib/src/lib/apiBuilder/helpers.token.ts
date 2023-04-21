import { TokenStatus } from './types.token'

type GetTokenStatusProps = {
  token: string | null
  startTime: number
  refreshTime: number
  lifeTime: number
}

export function getTokenStatus({
  token,
  startTime,
  lifeTime,
  refreshTime,
}: GetTokenStatusProps): TokenStatus {
  if (!token || !startTime) return TokenStatus.NONE
  const tokenExistTime = Date.now() - startTime
  if (tokenExistTime < lifeTime) {
    return TokenStatus.FRESH
  }
  if (tokenExistTime < refreshTime) {
    return TokenStatus.EXPIRED
  }
  return TokenStatus.REFRESH_EXPIRED
}
