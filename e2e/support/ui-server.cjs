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
let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  if (!child?.pid) return;
  const pid = child.pid;
  try {
    // O grupo é exclusivo do processo que este script acabou de criar.
    if (process.platform === 'win32') child.kill(signal);
    else process.kill(-pid, signal);
  } catch (error) { if (error.code !== 'ESRCH') throw error; }
  if (process.platform !== 'win32') {
    // Next pode continuar após o pnpm sair; limita o encerramento do grupo próprio.
    setTimeout(() => {
      try { process.kill(-pid, 'SIGKILL'); }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
    }, 3000);
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => stop(signal));
function run(args) {
  return new Promise((resolve, reject) => {
    child = spawn('pnpm', args, { cwd, env, stdio: 'inherit', detached: process.platform !== 'win32' });
    child.once('error', reject);
    child.once('exit', code => {
      child = undefined;
      if (stopping || code === 0) resolve();
      else reject(new Error(`UI encerrou com código ${code}`));
    });
  });
}
(async () => {
  if (mobile) {
    // Expo Web exercita os mesmos componentes RN, não simula hardware nativo.
    await run(['exec', 'expo', 'start', '--web', '--port', '8170', '--localhost', '--clear', '--no-dev']);
  } else {
    if (production) await run(['build']);
    if (stopping) return;
    await run(['exec', 'next', production ? 'start' : 'dev', '-p', '3370']);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
