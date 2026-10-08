// Display names for Canton party IDs (`<hint>::<fingerprint>`): the treasury shows as the business name and each
// customer address as `<Business>-<ref>`. Copy buttons and hover text keep the full ID.
// Parties allocated by a ledger user carry its ID as a prefix, which is replaced by the business name.
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
