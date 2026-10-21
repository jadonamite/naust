const UNIT = 10n ** 10n;

export function units(value) {
  if (typeof value !== 'string' || !/^\d{1,28}(?:\.\d{1,10})?$/.test(value)) {
    throw new Error('Amount must be a decimal string with at most ten fractional digits.');
  }
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * UNIT + BigInt(fraction.padEnd(10, '0'));
}

export function decimal(value) {
  if (typeof value !== 'bigint' || value < 0n) throw new Error('Expected nonnegative integer units.');
  return `${value / UNIT}.${String(value % UNIT).padStart(10, '0')}`;
}

export const amount = (value) => decimal(units(value));
