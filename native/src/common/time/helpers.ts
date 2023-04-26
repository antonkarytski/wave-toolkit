export function parseTime(time: string, type: string) {
  const parseResult = time.match(/(\d+):\d{2}/)
  const hour = parseResult ? parseResult[1] : 1
  const normalizedHour = type === 'am' ? Number(hour) : Number(hour) + 12
  return normalizedHour === 24 ? 0 : normalizedHour
}

export function toSeconds(value: number) {
  return value / 1000
}

export function toMinutes(value: number) {
  return value / 60 / 1000
}

export function toHours(value: number) {
  return value / 60 / 60 / 1000
}

export function seconds(value: number) {
  return value * 1000
}

export function minutes(value: number) {
  return value * 60 * 1000
}

export function hours(value: number) {
  return value * 60 * 60 * 1000
}

export function days(value: number) {
  return value * 24 * 60 * 60 * 1000
}

export function lifeTimePassed(timerStartAt: string | number) {
  if (typeof timerStartAt === 'string')
    return Date.now() - Date.parse(timerStartAt)
  return Date.now().valueOf() - timerStartAt
}

export function lifeTimeLeft(
  lifeTime: number,
  timerStartAt: string | number
): number {
  return lifeTime - lifeTimePassed(timerStartAt)
}

export function isTimeLeft(
  lifeTime: number,
  timerStartAt: string | number
): boolean {
  return lifeTimeLeft(lifeTime, timerStartAt) > 0
}
