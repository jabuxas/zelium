import type { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { AuthContext } from '../lib/auth-context';
import { podeEscreverRecurso } from '../lib/permissions';
import type { Papel } from '../lib/auth';

export function authValue(papel: Papel | null = 'gestor') {
  return {
    usuario: papel ? { id: 1, nome: 'Teste', email: 'teste@teste.com', papel, organizacaoId: 1 } : null,
    organizacao: { id: 1, nome: 'Teste' }, papel, carregando: false,
    login: async () => {}, logout: () => {},
    podeEscrever: (recurso: Parameters<typeof podeEscreverRecurso>[1]) => podeEscreverRecurso(papel, recurso),
  };
}

/** Testes antigos explicitam agora a sessão de Gestor, sem permissões implícitas. */
export function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, { wrapper: ({ children }) => <AuthContext.Provider value={authValue()}>{children}</AuthContext.Provider>, ...options });
}
