import { createAuthClient } from 'better-auth/react'
import { emailOTPClient } from 'better-auth/client/plugins'

// Browser side of sign-in, talking to /api/auth on the same site.
export const authClient = createAuthClient({ plugins: [emailOTPClient()] })
