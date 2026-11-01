import { sequelize } from './connection';
import { CadastroService } from '../services/CadastroService';

// Uso administrativo/agendamento; exclui somente pendências já expiradas.
async function limpar() {
  try {
    await new CadastroService().limparExpirados();
    console.log('[cadastro] Limpeza de pendencias expiradas concluida');
  } catch {
    console.error('[cadastro] Falha na limpeza de pendencias expiradas');
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
void limpar();
