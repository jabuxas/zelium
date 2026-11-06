# Zelium — resumo para o pitch (set–nov/2026)

**Para:** quem monta a apresentação (PowerPoint)
**Período coberto:** 21/09/2026 a 04/11/2026 (com foco em 22/10 a 04/11, quando houve a maior parte do desenvolvimento)
**Fontes:** histórico de commits do repositório, testes executados em 04–05/11/2026 e os documentos `docs/ESCOPO_E_VISIBILIDADE.md` e `docs/ATUALIZACOES_DESDE_SETEMBRO_2026.md`.

> **Como ler:** a seção 1 é o que contar. A seção 2 é a ordem sugerida dos slides. As seções 3 a 6 trazem o conteúdo de cada bloco, em linguagem de negócio. A seção 7 diz o que **não** está pronto — leia antes de montar qualquer slide de "conquistas". A seção 8 reúne frases a evitar e perguntas prováveis.

---

## 1. A mensagem central (30 segundos)

**O Zelium é um sistema de controle patrimonial por assinatura para pequenas empresas: saber quais bens a empresa tem, onde estão, quem responde por eles e o que aconteceu em cada conferência ou manutenção.** Funciona no navegador e no celular.

Em seis semanas, o projeto saiu de um MVP acadêmico (o "Zelar", feito na disciplina de Engenharia de Software II no IFSC) para um produto com **a base técnica de um serviço comercial**: várias empresas na mesma plataforma sem ver os dados umas das outras, login por perfil, cadastro autônomo com período de teste, importação de planilha, conferência em campo por QR Code, relatórios e implantação em um comando.

**O que ainda não existe é validação com clientes reais e a empresa constituída.** Isso é o próximo passo, não um detalhe — veja a seção 7.

### Números para um slide de "em números"

| Indicador | Valor | Observação |
| --- | ---: | --- |
| Commits no período 22/10–04/11 | **128** | em 9 dias com atividade, ao longo de 14 dias corridos |
| Linhas adicionadas (sem arquivos de dependências) | **≈ 20,5 mil** | ≈ 10,1 mil de código, ≈ 8,3 mil de testes, ≈ 2,1 mil de documentação |
| Arquivos alterados | **≈ 370** | |
| Testes automatizados (execução de 04–05/11) | **≈ 990** | 463 no servidor, 169 na web, 271 no app, 89 de ponta a ponta |
| Decisões de arquitetura documentadas no período | **7** | ADR-0009 a ADR-0015 |
| Perfis de acesso | **3** | Gestor, Responsável, Conferente |
| Falhas nos testes na última execução | **0** | |

> Os testes de ponta a ponta (E2E) sobem o sistema de verdade, com banco de dados descartável, e simulam uma pessoa usando a web e o app. Os 89 somam 27 (servidor), 30 (web) e 32 (app).
> A quantidade de testes é uma medida de **cuidado**, não de ausência de falhas.

---

## 2. Estrutura sugerida (12 slides)

| # | Título do slide | Conteúdo | Sugestão visual |
| ---: | --- | --- | --- |
| 1 | Zelium | Nome, frase de uma linha, equipe | Logo (a logo oficial ainda não foi entregue; usar só o nome — ver seção 7) |
| 2 | O problema | Empresas não sabem ao certo o que têm, onde está e quem é o responsável | Ícones de planilha, caixa, ponto de interrogação |
| 3 | A solução | Controle patrimonial no navegador e no celular, por assinatura | Captura de tela do painel + do app |
| 4 | De MVP a produto | De 3 meses de projeto acadêmico a plataforma multiempresa em 6 semanas | Linha do tempo (seção 3) |
| 5 | Como funciona (demo) | Cadastro → importar planilha → etiquetas QR → conferir no celular → avaria → e-mail → relatório | Sequência de 6 telas (roteiro na seção 5) |
| 6 | Cada empresa no seu espaço | Isolamento entre empresas; 3 perfis com permissões diferentes | Diagrama simples: empresa A e B separadas |
| 7 | Começar sozinho | Cadastro autônomo, 30 dias de teste, importação de planilha com prévia | Fluxo em 3 passos |
| 8 | Confiança e segurança | O que foi feito para proteger os dados (linguagem simples, seção 4.1) | Ícone de cadeado + 4 itens |
| 9 | Feito com rigor | ≈ 990 testes, 7 decisões documentadas, auditoria completa | Slide "em números" |
| 10 | O negócio | Planos, concorrentes, ponto de equilíbrio (seção 6) | Tabela de planos + gráfico de equilíbrio |
| 11 | O que falta | Pilotos, empresa, cobrança, revisão jurídica (seção 7) | Lista curta e honesta |
| 12 | Próximos passos e pedido | Marcos até fevereiro/2027; o pedido concreto da equipe | Linha do tempo futura |

