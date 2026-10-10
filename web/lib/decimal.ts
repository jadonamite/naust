// Exact arithmetic for ledger amounts, which are decimal strings with up to 10 places (Daml `Decimal`).
const SCALE = 10
const UNIT = 10n ** BigInt(SCALE)
const DECIMAL = /^-?\d+(\.\d+)?$/

function toUnits(s: string): bigint {
  if (!DECIMAL.test(s)) throw new Error(`not a decimal amount: ${s}`)
  const negative = s.startsWith('-')
  const [whole, fraction = ''] = s.replace('-', '').split('.')
  if (fraction.length > SCALE) throw new Error(`more than ${SCALE} decimal places: ${s}`)
  const units = BigInt(whole) * UNIT + BigInt(fraction.padEnd(SCALE, '0'))
  return negative ? -units : units
}

function fromUnits(u: bigint): string {
  const negative = u < 0n
  const abs = negative ? -u : u
  return `${negative ? '-' : ''}${abs / UNIT}.${(abs % UNIT).toString().padStart(SCALE, '0')}`
}

export const sumDecimals = (xs: string[]): string => fromUnits(xs.reduce((s, x) => s + toUnits(x), 0n))

export const compareDecimals = (a: string, b: string): number => {
  const d = toUnits(a) - toUnits(b)
  return d < 0n ? -1 : d > 0n ? 1 : 0
}
