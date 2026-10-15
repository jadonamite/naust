import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { emailOTP } from 'better-auth/plugins'
import { Pool } from 'pg'
import { env } from './env.ts'
import { sendEmail } from './email.ts'
import { ageFromCookieHeader } from './age.ts'
import { db } from './db.ts'

// Accounts for operators and customers. Sign-in is a 6-digit code sent by email; nobody has a password.
// Tables are created by the app's own migrations (lib/db.ts), so a self-hosted copy needs no extra step.
export const AGE_CHECK_REQUIRED = 'AGE_CHECK_REQUIRED'

const build = () => betterAuth({
  appName: 'Naust',
  baseURL: env.siteUrl,
  get secret() {
    return env.authSecret
  },
  database: new Pool({ connectionString: env.databaseUrl, max: 3 }),
  user: {
    modelName: 'auth_user',
    additionalFields: {
      // 'over' once the age screen is passed. The birth date itself is never stored.
      ageCheck: { type: 'string', required: false, input: false },
    },
  },
  session: { modelName: 'auth_session' },
  account: { modelName: 'auth_account' },
  verification: { modelName: 'auth_verification' },
  rateLimit: { enabled: true, storage: 'database', modelName: 'auth_rate_limit' },
  advanced: { cookiePrefix: 'naust' },
  databaseHooks: {
    user: {
      create: {
        // A new account needs a passed age screen in this browser. Existing accounts sign in without it.
        before: async (user, ctx) => {
          if (ageFromCookieHeader(ctx?.headers?.get('cookie')) !== 'over') {
            throw new APIError('FORBIDDEN', { message: 'Confirm your date of birth first.', code: AGE_CHECK_REQUIRED })
          }
          return { data: { ...user, ageCheck: 'over' } }
        },
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      // Each code allows 3 wrong tries; this per-address limit covers a typo plus the age step for a new account.
      rateLimit: { window: 60, max: 10 },
      async sendVerificationOTP({ email, otp }) {
        await sendEmail({
          to: email,
          subject: `${otp} is your Naust sign-in code`,
          text: `Your Naust sign-in code is ${otp}.\n\nIt works for 10 minutes. If you didn't ask for it, you can ignore this email.`,
        })
      },
    }),
    nextCookies(),
  ],
})

export type Auth = ReturnType<typeof build>

// Built after the app's migrations have run: Better Auth checks its tables when it starts and keeps a failed check.
let instance: Promise<Auth> | undefined
export function getAuth(): Promise<Auth> {
  instance ??= db().then(build, (e) => ((instance = undefined), Promise.reject(e)))
  return instance
}