> **Defina o "pedido" (slide 12).** O repositório não diz o que a equipe vai pedir. O que existe nos documentos: são necessários **R$ 9.000** para formalizar e sustentar três meses sem clientes pagantes (seção 6), e o objetivo de **pelo menos dois testes externos ao campus** (marco C). Cabe à equipe escolher: aporte, indicação de empresas para piloto, parceria, ou conversa sobre preço.

---

## 3. Linha do tempo

| Data | O que aconteceu |
| --- | --- |
| **mar–jun/2026** | Projeto acadêmico "Zelar": cadastros (bens, ambientes, responsáveis, conferentes, fornecedores, tipos, estados), histórico de estados, solicitações de manutenção/substituição, painel, auditoria, 8 decisões de arquitetura, publicação de demonstração. Equipe de 4 pessoas da disciplina. |
| **21/09** | Aplicativo mobile (Expo/React Native) incorporado ao repositório. |
| **25/09** | Documento de escopo e viabilidade: concorrentes, preços, marcos, custos e ponto de equilíbrio. Fez parte do mesmo período: identidade visual, folder (flyer) e planejamento jurídico/LGPD (descritos em `ATUALIZACOES_DESDE_SETEMBRO_2026.md`). |
| **22/10** | Sete entregas de uma vez: infraestrutura própria com HTTPS e backup, login com perfis (web e app), isolamento entre empresas, notificações por e-mail, relatórios com PDF/CSV, QR Code com inventário em campo, depreciação e visão financeira. |
| **23–25/10** | **Auditoria de qualidade de ponta a ponta:** o sistema foi testado como um usuário usaria, nas três interfaces. Os problemas encontrados foram corrigidos (proteção de fotos, impedir que uma empresa "forje" outra, histórico, acessibilidade do app, entre outros). |
| **29–30/10** | Banco de dados com atualizações versionadas e reversíveis; numeração de bens por empresa; dinheiro tratado em centavos; sessões que podem ser derrubadas na hora; limite de tentativas de login. |
| **01/11** | Base do cadastro autônomo com período de teste. |
| **03/11** | Período de teste com limites e bloqueio ao expirar; sessão web mais segura (cookie protegido); telas de cadastro e confirmação. |
| **04/11** | Recuperação de senha; importação de planilha; tela de conta no app; e-mail real testado; revisão de segurança independente; implantação em um comando. |

---

## 4. O que foi construído, por bloco

Cada bloco traz **o que o cliente ganha** e **como sabemos que funciona**.

### 4.1 Segurança e acesso (maior bloco do período: ≈ 22 commits)

**O que o cliente ganha:** a certeza de que só as pessoas certas veem e alteram os dados da empresa.

- **Login por perfil:** o Gestor administra tudo; o Responsável cuida de seus ambientes; o Conferente confere em campo. Cada tela e cada ação respeitam o perfil, na web e no app.
- **Sessões que se encerram na hora:** trocar a senha ou desativar uma pessoa derruba todas as sessões dela imediatamente. Rebaixar o perfil de alguém vale no mesmo instante, mesmo que a pessoa esteja logada.
- **Proteção contra tentativas de invasão:** limite de tentativas de login; respostas que não revelam se um e-mail existe; no login, o tempo de resposta não denuncia se o e-mail existe.
- **Cookie de sessão protegido** no navegador (a chave de acesso não fica exposta a scripts) e **proteção contra pedidos forjados por outros sites**.
- **Links de e-mail seguros:** os links de confirmação e de recuperação expiram em 24 horas, só funcionam uma vez e não são guardados em texto legível no banco.
- **Senha mínima de 12 caracteres** em todos os caminhos.
- **Contas de demonstração bloqueadas em produção:** o servidor se recusa a subir se ainda existirem contas de teste com senha pública.
- **Fotos dos bens protegidas:** só quem tem acesso à empresa vê as imagens; arquivos são validados e reprocessados.
- **Dependências com vulnerabilidades conhecidas atualizadas.**

