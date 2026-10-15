import { headers } from 'next/headers'
import { getAuth } from './accounts.ts'
import { membershipsOf, type Membership } from './businesses.ts'

// Who is signed in, for pages and route handlers. Every business or customer lookup starts here.
export class Unauthorized extends Error {}
export class Forbidden extends Error {}

export type SignedIn = { id: string; email: string; name: string }

export async function currentUser(): Promise<SignedIn | null> {
  // Headers first: that marks the page as per-request before anything touches the auth setup.
  const requestHeaders = await headers()
  const session = await (await getAuth()).api.getSession({ headers: requestHeaders })
  return session ? { id: session.user.id, email: session.user.email, name: session.user.name } : null
}

export async function requireUser(): Promise<SignedIn> {
  const user = await currentUser()
  if (!user) throw new Unauthorized('sign in first')
  return user
}

// The signed-in operator and their business. One business per operator for now; the first one wins.
export async function requireOperator(): Promise<{ user: SignedIn; business: Membership }> {
  const user = await requireUser()
  const [business] = await membershipsOf(user.id)
  if (!business) throw new Forbidden('no business for this account')
  return { user, business }
}
