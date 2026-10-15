import { customersOfUser } from '@/lib/invites.ts'
import { requireUser } from '@/lib/session.ts'
import { receiptViews } from '@/lib/views.ts'
import { respond } from '../respond.ts'

// The signed-in customer's deposit addresses, one per business that invited them, each with its receipts.
export function GET() {
  return respond(async () => {
    const user = await requireUser()
    const customers = await customersOfUser(user.id)
    return await Promise.all(
      customers.map(async (c) => ({
        id: c.id,
        ref: c.ref,
        business: c.business_name,
        address: c.party,
        // One unreachable ledger leaves the other businesses' receipts showing.
        receipts: await receiptViews(c).catch(() => null),
      })),
    )
  })
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60
