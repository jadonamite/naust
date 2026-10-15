import { toNextJsHandler } from 'better-auth/next-js'
import { getAuth } from '@/lib/accounts.ts'

const handler = async () => toNextJsHandler(await getAuth())

export async function GET(req: Request) {
  return (await handler()).GET(req)
}

export async function POST(req: Request) {
  return (await handler()).POST(req)
}
