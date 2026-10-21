import test from 'node:test'
import assert from 'node:assert/strict'
import { instrumentIdentity } from '../lib/instrument.ts'

test('instrument identity keeps administrator separate from display ID', () => {
  assert.deepEqual(instrumentIdentity('Amulet@admin::namespace'), { instrumentId: 'Amulet', instrumentAdmin: 'admin::namespace' })
  assert.deepEqual(instrumentIdentity('Amulet'), { instrumentId: 'Amulet', instrumentAdmin: null })
  assert.deepEqual(instrumentIdentity('Amulet@'), { instrumentId: 'Amulet', instrumentAdmin: null })
  assert.deepEqual(instrumentIdentity('@admin'), { instrumentId: '', instrumentAdmin: null })
})
