#!/bin/sh
# Prints a fresh DevNet access token. Reads ../../.env.
set -e; cd "$(dirname "$0")/../.."; set -a; . ./.env; set +a
curl -sS "$KEYCLOAK_TOKEN_URL" -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode grant_type=password --data-urlencode client_id="$KEYCLOAK_CLIENT_ID" \
  --data-urlencode username="$HACKCANTON_USERNAME" --data-urlencode password="$HACKCANTON_PASSWORD" \
  --data-urlencode 'scope=openid daml_ledger_api offline_access' \
  | python3 -c 'import json,sys;print(json.load(sys.stdin)["access_token"],end="")'
