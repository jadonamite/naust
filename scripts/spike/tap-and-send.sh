#!/bin/sh
# Faucet tap into the wallet party, then a token-standard transfer with no memo.
# Usage: tap-and-send.sh <receiver-party> <amount-cc> [tap-usd]
set -e; cd "$(dirname "$0")/../.."; set -a; . ./.env; set +a
T=$(scripts/spike/token.sh); V="$VALIDATOR_API/api/validator/v0/wallet"
[ -n "$3" ] && curl -sS -X POST "$V/tap" -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d "{\"amount\":\"$3\"}" && echo
EXP=$(( ($(date +%s)+86400)*1000000 ))
curl -sS -X POST "$V/token-standard/transfers" -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
  -d "{\"receiver_party_id\":\"$1\",\"amount\":\"$2\",\"description\":\"\",\"expires_at\":$EXP,\"tracking_id\":\"spike-$(date +%s)\"}"; echo
