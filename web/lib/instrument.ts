// Stored instruments contain the token ID followed by its administrator party.
export function instrumentIdentity(stored: string): { instrumentId: string; instrumentAdmin: string | null } {
  const at = stored.indexOf('@')
  return at > 0 && at < stored.length - 1
    ? { instrumentId: stored.slice(0, at), instrumentAdmin: stored.slice(at + 1) }
    : { instrumentId: at < 0 ? stored : stored.slice(0, at), instrumentAdmin: null }
}
