"""Accept every pending transfer instruction on a party, acting as that party.
Usage: python3 accept.py <party>"""
import json, os, subprocess, sys, urllib.request, uuid
root = os.path.join(os.path.dirname(__file__), '..', '..')
env = dict(l.strip().split('=', 1) for l in open(os.path.join(root, '.env')) if '=' in l and not l.startswith('#'))
J, V = env['JSON_API'], env['VALIDATOR_API']
T = subprocess.check_output([os.path.join(root, 'scripts/spike/token.sh')]).decode()
USER = '86bb3d93-2187-41d4-8150-15a31b7d061e'
party = sys.argv[1]

def call(url, body=None):
    req = urllib.request.Request(url, json.dumps(body).encode() if body is not None else None,
                                 {'Authorization': 'Bearer ' + T, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req))

end = call(J + '/v2/state/ledger-end')['offset']
acs = call(J + '/v2/state/active-contracts', {'activeAtOffset': end, 'verbose': False, 'eventFormat': {'filtersByParty': {party: {'cumulative': [
    {'identifierFilter': {'WildcardFilter': {'value': {'includeCreatedEventBlob': False}}}}]}}}})
for e in acs:
    c = e.get('contractEntry', {}).get('JsActiveContract', {}).get('createdEvent', {})
    if not c.get('templateId', '').endswith('AmuletTransferInstruction:AmuletTransferInstruction'):
        continue
    cid = c['contractId']
    ctx = call(f'{V}/api/validator/v0/scan-proxy/registry/transfer-instruction/v1/{cid}/choice-contexts/accept', {'meta': {}})
    cmd = {'commands': [{'ExerciseCommand': {
        'templateId': '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferInstruction',
        'contractId': cid, 'choice': 'TransferInstruction_Accept',
        'choiceArgument': {'extraArgs': {'context': ctx['choiceContextData'], 'meta': {'values': {}}}}}}],
        'commandId': 'accept-' + uuid.uuid4().hex[:8], 'userId': USER, 'actAs': [party], 'readAs': [party],
        'disclosedContracts': [{k: d.get(k, '') for k in ('templateId', 'contractId', 'createdEventBlob', 'synchronizerId')}
                               for d in ctx['disclosedContracts']]}
    tx = call(J + '/v2/commands/submit-and-wait-for-transaction', {'commands': cmd})['transaction']
    print('accepted', cid[:16], 'update', tx['updateId'][:20])
