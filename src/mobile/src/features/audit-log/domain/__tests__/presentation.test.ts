import { auditSummary, auditAction, auditField, auditValue, auditDate } from '../presentation';

it('traduz ações atuais e legadas sem jargão de banco', () => {
  expect(auditAction('UPDATE')).toBe('Atualização');
  expect(auditAction('criar')).toBe('Cadastro');
  expect(auditAction('RESTORE')).toBe('Restauração');
});

it('identifica o registro pelo nome e usa ID como alternativa', () => {
  const event = { id: 1, acao: 'UPDATE', recurso: 'patrimonio', recurso_id: 7, criado_em: '' };
  expect(auditSummary({ ...event, registro_nome: 'IFSC-007' })).toBe('Patrimônio · IFSC-007');
  expect(auditSummary(event)).toBe('Patrimônio · #7');
});

it('formata campos e valores sem expor JSON como texto', () => {
  expect(auditField('ambiente_id')).toBe('Ambiente');
  expect(auditValue('principal', true)).toBe('Sim');
  expect(auditValue('status', 'em_andamento')).toBe('Em andamento');
  expect(auditValue('nome', null)).toBe('Não informado');
  expect(auditValue('extra', { id: 1 })).toBe('Dados complementares');
  expect(auditDate('inválida')).toBe('Data indisponível');
});