**Como sabemos:** testes automatizados para cada regra; e uma **revisão de segurança feita por um assistente de IA com contexto limpo** (ver a ressalva na seção 7) encontrou 0 problemas críticos, 2 obrigatórios e 6 opcionais — **todos corrigidos no mesmo dia**.

### 4.2 Várias empresas na mesma plataforma

**O que o cliente ganha:** a empresa A nunca vê, altera ou encontra dados nem fotos da empresa B. É a condição para vender por assinatura.

- Isolamento aplicado em todas as camadas: consultas, escritas, arquivos e histórico de auditoria.
- Tentativas de "forjar" a empresa (enviar o número de outra empresa) são bloqueadas e testadas.
- Cada empresa tem a **própria numeração** de bens (duas empresas podem ter o patrimônio "000123").
- Atualizações do banco de dados são **versionadas, reversíveis e não presumem dados** (nada é inventado ou apagado para fazer a migração funcionar).

### 4.3 Operação em campo: QR Code, app e conferência

**O que o cliente ganha:** conferir o patrimônio andando pela empresa com o celular.

- Etiquetas com QR Code por bem, para imprimir.
- App que lê o QR com a câmera (ou busca manual quando não há câmera) e abre a ficha do bem.
- Conferência registra estado e histórico juntos, sem perder um dos dois se algo falhar no meio.
- Fotos por bem, com foto principal.
- App com tema e contraste acessíveis, histórico paginado, recuperação de sessão e cache separado por conta.
- **Tela "Conta"** no app para trocar a própria senha.

### 4.4 Começar sozinho (cadastro autônomo e período de teste)

**O que o cliente ganha:** entrar sem depender de ninguém da equipe.

1. A pessoa informa nome, e-mail e nome da empresa.
2. Recebe um e-mail com um link (válido por 24 horas) e **só então define a senha**.
3. O sistema cria a empresa, o primeiro Gestor e os estados iniciais, tudo de uma vez ou nada.
4. **30 dias de teste** com limite de **500 bens e 5 usuários**.
5. Quando o teste expira, a empresa fica em **modo leitura**: continua consultando e exportando, mas não altera dados. A interface mostra um aviso.

> O cadastro autônomo está pronto e testado, mas **desligado por padrão**. É uma decisão de negócio abri-lo ao público (veja a seção 7).

### 4.5 Importar a planilha que a empresa já tem

**O que o cliente ganha:** não recomeçar do zero. Esse é um dos diferenciais que a equipe quer testar (seção 6).

- Envio de arquivo CSV com **prévia**: o sistema mostra, linha por linha, o que está certo e o que está errado, antes de gravar.
- **Tudo ou nada:** se uma linha estiver errada, nada é gravado.
- **Repetir o envio não duplica** bens.
- Respeita os limites do período de teste e valida tipos, estados, ambientes e responsáveis.
- Limites de segurança: até 1.000 linhas e 2 MB por arquivo.

### 4.6 Recuperação e troca de senha

- "Esqueci minha senha" por e-mail, com link de uso único.
- Troca da própria senha pela web e pelo app (exige a senha atual).
- Trocar a senha invalida qualquer link de recuperação antigo e derruba as sessões.
- **O envio de e-mail real foi testado de ponta a ponta** em 04/11 com um provedor de e-mail verdadeiro (Migadu): o e-mail chegou, o link funcionou, o replay foi recusado e o login com a senha nova funcionou.

### 4.7 Financeiro, relatórios e notificações

- **Depreciação linear** com valor residual e visão financeira do parque (só o Gestor vê o detalhe).
- Valores em **centavos, validados no banco**; aviso para cadastros incompletos.
- **Relatórios** por ambiente, responsável e estado, com exportação em **PDF e CSV**.
- **E-mail automático** em avaria e em solicitação de manutenção.

