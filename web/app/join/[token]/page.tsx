import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { AccountPage } from '@/components/account/AccountPage'
import { AcceptInvite } from '@/components/account/AcceptInvite'
import { SignInFlow } from '@/components/account/SignInFlow'
import { AGE_COOKIE, readAgeCookie } from '@/lib/age.ts'
import { inviteInfo } from '@/lib/invites.ts'
import { currentUser } from '@/lib/session.ts'
import styles from '@/components/account/account.module.css'

export const metadata: Metadata = { title: 'Your deposits · Naust', robots: { index: false } }

// A customer's invite: sign in or create an account, then add this business's receipts to it.
export default async function JoinPage({ params }: PageProps<'/join/[token]'>) {
  const { token } = await params
  const invite = await inviteInfo(token)
  const user = await currentUser()

  if (invite.state !== 'valid') {
    const why = {
      used: 'This invite has already been used. If it was you, sign in to see your deposits.',
      expired: 'This invite has expired. Ask the business for a new one.',
      unknown: 'This invite link isn’t valid. Check you copied all of it.',
    }[invite.state]
    return (
      <AccountPage who={user?.email}>
        <h1 className={`serif ${styles.title}`}>Invite not available</h1>
        <p className={styles.lead}>{why}</p>
      </AccountPage>
    )
  }

  if (user) {
    return (
      <AccountPage who={user.email}>
        <h1 className={`serif ${styles.title}`}>Your deposits at {invite.businessName}</h1>
        <p className={styles.lead}>
          {invite.businessName} invited you to see your deposit address and a receipt for every deposit you make.
        </p>
        <AcceptInvite token={token} businessName={invite.businessName!} />
      </AccountPage>
    )
  }

  const age = readAgeCookie((await cookies()).get(AGE_COOKIE)?.value)
  return (
    <AccountPage>
      <SignInFlow
        mode="sign-in"
        age={age}
        next={`/join/${token}`}
        title={`Your deposits at ${invite.businessName}`}
        lead={`${invite.businessName} invited you to see your deposit address and your receipts. Enter your email and we’ll send you a code.`}
      />
    </AccountPage>
  )
}
