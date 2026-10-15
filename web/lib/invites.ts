import { createHash, randomBytes } from 'node:crypto'
import { db, type Customer } from './db.ts'
import { env } from './env.ts'

// A customer joins by a single-use link from their business. Only the token's hash is stored.
const INVITE_DAYS = 7
const hash = (token: string) => createHash('sha256').update(token).digest('hex')

export async function createInvite(customer: Customer, createdBy: string): Promise<{ url: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000)
  const sql = await db()
  await sql`
    INSERT INTO customer_invites (token_hash, customer_id, created_by, expires_at)
    VALUES (${hash(token)}, ${customer.id}, ${createdBy}, ${expiresAt})`
  return { url: `${env.siteUrl}/join/${token}`, expiresAt }
}

export type InviteState = 'valid' | 'used' | 'expired' | 'unknown'
export type InviteInfo = { state: InviteState; businessName?: string; customerRef?: string; customerId?: string }

export async function inviteInfo(token: string): Promise<InviteInfo> {
  const sql = await db()
  const [row] = await sql<{ customer_id: string; ref: string; name: string; expires_at: Date; used_at: Date | null }[]>`
    SELECT i.customer_id, c.ref, b.name, i.expires_at, i.used_at
    FROM customer_invites i JOIN customers c ON c.id = i.customer_id JOIN businesses b ON b.id = c.business_id
    WHERE i.token_hash = ${hash(token)}`
  if (!row) return { state: 'unknown' }
  const state: InviteState = row.used_at ? 'used' : row.expires_at < new Date() ? 'expired' : 'valid'
  return { state, businessName: row.name, customerRef: row.ref, customerId: row.customer_id }
}

// Links the signed-in person to the customer. Claiming is atomic, so a link works exactly once.
export async function acceptInvite(token: string, userId: string): Promise<InviteInfo> {
  const sql = await db()
  return await sql.begin(async (tx) => {
    const [claimed] = await tx<{ customer_id: string }[]>`
      UPDATE customer_invites SET used_at = now(), used_by = ${userId}
      WHERE token_hash = ${hash(token)} AND used_at IS NULL AND expires_at > now()
      RETURNING customer_id`
    if (!claimed) return await inviteInfo(token)
    await tx`
      INSERT INTO customer_users (customer_id, user_id) VALUES (${claimed.customer_id}, ${userId})
      ON CONFLICT DO NOTHING`
    return { ...(await inviteInfo(token)), state: 'valid' as const }
  })
}

export type CustomerOfUser = Customer & { business_name: string }

export async function customersOfUser(userId: string): Promise<CustomerOfUser[]> {
  const sql = await db()
  return await sql<CustomerOfUser[]>`
    SELECT c.*, b.name AS business_name FROM customer_users cu
    JOIN customers c ON c.id = cu.customer_id JOIN businesses b ON b.id = c.business_id
    WHERE cu.user_id = ${userId} ORDER BY b.name, c.ref`
}
