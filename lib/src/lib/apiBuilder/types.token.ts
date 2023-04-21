export type Tokens = {
  access: string
  refresh: string
}
export type TokensProps = Tokens & {
  type?: TokenType
}
export type TokenRefresher = (props: TokensProps) => Promise<Tokens | null>
export type TokenSettings = {
  accessLifeTime?: number
  refreshLifeTime?: number
  dbField?: string
}
export type TokenType = 'Bearer' | 'JWT'

export enum TokenStatus {
  NONE = 0,
  FRESH = 1,
  EXPIRED = 2,
  REFRESH_EXPIRED = 3,
}
