// Where to send someone after sign-in. Only paths on this site, so a link cannot bounce them elsewhere.
export function safeNext(value: string | string[] | undefined, fallback: string): string {
  const v = Array.isArray(value) ? value[0] : value
  return v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : fallback
}
