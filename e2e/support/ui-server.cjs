const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const mobile = process.argv[2] === 'mobile';
const cwd = path.join(root, mobile ? 'src/mobile' : 'src/front');
const env = {
  ...process.env, BROWSER: 'none', ZELIUM_E2E: '1',
  EXPO_NO_DOTENV: '1',
  NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8870/api',
  EXPO_PUBLIC_API_URL: 'http://127.0.0.1:8870/api',
};
const production = process.env.E2E_PRODUCTION === '1';
let child;
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child?.kill(signal));
function run(args) {
  return new Promise((resolve, reject) => {
    child = spawn('pnpm', args, { cwd, env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`UI encerrou com código ${code}`)));
  });
}
(async () => {
  if (mobile) {
    // Expo Web exercita os mesmos componentes RN, não simula hardware nativo.
    await run(['exec', 'expo', 'start', '--web', '--port', '8170', '--localhost', '--clear', '--no-dev']);
  } else {
    if (production) await run(['build']);
    await run(['exec', 'next', production ? 'start' : 'dev', '-p', '3370']);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
