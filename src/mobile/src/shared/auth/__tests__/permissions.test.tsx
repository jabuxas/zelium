import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { PermissionProvider, usePodeGerir } from '../permissions';
import { DenseEntityCard } from '@/src/shared/ui/admin/DenseEntityCard';

function Controles() {
  const podeGerir = usePodeGerir('patrimonios');
  return <Text>{podeGerir ? 'Pode gerir' : 'Somente consulta'}</Text>;
}

it('sem sessão as permissões são negadas', () => {
  render(<Controles />);
  expect(screen.getByText('Somente consulta')).toBeTruthy();
});

it('conferente consulta detalhes mas não dispara edição ou exclusão', async () => {
  const editar = jest.fn(), excluir = jest.fn();
  render(<PaperProvider><DenseEntityCard title="Bem" metadata={[]} canWrite={false} onEdit={editar} onDelete={excluir} testID="bem" /></PaperProvider>);
  await act(async () => {});
  fireEvent.press(screen.getByLabelText('Editar Bem'));
  fireEvent.press(screen.getByLabelText('Excluir Bem'));
  expect(editar).not.toHaveBeenCalled();
  expect(excluir).not.toHaveBeenCalled();
});

it('responsável pode gerir patrimônios', () => {
  render(<PermissionProvider papel="responsavel"><Controles /></PermissionProvider>);
  expect(screen.getByText('Pode gerir')).toBeTruthy();
});
