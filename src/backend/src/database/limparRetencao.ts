import { sequelize } from './connection';
import { executarRetencao } from './retencao';

/**
 * Retenção operacional: pendências expiradas (cadastro/senha) + purga de
 * notificações e auditoria conforme env. Agendar diariamente no ambiente do
 * backend (produção compilada: `node dist/database/limparRetencao.js`).
 * Monitorar o código de saída; a rotina relata CONTAGENS, nunca conteúdos.
 */
async function limpar() {
  try {
    const resultado = await executarRetencao();
    console.log(
      `[retencao] pendencias=${resultado.pendencias} ` +
      `notificacoes=${resultado.notificacoes} auditoria=${resultado.auditoria}`,
    );
  } catch {
    console.error('[retencao] Falha na rotina de retencao');
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
void limpar();