> **Cuidado de comunicação:** o valor calculado é uma **estimativa gerencial**, não escrituração contábil. Não apresentar como contabilidade.

### 4.8 Implantação e operação

**O que o cliente (e a equipe) ganha:** subir e manter o sistema com pouco esforço.

- **Um comando** (`./up.sh`) cria a configuração com segredos gerados, valida tudo e sobe o sistema.
- **Primeiro acesso sem mexer no banco:** o primeiro Gestor nasce de duas variáveis de configuração.
- HTTPS automático (certificado emitido e renovado sozinho), com domínio próprio ou DuckDNS.
- **Backup diário** com retenção de 14 dias.
- **Limpeza de dados diária** (dados temporários e notificações antigas) — alinhada à privacidade/LGPD. O histórico de auditoria é mantido por padrão.
- Durante esse trabalho foi encontrado e corrigido um erro que **impedia o arquivo de implantação de ser aceito** pelo Docker. Foi um defeito real e agora está testado com a subida de verdade do banco, do servidor e da limpeza de dados.

---

## 5. Roteiro de demonstração sugerido (≈ 3 minutos)

Tudo abaixo existe hoje. Use dados fictícios.

1. **Cadastro** — abrir a página de cadastro, informar nome, e-mail e empresa; mostrar a mensagem de "verifique seu e-mail".
2. **Primeiro acesso** — confirmar pelo link, definir a senha, entrar no painel.
3. **Importar planilha** — enviar um CSV de 10–20 bens; mostrar a **prévia** com uma linha com erro e depois o arquivo corrigido.
4. **Etiquetas** — abrir um bem, mostrar o QR Code para impressão.
5. **No celular** — ler o QR, abrir a ficha, mudar o estado para "em manutenção".
6. **Aviso e relatório** — mostrar o e-mail de avaria (ou a tela de notificações) e exportar o relatório em PDF.
7. **Isolamento (opcional, impacta)** — entrar com outra empresa e mostrar que os dados não aparecem.

> **Risco da demo:** os passos 1 e 2 dependem do envio de e-mail real e do cadastro estar ligado no ambiente. Teste antes. Se não for possível, comece pelo passo 3 com uma conta já criada.

---

## 6. O negócio (do documento de escopo — são hipóteses)

**Cliente-alvo (hipótese de venda):** empresas privadas com aproximadamente 50 a 500 bens e uma pessoa responsável pelo inventário. Não há pesquisa que sustente porcentagens de mercado; **não usar números de mercado sem fonte**.

**Diferencial a testar:** implantar com pouco auxílio, importar uma planilha existente e conferir no local. Concorrentes também têm QR Code, aplicativo e importação, então **essas funções isoladas não são um diferencial exclusivo**.

**Preços praticados pelos concorrentes** (consulta pública em 25/09/2026, mensais):

| Produto | Preço observado | Limite |
| --- | --- | --- |
| QR Inventário | R$ 99; Business R$ 249 | até 100 / até 500 ativos |
| Patrimon.io | Starter R$ 99; Pro R$ 299 | até 500 / até 5.000 bens |
| QLPatrium | a partir de R$ 99,99 | até 300 bens (oferta, sob consulta) |
| MagoWeb | R$ 150 | escopo a confirmar |

**Planos propostos pelo Zelium (referência para validar, não tabela comercial):**

| Plano | Bens | Mensalidade |
| --- | ---: | ---: |
| Inicial | até 100 | R$ 129 |
| Equipe | até 500 | R$ 249 |
| Operação | até 1.500 | R$ 449 |

**Custos planejados (estimativas, dependem de cotação):** R$ 1.500 por mês de despesas fixas; R$ 4.500 de gastos iniciais (abertura e revisão jurídica); **R$ 9.000** para a abertura e três meses sem clientes pagantes; sem remuneração dos fundadores.

**Ponto de equilíbrio** (plano de R$ 249, reserva variável de 25%):

| Meta | Clientes pagantes |
| --- | ---: |
| Cobrir só os custos fixos | ≈ 9 |
| Custos fixos + R$ 4.000/mês de retiradas (R$ 1.000 por fundador) | ≈ 30 |
| Custos fixos + R$ 8.000/mês de retiradas (R$ 2.000 por fundador) | ≈ 51 |
| Se os custos fixos subirem para R$ 3.000/mês | 17 / 38 / 59 |

