# Contribuições

Projeto desenvolvido em equipe. As responsabilidades abaixo refletem as áreas implementadas no repositório e os commits realizados.

## Lucas Barbieri

- Configuração inicial do projeto Expo, TypeScript, scripts de desenvolvimento, lint, testes e EAS Build.
- Estrutura base de navegação com Expo Router e telas iniciais.
- Configuração de tema visual com React Native Paper e provedor global de toasts.
- Implementação do cliente HTTP base, tratamento de erros da API e contratos de domínio compartilhados.
- Criação do hub de administração e componentes reutilizáveis de interface administrativa.
- Implementação de telas administrativas para entidades auxiliares, incluindo tipos de material, conferentes, fornecedores, responsáveis e estados do item.
- Escrita e manutenção de testes unitários para módulos compartilhados, repositórios, hooks e telas.
- Ajustes de responsividade e Safe Area para evitar sobreposição com barra de status em telas principais.

## Leonardo de Martini

- Implementação da tela de Patrimônios, incluindo listagem, criação, edição, visualização e integração com dados relacionados.
- Integração de relacionamentos do patrimônio com ambientes, responsáveis, tipos de material, estados do item e fornecedores.
- Implementação de upload, preview e visualização ampliada de fotos de patrimônios.
- Integração com recursos nativos de câmera e biblioteca de imagens via Expo Image Picker.
- Implementação do recurso de localização em ambientes usando Expo Location, com tratamento de permissão e aviso específico para web.
- Ajustes de layout, light mode, Safe Area e compatibilidade de build nativo.
- Implementação e ajustes do log de auditoria e atividades recentes no dashboard.
- Melhorias de feedback visual, incluindo animação e posicionamento dos toasts.

## Beatriz Coan

- Elaboração da proposta do projeto com definição do problema, público-alvo, entidade principal, telas previstas, API externa e recursos nativos.
- Implementação da estrutura de tipos e interfaces do dashboard.
- Desenvolvimento do serviço de integração do dashboard com a API do Zelium.
- Criação dos componentes visuais do dashboard, incluindo cards responsivos com ícones.
- Implementação da tela principal do painel e tabela de atividades recentes.
- Integração da rota raiz das abas com a tela de dashboard.
- Atualização de pacotes e arquivos de trava do projeto.
