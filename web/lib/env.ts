import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Secrets live in the repo-root .env (one level above web/). Real env vars win over the file.
const file = resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.NAUST_ENV_FILE ?? '../.env')
if (existsSync(file)) {
  const saved = { ...process.env }
  process.loadEnvFile(file)
  Object.assign(process.env, saved)
}

const required = [
  'KEYCLOAK_TOKEN_URL',
  'KEYCLOAK_CLIENT_ID',
  'HACKCANTON_USERNAME',
  'HACKCANTON_PASSWORD',
  'JSON_API',
  'VALIDATOR_API',
] as const

const missing = required.filter((k) => !process.env[k])
if (missing.length) {
  throw new Error(`Missing settings in ${file}: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`)
}

const v = (k: (typeof required)[number]) => process.env[k] as string

export const env = {
  keycloakTokenUrl: v('KEYCLOAK_TOKEN_URL'),
  keycloakClientId: v('KEYCLOAK_CLIENT_ID'),
  username: v('HACKCANTON_USERNAME'),
  password: v('HACKCANTON_PASSWORD'),
  jsonApi: v('JSON_API').replace(/\/$/, ''),
  validatorApi: v('VALIDATOR_API').replace(/\/$/, '') + '/api/validator/v0',
  dbPath: resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.NAUST_DB ?? 'data/naust.db'),
  pollMs: Number(process.env.NAUST_POLL_MS ?? 3000),
}
