import { fileURLToPath } from 'node:url';
import { configuration, sampleSnapshot, liveSnapshot } from './source.mjs';
import { FundingStore } from './store.mjs';
import { serve } from './server.mjs';

const command = process.argv[2] ?? 'serve';
let store;
try {
  if (!['serve', 'walkthrough', 'sync'].includes(command)) throw new Error('Use serve, walkthrough or sync.');
  const config = configuration();
  const path = process.env.FUNDING_DB ?? fileURLToPath(new URL(`../data/${config.namespace}.sqlite`, import.meta.url));
  store = new FundingStore(path, config);
  console.log(`Source: ${config.mode}${config.origin ? ` ${config.origin}` : ' deterministic fixtures'}. Local demonstration balances only.`);
  if (command === 'serve') {
    const port = Number(process.env.FUNDING_PORT ?? 4317);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('FUNDING_PORT must be an integer from 1024 to 65535.');
    const server = serve(store, port);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => { store.close(); process.exit(0); }));
  } else {
    if (command === 'walkthrough') {
      if (config.mode !== 'sample') throw new Error('Walkthrough requires sample mode.');
      for (const stage of [1, 2, 2]) console.log(JSON.stringify({ stage, ...store.reconcile(sampleSnapshot(stage), stage) }));
    } else {
      console.log(JSON.stringify(store.reconcile(config.mode === 'sample' ? sampleSnapshot(store.stage()) : await liveSnapshot(config))));
    }
    console.log(JSON.stringify({ accounts: store.view().accounts, credits: store.view().credits.length }, null, 2));
    store.close();
  }
} catch (error) {
  if (store) { store.fail(error); store.close(); }
  console.error(error.message);
  process.exitCode = 1;
}
