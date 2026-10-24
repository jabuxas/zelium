const { createRequire } = require('node:module');
const { readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const backendRequire = createRequire(path.join(root, 'src/backend/package.json'));
backendRequire('tsx/cjs');
const { PostgreSqlContainer } = backendRequire('@testcontainers/postgresql');

let container, sequelize, server, uploads;
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  server?.close();
  await sequelize?.close();
  await container?.stop();
  if (uploads) rmSync(uploads, { recursive: true, force: true });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => close().finally(() => process.exit(0)));

(async () => {
  // Nunca aceita uma URL de banco externo: toda execução cria seu próprio banco.
  container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('zelium_e2e').withUsername('zelium_e2e').withPassword('e2e_disposable').start();
  Object.assign(process.env, {
    NODE_ENV: 'test', DB_HOST: container.getHost(), DB_PORT: String(container.getMappedPort(5432)),
    DB_NAME: container.getDatabase(), DB_USER: container.getUsername(), DB_PASSWORD: container.getPassword(),
    SMTP_HOST: '', SMTP_USER: '', SMTP_PASSWORD: '',
  });
  // O backend usa cwd/uploads: isola anexos sem escrever na árvore do projeto.
  uploads = mkdtempSync(path.join(tmpdir(), 'zelium-e2e-'));
  process.chdir(uploads);
  ({ sequelize } = backendRequire(path.join(root, 'src/backend/src/database/index.ts')));
  await sequelize.query(readFileSync(path.join(root, 'src/db/schema.sql'), 'utf8'));
  await sequelize.query(readFileSync(path.join(root, 'src/db/seed.sql'), 'utf8'));
  await sequelize.query(`
    INSERT INTO organizacao (id, nome, slug, ativo) VALUES (2, 'Organização E2E B', 'e2e-b', TRUE);
    INSERT INTO usuario (nome, email, senha_hash, papel, ativo, organizacao_id)
      SELECT 'Gestor E2E B', 'gestor.b@e2e.local', senha_hash, 'gestor', TRUE, 2
      FROM usuario WHERE email = 'gestor@zelium.com';
  `);
  const app = backendRequire(path.join(root, 'src/backend/src/app.ts')).default;
  server = app.listen(8870, '127.0.0.1', () => console.log('API E2E pronta (banco e uploads descartáveis)'));
})().catch(async error => { console.error(error); await close(); process.exit(1); });
