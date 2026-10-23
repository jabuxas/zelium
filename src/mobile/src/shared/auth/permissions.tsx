import { createContext, useContext, type ReactNode } from 'react';
import type { Papel } from './session';

const PapelContext = createContext<Papel | null>(null);

export function PermissionProvider({ papel, children }: { papel: Papel | null; children: ReactNode }) {
  return <PapelContext.Provider value={papel}>{children}</PapelContext.Provider>;
}

export function usePodeGerir(recurso: 'patrimonios' | 'ambientes' | 'cadastros'): boolean {
  const papel = useContext(PapelContext);
  return papel === 'gestor' || (papel === 'responsavel' && recurso !== 'cadastros');
}
