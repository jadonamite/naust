import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from './env.ts'

// Neutral age screen at sign-up. Only the result is kept: over or under the cutoff, never the birth date.
export const MIN_AGE = 13
export const AGE_COOKIE = 'naust_age'
export const AGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type AgeResult = 'over' | 'under'

export function ageResult(birth: { year: number; month: number; day: number }, today = new Date()): AgeResult | null {
  const { year, month, day } = birth
  const date = new Date(Date.UTC(year, month - 1, day))
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  if (!valid || date > today || year < today.getUTCFullYear() - 130) return null
  let age = today.getUTCFullYear() - year
  if (today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day)) age--
  return age >= MIN_AGE ? 'over' : 'under'
}

// The cookie is signed so a passed check cannot be typed in by hand. An 'under' result is kept the same way.
const sign = (result: AgeResult) => createHmac('sha256', env.authSecret).update(`age:${result}`).digest('base64url')

export const ageCookieValue = (result: AgeResult) => `${result}.${sign(result)}`

export function readAgeCookie(value: string | undefined): AgeResult | null {
  if (!value) return null
  const [result, mac] = value.split('.')
  if (result !== 'over' && result !== 'under') return null
  const expected = Buffer.from(sign(result))
  const given = Buffer.from(mac ?? '')
  return given.length === expected.length && timingSafeEqual(given, expected) ? result : null
}

export function ageFromCookieHeader(header: string | null | undefined): AgeResult | null {
  const match = header?.match(new RegExp(`(?:^|;\\s*)${AGE_COOKIE}=([^;]+)`))
  return readAgeCookie(match ? decodeURIComponent(match[1]) : undefined)
}
