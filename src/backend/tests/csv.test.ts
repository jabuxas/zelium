import { parseCsv } from '../src/utils/csv';

describe('Parser de CSV', () => {
  it('detecta separador ponto-e-vírgula e devolve cabeçalho + linhas', () => {
    const resultado = parseCsv('numero;descricao;valor\nA-1;Notebook;3500,00\nA-2;Projetor;2000');
    expect(resultado.separador).toBe(';');
    expect(resultado.headers).toEqual(['numero', 'descricao', 'valor']);
    expect(resultado.linhas).toEqual([['A-1', 'Notebook', '3500,00'], ['A-2', 'Projetor', '2000']]);
  });

  it('detecta separador vírgula quando ele domina o cabeçalho', () => {
    const resultado = parseCsv('numero,descricao,valor\nA-1,"Notebook, completo",3500.00');
    expect(resultado.separador).toBe(',');
    expect(resultado.linhas).toEqual([['A-1', 'Notebook, completo', '3500.00']]);
  });

  it('campo entre aspas preserva quebra de linha e aspas dobradas; separador dentro de aspas é conteúdo', () => {
    const resultado = parseCsv(
      'numero;descricao\n"A-1";"Tem ""aspas"" e\nlinha extra"\n"A-2";"x;y"',
    );
    expect(resultado.linhas).toEqual([
      ['A-1', 'Tem "aspas" e\nlinha extra'],
      ['A-2', 'x;y'],
    ]);
  });

  it('descarta BOM, aceita CRLF e ignora linhas em branco no fim', () => {
    const resultado = parseCsv('\uFEFFnumero;descricao\r\nA-1;Bem\r\n\r\n');
    expect(resultado.headers).toEqual(['numero', 'descricao']);
    expect(resultado.linhas).toEqual([['A-1', 'Bem']]);
  });

  it('linha com menos campos termina com células vazias (sem estourar)', () => {
    const resultado = parseCsv('a;b;c\nso-um');
    expect(resultado.linhas).toEqual([['so-um', '', '']]);
  });

  it('recusa conteúdo totalmente vazio ou sem células nomeadas', () => {
    expect(() => parseCsv('')).toThrow(/cabeçalho|cabecalho/i);
    expect(() => parseCsv('   \n  ')).toThrow();
    // Uma única linha é um CSV válido de cabeçalho sem dados (0 linhas):
    // o serviço de importação recusa vazio por domínio.
    expect(parseCsv('numero;descricao').linhas).toEqual([]);
  });
});
