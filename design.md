# Design — Zelium

Sistema compartilhado para gestão patrimonial e inventário em campo. Melhorar
as superfícies existentes; preservar rotas e operações. Não é um site promocional.

## Direção

- Público: Gestor, Responsável e Conferente de uma organização.
- Uso prioritário no app: localizar um bem, conferir e entender seu estado.
- Tom: utilitário, calmo e específico; linguagem pt-BR, sem jargão técnico.
- Estrutura: área de trabalho. Cabeçalho compacto → ação/busca → registros → detalhes.
- Preservar React Native Paper/Expo e a família sans do sistema. Sem novas fontes
  remotas, gradientes, efeitos decorativos ou métricas inventadas.

## Marca

A logo oficial ainda não foi fornecida. Usar **Zelium** em texto como fallback,
nunca escudos, cubos ou um novo símbolo como identidade oficial. Componente e
configuração únicos por plataforma; preservar proporção, espaço e alternativa
acessível. Ícones funcionais não são logos.

## Tokens

- Acento: azul funcional já usado nas ações web, `#2563eb` (não é um manual oficial da marca).
- Fundo claro `#f8fafc`; superfície `#ffffff`; texto `#0f172a`; secundário `#475569`;
  bordas `#cbd5e1`; superfícies suaves `#eff6ff`.
- Erro `#b42318`, sucesso `#166534`, alerta `#92400e`, sempre com texto/ícone.
- Tokens semânticos no tema Paper; nenhum componente redesenhado inventa sua paleta.
- Escala de espaço: 4, 8, 12, 16, 20, 24, 32; raios 8–12, sem pills em todos os cartões.
- Corpo 14–16, metadados 12–13, títulos 20–28; números patrimoniais legíveis.

## Interação e responsividade

- Alvos de toque ≥44 px. Rótulos não desaparecem para dar lugar só a ícones.
- Busca e ação primária visíveis; registro abre detalhes; editar/excluir respeitam perfil.
- Formulários rolam com teclado e mantêm cancelar/salvar acessíveis; não dispensar
  um formulário durante uma gravação sem explicar o que aconteceu.
- Estados: carregando, vazio, erro com recuperação, sucesso, consulta sem escrita.
- Não exibir JSON como apresentação primária do histórico.
- Layout legível em 320, 375, 414 e 768 px; tablet com largura de leitura limitada.
- Movimento mínimo, sem animações que bloqueiem ações. Respeitar redução de movimento.

## Critério visual

Revisar screenshots reais antes/depois. Prioridades: hierarquia, densidade,
contraste, leitura de descrições longas, ações não cortadas, abas e áreas seguras.
Não confundir Expo Web responsivo com validação de teclado/câmera/GPS nativos.
