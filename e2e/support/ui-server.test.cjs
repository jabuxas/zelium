const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

async function waitForFile(file) {
  const deadline = Date.now() + 4000;
  while (!fs.existsSync(file)) {
    if (Date.now() >= deadline) throw new Error(`Processo não confirmou ${path.basename(file)}`);
    await delay(20);
  }
}

test('SIGTERM encerra o servidor e os descendentes do pnpm no POSIX', { timeout: 10000 }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zelium-ui-lifecycle-'));
  const pidFile = path.join(root, 'child.pid');
  const stopped = path.join(root, 'stopped');
  const childScript = `const fs=require('node:fs');process.on('SIGTERM',()=>{fs.writeFileSync(${JSON.stringify(stopped)},'ok');process.exit(0)});fs.writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setInterval(()=>{},1000)`;
  const pnpmScript = `#!/usr/bin/env node\nconst {spawn}=require('node:child_process');spawn(process.execPath,['-e',${JSON.stringify(childScript)}],{stdio:'ignore'});process.on('SIGTERM',()=>process.exit(0));setInterval(()=>{},1000);\n`;
  fs.writeFileSync(path.join(root, 'pnpm'), pnpmScript, { mode: 0o700 });
  const wrapper = spawn(process.execPath, [path.join(__dirname, 'ui-server.cjs'), 'mobile'], {
    env: { ...process.env, PATH: `${root}${path.delimiter}${process.env.PATH}` }, stdio: 'ignore',
  });
  let ownedPid;
  try {
    await waitForFile(pidFile);
    ownedPid = Number(fs.readFileSync(pidFile, 'utf8'));
    const exited = once(wrapper, 'exit');
    wrapper.kill('SIGTERM');
    const [code] = await exited;
    assert.equal(code, 0);
    await waitForFile(stopped);
    assert.equal(fs.readFileSync(stopped, 'utf8'), 'ok');
  } finally {
    wrapper.kill('SIGTERM');
    // Somente o PID criado pela fixture e registrado em seu diretório exclusivo.
    if (ownedPid && !fs.existsSync(stopped)) {
      try { process.kill(ownedPid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});
