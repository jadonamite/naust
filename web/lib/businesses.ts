import { randomUUID } from 'node:crypto'
import { db, type Business, type Role } from './db.ts'
import { BUSINESS_NAME } from './party.ts'

const newId = (prefix: string) => prefix + randomUUID().replaceAll('-', '').slice(0, 16)

// The public demo: read-only screens at /operator and /customer/<ref>, and the business the dev scripts work on.
export async function demoBusiness(): Promise<Business> {
  const sql = await db()
  const [b] = await sql<Business[]>`
    INSERT INTO businesses (id, name, is_demo) VALUES ('biz_demo', ${BUSINESS_NAME}, true)
    ON CONFLICT (id) DO UPDATE SET id = businesses.id
    RETURNING *`
  return b
}

export async function createBusiness(name: string, ownerId: string): Promise<Business> {
  name = name.trim()
  if (!name) throw new Error('business name is required')
  const sql = await db()
  return await sql.begin(async (tx) => {
    const [b] = await tx<Business[]>`INSERT INTO businesses (id, name) VALUES (${newId('biz_')}, ${name}) RETURNING *`
    await tx`INSERT INTO business_members (business_id, user_id, role) VALUES (${b.id}, ${ownerId}, 'owner')`
    return b
  })
}

export type Membership = Business & { role: Role }

export async function membershipsOf(userId: string): Promise<Membership[]> {
  const sql = await db()
  return await sql<Membership[]>`
    SELECT b.*, m.role FROM business_members m JOIN businesses b ON b.id = m.business_id
    WHERE m.user_id = ${userId} ORDER BY m.created_at`
}

export async function addMember(businessId: string, userId: string, role: Role): Promise<void> {
  const sql = await db()
  await sql`
    INSERT INTO business_members (business_id, user_id, role) VALUES (${businessId}, ${userId}, ${role})
    ON CONFLICT (business_id, user_id) DO UPDATE SET role = excluded.role`
}
