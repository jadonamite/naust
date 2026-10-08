import { env } from './env.ts'

// Keycloak tokens for the DevNet ledger: password grant once, then refresh-token renewal.
type Grant = { access: string; refresh?: string; expiresAt: number; userId: string }

const RENEW_MARGIN_MS = 60_000
let grant: Grant | undefined
let inFlight: Promise<Grant> | undefined

async function request(params: Record<string, string>): Promise<Grant> {
  const res = await fetch(env.keycloakTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.keycloakClientId, ...params }),
  })
  if (!res.ok) throw new Error(`Keycloak ${params.grant_type} failed: HTTP ${res.status}`)
  const body = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number }
  const claims = JSON.parse(Buffer.from(body.access_token.split('.')[1], 'base64url').toString())
  return {
    access: body.access_token,
    refresh: body.refresh_token,
    expiresAt: Date.now() + body.expires_in * 1000,
    userId: claims.sub,
  }
}

const login = () =>
  request({
    grant_type: 'password',
    username: env.username,
    password: env.password,
    scope: 'openid daml_ledger_api offline_access',
  })

async function renew(): Promise<Grant> {
  if (grant?.refresh) {
    try {
      return await request({ grant_type: 'refresh_token', refresh_token: grant.refresh })
    } catch {
      // Refresh token expired or revoked: fall through to a fresh login.
    }
  }
  return login()
}

async function current(): Promise<Grant> {
  if (grant && grant.expiresAt - Date.now() > RENEW_MARGIN_MS) return grant
  inFlight ??= renew().then(
    (g) => ((grant = g), (inFlight = undefined), g),
    (e) => ((inFlight = undefined), Promise.reject(e)),
  )
  return inFlight
}

export async function accessToken(): Promise<string> {
  return (await current()).access
}

// The ledger user ID is the token's subject.
export async function ledgerUserId(): Promise<string> {
  return (await current()).userId
}

// Called after a 401 so the next request logs in again.
export function invalidateToken(): void {
  if (grant) grant.expiresAt = 0
}