> Este quadro vem do documento `ESCOPO_E_VISIBILIDADE.md`. **O próprio documento adverte** que o preço proposto não garante a viabilidade e que a crítica de "custos subestimados" recebida no Startup Garage é procedente como alerta.

**Tração (relato da equipe, sem documento comprobatório):** 2º lugar no Startup Garage; um avaliador demonstrou forte interesse. Apresentar como relato, sem transformar em "validação de mercado".

---

## 7. O que NÃO está pronto — leia antes de afirmar qualquer coisa

Quem for ouvir o pitch vai perguntar. Melhor dizer isso do que ser surpreendido.

### Validação com clientes e empresa
- **Nenhum piloto externo foi realizado.** Os testes foram com dados fictícios. A meta documentada é pelo menos dois testes externos e cinco entrevistas até janeiro/2027.
- **Não há CNPJ nem caixa destinado ao projeto** (confirmado pela equipe em 25/09/2026).
- **A cobrança por assinatura não está implementada** (nem a regra de planos de 129/249/449 dentro do produto). O sistema controla período de teste e limites do teste, mas não cobra.
- **A revisão jurídica** (sociedade, propriedade do código, termos, privacidade/LGPD) está **planejada, não contratada**.
- Os preços e os custos são **hipóteses**, a validar com clientes e cotações.

### Pontos técnicos
- **O cadastro autônomo está desligado** e só deve ser aberto ao público depois de decisões pendentes (envio de e-mail mais robusto, revisão por pessoas, validação jurídica).
- **O envio de e-mail é feito na hora da solicitação**, sem fila. Um provedor lento deixa a resposta mais lenta, e essa diferença de tempo no cadastro e na recuperação de senha ainda pode sugerir se um e-mail existe. Falta uma fila durável antes de abrir ao público.
- **A revisão de segurança independente foi feita por um assistente de IA**, sem acesso à produção. **Não substitui** revisão por especialistas nem teste de invasão (pentest).
- **O HTTPS real com domínio e a interface completa em servidor** não foram exercitados ao final desse trabalho. Foram testados banco, servidor e rotinas em contêineres reais; falta subir em um servidor com domínio.
- **O app não foi validado em dispositivo físico** nesse período, e não há APK/IPA distribuído. Os testes do app rodam em ambiente de teste e em versão web.
- **A logo oficial ainda não foi entregue;** o produto usa só o nome "Zelium".
- **Restauração de backup em ambiente separado** (critério do marco A) não está registrada. O backup diário existe; o ensaio de restauração precisa ser feito e documentado.
- **O registro de problemas e o canal de suporte** (marco C) ainda não existem.

### Estado dos marcos do plano

| Marco | Meta | Critérios técnicos | Falta |
| --- | --- | --- | --- |
| **A — piloto tecnicamente seguro** | 30/11/2026 | Login, perfis, isolamento entre empresas e migração entregues (≈ 5 semanas antes da meta) | Ensaio de restauração de backup; ambiente de piloto com roteiro e registro de problemas |
| **B — teste no campo** | 18/12/2026 | Etiquetas QR, leitura no app, CSV/PDF e conferência entregues | Conferência acompanhada com pelo menos 50 bens (teste de campo); validação em celular real |
| **C — primeiro piloto em PME** | 29/01/2027 | Importação CSV com prévia e e-mail de avaria entregues | Instruções para o cliente, canal de suporte, **5 entrevistas e 2 testes externos** |
| **D — cobrança** | decisão até 26/02/2027 | — | Empresa, caixa inicial, contrato entre sócios, termos e privacidade, cobrança |

---

## 8. Cuidados na comunicação

### Evitar
- "Pronto para vender", "pronto para o mercado" ou "totalmente seguro". Prefira **"base técnica pronta para pilotos"**.
- "Sem falhas" ou "à prova de ataques". Prefira **"cada regra de segurança tem teste automatizado e passou por revisão"**.
- "Contabilidade" ou "depreciação fiscal". Prefira **"estimativa gerencial do valor dos bens"**.
- "Líder", "único" ou "mais barato". Os concorrentes têm QR Code e importação.
- Números de mercado sem fonte.
- Chamar a revisão de segurança de "auditoria externa" ou "pentest".
- Citar a tração do Startup Garage como prova de demanda.

