// Read-only check of env, auth, ledger, registry reachability and the SQLite schema.
import { env } from '../lib/env.ts'
import { ledgerUserId } from '../lib/auth.ts'
import { activeContracts, amuletBalance, ledgerEnd, treasuryParty, TRANSFER_INSTRUCTION } from '../lib/ledger.ts'
import { db } from '../lib/db.ts'

const ns = '12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e'
const user = await ledgerUserId()
console.log('ledger user:', user)
console.log('ledger end:', await ledgerEnd())
const treasury = await treasuryParty()
console.log('treasury:', treasury.split('::')[0], 'balance', amuletBalance(await activeContracts(treasury)))
for (const name of ['Ada', 'Ben', 'Tokunbo']) {
  const party = `${user.split('-')[0]}-${name}::${ns}`
  const acs = await activeContracts(party)
  console.log(name, 'balance', amuletBalance(acs), 'pending', acs.filter((c) => c.templateId.endsWith(TRANSFER_INSTRUCTION)).length)
}
const tables = db().prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all()
console.log('db', env.dbPath.split('/web/')[1], 'tables', tables.map((t: any) => t.name).join(', '))
