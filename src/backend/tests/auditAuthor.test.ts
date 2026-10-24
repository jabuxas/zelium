import { autorAuditoria } from '../src/services/auditAuthor';

it.each(['A'.repeat(100), '🧑'.repeat(100)])('preserva ID e limite de caracteres com nome longo', nome => {
  const autor = autorAuditoria(nome, 123);
  expect(Array.from(autor)).toHaveLength(100);
  expect(autor.endsWith(' (#123)')).toBe(true);
});

it('preserva nomes curtos sem alteração', () => {
  expect(autorAuditoria('Ana', 1)).toBe('Ana (#1)');
});
