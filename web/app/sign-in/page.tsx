import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AccountPage } from '@/components/account/AccountPage'
import { SignInFlow } from '@/components/account/SignInFlow'
import { AGE_COOKIE, readAgeCookie } from '@/lib/age.ts'
import { safeNext } from '@/lib/next-path.ts'
import { currentUser } from '@/lib/session.ts'

export const metadata: Metadata = { title: 'Sign in · Naust', robots: { index: false } }

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
  const next = safeNext((await searchParams).next, '/app')
  if (await currentUser()) redirect(next)
  const age = readAgeCookie((await cookies()).get(AGE_COOKIE)?.value)
  return (
    <AccountPage
      foot={
        <>
          New to Naust? <Link href={`/sign-up?next=${encodeURIComponent(next)}`}>Create an account</Link>
        </>
      }
    >
      <SignInFlow mode="sign-in" age={age} next={next} title="Sign in" lead="We’ll email you a code. There’s no password." />
    </AccountPage>
  )
}
