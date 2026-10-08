// How Canton party IDs are shown to people, ENS-style: the business has one name (NEXT_PUBLIC_NAUST_BUSINESS) and
// every customer address is named under it, `MagnaXchange-Ada`. Copy buttons and hover text keep the full ID.
//
// A party ID is `<hint>::<fingerprint>`. On the shared DevNet node every party we created carries the ledger user's
// prefix (`86bb3d93-Ada`) and the business's own party is named after the whole ledger user ID, so the business name
// is swapped in for display. On a business's own node, customer parties are created with the hint `MagnaXchange-Ada`
// and the real ID already reads that way.
export const BUSINESS_NAME = process.env.NEXT_PUBLIC_NAUST_BUSINESS || 'MagnaXchange'

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const USER_PREFIX = /^[0-9a-f]{8}-(?=.)/

const hintOf = (party: string) => party.split('::')[0]

// The business's own parties: its treasury is `MagnaXchange`, each customer address `MagnaXchange-Ada`.
export function partyName(party: string): string {
  const hint = hintOf(party)
  if (USER_ID.test(hint)) return BUSINESS_NAME
  if (USER_PREFIX.test(hint)) return `${BUSINESS_NAME}-${hint.replace(USER_PREFIX, '')}`
  return hint
}

// Whoever sent a deposit. Senders are outside the business (an exchange, a wallet), so they keep their own name;
// only the business's treasury, when it sends, shows as the business.
export function senderName(party: string): string {
  const hint = hintOf(party)
  if (USER_ID.test(hint)) return BUSINESS_NAME
  return hint.replace(USER_PREFIX, '')
}
