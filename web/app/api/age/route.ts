import { cookies } from 'next/headers'
import { AGE_COOKIE, AGE_COOKIE_MAX_AGE, ageCookieValue, ageResult, readAgeCookie } from '@/lib/age.ts'
import { BadRequest, respond } from '../respond.ts'

// The age screen. A result already recorded in this browser stands, so changing the date does not get past it.
export async function POST(req: Request) {
  return respond(async () => {
    const jar = await cookies()
    const recorded = readAgeCookie(jar.get(AGE_COOKIE)?.value)
    if (recorded) return { result: recorded }
    const { year, month, day } = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const result = ageResult({ year: Number(year), month: Number(month), day: Number(day) })
    if (!result) throw new BadRequest('Enter a real date.')
    jar.set(AGE_COOKIE, ageCookieValue(result), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: AGE_COOKIE_MAX_AGE,
    })
    return { result }
  })
}
