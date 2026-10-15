import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AccountPage } from '@/components/account/AccountPage'
import { SignInFlow } from '@/components/account/SignInFlow'
import { AGE_COOKIE, readAgeCookie } from '@/lib/age.ts'
import { safeNext } from '@/lib/next-path.ts'
import { currentUser } from '@/lib/session.ts'

export const metadata: Metadata = { title: 'Create an account · Naust', robots: { index: false } }

export default async function SignUpPage({ searchParams }: PageProps<'/sign-up'>) {
  const next = safeNext((await searchParams).next, '/app')
  if (await currentUser()) redirect(next)
  const age = readAgeCookie((await cookies()).get(AGE_COOKIE)?.value)
  return (
    <AccountPage
      foot={
        <>
          Already have an account? <Link href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign in</Link>
        </>
      }
    >
      <SignInFlow
        mode="sign-up"
        age={age}
        next={next}
        title="Create your account"
        lead="We’ll email you a code to confirm it’s you. There’s no password."
      />
    </AccountPage>
  )
}
