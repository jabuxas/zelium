import type { Papel } from './auth';

export type Recurso = 'patrimonios' | 'ambientes' | 'solicitacoes' | 'cadastros' | 'usuarios' | 'relatorios' | 'financeiro';

/** Escrita significa gerir; abrir uma solicitação é permitido aos três perfis. */
export function podeEscreverRecurso(papel: Papel | null, recurso: Recurso): boolean {
  if (papel === 'gestor') return true;
  return papel === 'responsavel' && ['patrimonios', 'ambientes', 'solicitacoes', 'relatorios'].includes(recurso);
}

/** Guarda de UX, não substitui authorize() no backend. */
export function podeAcessarPagina(papel: Papel | null, path: string): boolean {
  if (!papel) return false;
  const [, modulo, acao] = path.split('/');
  if (['financeiro', 'notificacoes', 'usuarios'].includes(modulo)) return papel === 'gestor';
  if (modulo === 'relatorios') return papel !== 'conferente';
  if (['novo', 'editar', 'estado'].includes(acao)) {
    if (modulo === 'patrimonios' || modulo === 'ambientes') return podeEscreverRecurso(papel, modulo);
    return podeEscreverRecurso(papel, 'cadastros');
  }
  return true;
}