### Créditos e transparência (a equipe precisa decidir)
- **Créditos:** o histórico do repositório mostra que os **128 commits** do período 22/10–04/11 vieram da conta de **Lucas Barbieri**. A equipe tem 4 pessoas (Lucas Barbieri, Leonardo de Martini, Beatriz Coan e Vinicius Lopes). Definam como creditar o trabalho que não aparece em código (marca, folder, preços, planejamento).
- **Uso de IA:** boa parte do desenvolvimento desse período foi feita com apoio de um assistente de IA (Claude) sob direção do Lucas, e a revisão de segurança citada acima foi feita por um modelo de IA. A pergunta é provável; **decidam como informar e estejam preparados para responder com transparência.**

### Perguntas prováveis (e respostas honestas)

| Pergunta | Resposta sugerida |
| --- | --- |
| Quantos clientes vocês têm? | Nenhum cliente pagante ainda; a base técnica está pronta para pilotos, e o próximo passo é validar com empresas reais. |
| Por que alguém trocaria um concorrente por vocês? | É uma hipótese que queremos testar: implantar com pouco auxílio, importar a planilha existente e conferir no local. |
| É seguro? E a LGPD? | Há isolamento entre empresas, sessões revogáveis, links de uso único, limpeza diária de dados temporários e 7 decisões documentadas. A revisão jurídica de privacidade está planejada, ainda não contratada. |
| Quanto custa e quando começam a cobrar? | Planos de referência de R$ 129, R$ 249 e R$ 449, ainda em validação. Cobrança só após constituir a empresa e fechar a revisão jurídica (decisão até fev/2027). |
| Por que isso foi tão rápido? | Parte do trabalho foi feita com assistente de IA, com testes automatizados e revisão em cada passo (responda conforme decidirem na seção "Créditos"). |
| Funciona no celular? | Sim, há um app (Expo) com leitura de QR e conferência; falta validação em aparelhos físicos e distribuição. |
| O que vocês precisam? | **(definir)** — ver o aviso do slide 12. |

---

## 9. Glossário rápido (para legendas e notas)

| Termo técnico | Em linguagem simples |
| --- | --- |
| Multiempresa (multi-tenant) | Várias empresas usam o mesmo sistema, cada uma só enxerga os seus dados |
| Perfil / RBAC | Cada pessoa tem um papel (Gestor, Responsável, Conferente) com permissões próprias |
| Sessão revogável | O acesso de uma pessoa pode ser cortado na hora |
| Cookie HttpOnly / CSRF | Proteções para que sites maliciosos não usem o login da pessoa |
| Trial | Período de teste de 30 dias com limites |
| CSV | Arquivo de planilha simples (exportável do Excel) |
| E2E (ponta a ponta) | Teste que usa o sistema inteiro como uma pessoa usaria |
| ADR | Registro escrito de uma decisão importante de arquitetura |
| Migração | Atualização controlada da estrutura do banco de dados |
| SMTP | Servidor que envia e-mails |

---

## Apêndice — commits do período 22/10–04/11 por tema (classificação aproximada)

Classificação automática pelo escopo do commit; ajuda a dimensionar o esforço, não é contagem exata.

| Tema | Commits |
| --- | ---: |
| Segurança e acesso | 22 |
| Correções e melhorias diversas | 19 |
| Documentação | 17 |
| App mobile | 17 |
| Testes e qualidade (E2E, auditoria) | 12 |
| Implantação e operação | 11 |
| Multiempresa, dados e patrimônio | 10 |
| Cadastro autônomo e período de teste | 7 |
| Web (interface) | 6 |
| Importação CSV | 5 |
| Financeiro e relatórios | 2 |
| **Total** | **128** |

Rastreabilidade: `git log --since=2026-10-01` no repositório; contratos e decisões em `docs/adrs/` (ADR-0009 a ADR-0015), `docs/ONBOARDING_SELF_SERVICE.md`, `docs/DEPLOY.md`, `docs/GUIA_TESTES.md` e `docs/AUDITORIA_E2E.md`.
