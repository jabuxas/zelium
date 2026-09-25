# Zelium — escopo, validação e viabilidade inicial

**Versão de trabalho:** 25/09/2026
**Objetivo:** orientar as entregas do produto e a discussão entre os fundadores. Valores monetários são **hipóteses para decisão**, não orçamentos obtidos nem preços publicados pelo Zelium.

## 1. O problema e a proposta

Pequenas empresas precisam saber quais bens possuem, onde estão, quem responde por eles e o que aconteceu durante uma conferência ou manutenção. O Zelium propõe um controle patrimonial por assinatura, acessível pelo navegador e pelo aplicativo mobile já funcional: cadastro de bens e ambientes, responsáveis, histórico e solicitações de manutenção. O fluxo de conferência por QR Code ainda está planejado.

**Recorte inicial:** empresas privadas com aproximadamente 50 a 500 bens e uma pessoa responsável pelo inventário. O recorte é uma hipótese de venda; não há pesquisa apresentada que permita afirmar que determinada porcentagem das empresas tem essa quantidade de bens ou sofre perdas por falta de controle. Instituições de ensino podem servir à validação operacional, mas não substituem a confirmação da disposição de compra das PMEs.

**Diferenciação a testar:** implantar com pouco auxílio, importar uma planilha existente e permitir a conferência no local. Concorrentes também oferecem QR Code, aplicativo e importação; essas funções, por si só, não sustentam uma alegação de exclusividade.

## 2. Equipe e situação atual

**Equipe atual, confirmada em 25/09/2026:** Lucas Barbieri, Leonardo de Martini, Beatriz Coan e Vinicius Lopes. O `docs/baseline.md` do segundo anexo registra outra formação e não define a equipe atual.

O segundo anexo é um retrato de arquivos do projeto, não uma execução do sistema. Nele, a entrega web documenta API, PostgreSQL, cadastros de bens e ambientes, responsáveis, estados, solicitações, dashboard, auditoria, testes e publicação de demonstração no Render. A documentação dessa entrega registra **ausência de autenticação, perfis, e-mails automáticos e exportações**; também registra o mobile nativo como fora do escopo daquela entrega. **A equipe confirmou que o app mobile e o servidor próprio funcionam hoje.** O anexo não mostra as capacidades exatas do app atual; verificar em especial câmera, GPS, QR Code, login e conferência antes de apresentá-las como concluídas.

Classificação para comunicação externa:

| Estado | Itens |
| --- | --- |
| Documentado na entrega web | Cadastros, histórico de estados, solicitações, dashboard, auditoria, testes e deploy de demonstração. |
| Confirmado pela equipe nesta revisão | Aplicativo mobile funcional e servidor próprio funcionando. |
| Capacidade específica a verificar no app atual | Câmera, GPS, login, QR Code e fluxo de conferência. |
| Ainda a construir, segundo os anexos | Login e autorização, isolamento entre empresas, avisos automáticos, inventário por QR Code, exportação, importação, cadastro autônomo e cobrança. |

**Tração qualitativa:** a equipe ficou em **2º lugar no Startup Garage** e um avaliador demonstrou forte interesse no produto. Segundo a equipe, uma crítica recebida foi que o preço ao usuário final e a estimativa de custos estavam baixos, com despesas jurídicas subestimadas. O reconhecimento e a crítica devem constar da história do projeto; interesse de avaliador não equivale a compra, preço validado ou autorização do IFSC para usar seus dados.

## 3. Escopo do produto por marcos

### Marco A — piloto tecnicamente seguro (meta: 30/11/2026)

1. Identificar a conta que executa cada ação, definir sessões e perfis mínimos: administrador da organização, operador e leitura/conferência.
2. Introduzir a organização em modelo, consultas, escrita, arquivos e auditoria; bloquear leituras e alterações entre organizações, inclusive IDs informados manualmente e rotas antigas.
3. Migrar os dados existentes para uma organização definida, executar testes de autorização e restaurar um backup em ambiente separado.
4. Preparar ambiente de piloto com dados fictícios, registro de problemas e roteiro do fluxo cadastro → estado → solicitação.

**Critério de aceite:** uma conta da empresa A não consulta, altera nem encontra anexos da empresa B; ações protegidas falham sem sessão; backup é restaurável; o fluxo já documentado continua operando. Até esse aceite, não oferecer cadastro aberto nem acesso a dados de clientes.

### Marco B — teste de operação no campo (meta: 18/12/2026)

Reaproveitar o aplicativo funcional e confirmar quais recursos já possui; gerar etiquetas QR Code com identificador do bem, ler o código e abrir a ficha mediante autorização; exportar uma lista simples em CSV; executar conferência acompanhada de pelo menos 50 bens fictícios ou autorizados. **PDF, coleta de GPS e automação de mensagens são opcionais neste marco.** Se a leitura por QR Code exigir mais trabalho que o previsto, revisar a data.

### Marco C — primeiro piloto em PME (meta: 29/01/2027)

Importação CSV assistida com prévia e rejeição de linhas inválidas, instruções de uso, canal de suporte e e-mail de aviso de avaria. Entrevistar no mínimo cinco empresas do recorte; obter pelo menos dois testes externos ao campus. Medir tempo de importação, uso semanal e necessidade de ajuda. A promessa de adoção sem assistência só passa a ser usada depois de observada.

### Marco D — cobrança e expansão (decisão até 26/02/2027)

Só abrir assinatura após constituir a empresa, assegurar o caixa inicial necessário e confirmar obrigações fiscais, contrato entre sócios, termos e privacidade, segurança, política de suporte, cobrança e cancelamento. **Hoje não há CNPJ nem caixa destinado ao projeto**; esse marco depende de uma fonte de recursos definida para a abertura e a operação inicial. Depreciação contábil/fiscal, relatórios em PDF, geolocalização, ERP e lojas de aplicativos ficam para depois da prova de uso, salvo exigência comprovada dos pilotos. Valor residual estimado no produto não deve ser anunciado como escrituração contábil.

## 4. Prazos e capacidade

A equipe definiu nesta revisão **20 horas semanais para o projeto como um todo** — média de 5 horas por integrante se a divisão for uniforme. O `docs/baseline.md` do anexo registrava 16 horas semanais, estimativa anterior agora substituída. De 28/09 a 30/11 são cerca de nove semanas completas: **aproximadamente 180 horas brutas**. Reservar 2 h/semana para conversar com usuários e 2 h/semana para alinhamento e revisão deixa **aproximadamente 144 horas para implementação e correções**.

| Janela | Entrega verificável | Esforço de implementação estimado |
| --- | --- | ---: |
| 28/09–09/10 | Levantar recursos do app e servidor em operação, desenhar migração, riscos e roteiro de testes | 10 h |
| 12/10–30/10 | Login, sessões, perfis e proteção das rotas existentes | 32 h |
| 02/11–20/11 | Organização, migração e isolamento em banco, API e arquivos | 44 h |
| 23/11–30/11 | Testes cruzados, backup/restauração, correções e demonstração com dados fictícios | 18 h |
| **Total** | **Marco A** | **104 h** |

Após as 104 h estimadas para o marco A, restam **aproximadamente 40 h de folga para investigação, integração e correções**, além de cerca de 18 h previstas para conversas com usuários. Essa folga protege uma entrega complexa: não constitui compromisso de adicionar QR Code, relatórios ou cobrança até novembro. As estimativas precisam ser refinadas depois de inspecionar o código atual. Se autenticação e isolamento excederem a previsão, reduzir o marco de novembro ao **piloto interno isolado** e mover a abertura do acesso para dezembro. Não remover testes de isolamento para cumprir a data.

Para dezembro e janeiro, usar a mesma capacidade de 20 h/semana e planejar no máximo 16 h/semana de implementação, com revisões quinzenais. Os marcos B e C são **metas condicionadas** aos critérios de aceite do marco anterior. A primeira receita fica fora da previsão de novembro.

## 5. Como validar de verdade

- **Piloto interno:** testar com bens, pessoas e ambientes fictícios. Por **dados reais do IFSC**, entenda planilhas institucionais de bens, números das etiquetas, salas e responsáveis, valores, estados de conservação e fotos ou localização de equipamentos do campus. Alguns registros identificam pessoas; mesmo os que não identificam fazem parte do inventário institucional. Usá-los no sistema ou acessar espaços para uma conferência depende de autorização da instituição, definição de responsável pelo teste e acordo sobre acesso e descarte. O interesse de um avaliador no Startup Garage não equivale a essa autorização. Sem ela, usar dados simulados.
- **Contato do Startup Garage:** se puderem reencontrar o avaliador interessado, pedir uma conversa curta sobre o uso e o preço e, se fizer sentido, indicação de empresas para piloto. Registrar o que ele de fato se comprometeu a fazer.
- **Piloto externo:** buscar PMEs do recorte; registrar tamanho do inventário, processo atual, frequência de conferência, pessoa que aprova gastos e valor máximo aceitável.
- **Indicadores:** dois pilotos externos; ao menos um importa ou cadastra 50 bens; uma conferência completa sem ajuda constante; um ciclo de avaria resolvido; zero vazamentos entre contas; ao menos uma intenção de compra com preço explícito. São **metas de validação**, não resultados alcançados.
- **Decisão:** se ninguém aceita pagar, entrevistar sobre a dor e rever posicionamento antes de ampliar escopo ou contratar mídia paga.

## 6. Concorrentes e hipótese de preços

**Preços públicos consultados em 25/09/2026, para cobrança mensal; promoções e limites podem mudar.** Produtos diferem em usuários, bens, suporte e recursos, portanto as cifras servem como referência, não como equivalência direta.

| Produto | Preço público observado | Limite/observação | Fonte |
| --- | ---: | --- | --- |
| [QR Inventário](https://qrinventario.com.br/) | R$ 99/mês; Business R$ 249/mês | Até 100 ativos/2 usuários; Business até 500 ativos/5 usuários | Página de planos |
| [Patrimon.io](https://patrimon.io/precos) | Starter R$ 99/mês; Pro R$ 299/mês | Starter até 500 bens, 2 coletores e 1 administrador; Pro até 5.000 bens | Página de preços |
| [QLPatrium](https://qlpatrium.com.br/) | Essencial **a partir de R$ 99,99/mês** | Até 300 bens; preço exibido como oferta e sujeito a consulta | Página inicial |
| [MagoWeb](https://magoweb.com.br/produtos.php?id=40) | R$ 150/mês | Gestão patrimonial e manutenção; escopo e limite devem ser confirmados | Página do produto |

**A crítica de preço baixo é procedente como alerta.** R$ 49/mês ou R$ 79/mês como faixa central exige muitos assinantes para custear operação, trabalho e contratação especializada. Ao mesmo tempo, um preço maior só se sustenta se o comprador enxergar valor. Hipótese revista para entrevistas e pilotos, **ainda não publicada**:

| Plano proposto | Limite | Mensalidade sugerida | Observação |
| --- | ---: | ---: | --- |
| Inicial | Até 100 bens | R$ 129 | Oferta de entrada com limites claros de uso e suporte. |
| Equipe | Até 500 bens | R$ 249 | Referência para os cálculos abaixo; próximo do Business do QR Inventário. |
| Operação | Até 1.500 bens | R$ 449 | Testar só quando a capacidade do produto e do suporte for comprovada. |

Usuários, imagens e suporte precisam ter limites operacionais escritos; não prometer capacidade ilimitada. O antigo intervalo de R$ 49 a R$ 399 não tinha uma conta de custos suficiente. A nova tabela **não é anúncio nem reajuste aprovado**: mostrar opções de preço em entrevistas com compradores do recorte e observar se as pessoas aceitam pilotar ou contratar. A comparação é imperfeita: o concorrente pode entregar hoje recursos que o Zelium ainda planeja.

## 7. Gastos: o que precisa entrar na conta

**Antes de cobrar:** tempo dos fundadores, app e servidor já funcionando, ambiente de demonstração e pesquisa com clientes. **A equipe confirmou que não possui CNPJ nem caixa para o projeto.** Portanto, o desenvolvimento e as entrevistas devem usar os recursos que já existem, sem assumir mensalidades novas. Equipamento, energia e internet ainda têm custo, mesmo quando pagos pelos fundadores. Para receber dados de clientes, providenciar backup externo e operação que não dependa de uma única máquina.

**Para formalizar e cobrar:** abaixo está um **orçamento de planejamento conservador, não uma lista de cotações**. A crítica recebida no Startup Garage justifica reservar valores maiores e validar cada rubrica com fornecedores antes de definir o preço final.

| Categoria | Valor de planejamento | Decisão inicial |
| --- | ---: | --- |
| Hospedagem, banco, monitoramento e backup externo | R$ 400/mês | Medir carga do servidor e cotar uma alternativa para produção. |
| Domínio, e-mail transacional e ferramentas | R$ 150/mês | Conferir volume de mensagens, armazenamento e confiabilidade. |
| Contabilidade e rotinas fiscais | R$ 500/mês | Solicitar duas cotações para sociedade com quatro sócios. |
| Reserva para serviços jurídicos pontuais | R$ 250/mês | Para revisões futuras; **não substitui a contratação inicial** indicada abaixo. |
| Reserva operacional e suporte externo eventual | R$ 200/mês | Pequenos incidentes ou ferramentas; tempo dos fundadores contabilizado à parte. |
| **Custo fixo de caixa simulado** | **R$ 1.500/mês** | **Sem escritório, anúncios, retiradas ou encargos de pessoal.** |

**Gastos iniciais provisionados, uma única vez:** R$ 1.500 para abertura, registros e preparação contábil; **R$ 3.000 para contratar revisão jurídica** de acordo entre quatro fundadores, termos comerciais e privacidade. **Total: R$ 4.500 como reserva gerencial, não orçamento recebido.** Pedir escopo e preço por escrito a pelo menos dois profissionais de cada área; serviços jurídicos adicionais podem elevar o valor. A [OAB/SC publica uma tabela de honorários de referência para 2026](https://www.oab-sc.org.br/urh); não há um preço único que cubra automaticamente todo esse escopo.

**Caixa necessário:** três meses sem pagantes, se a empresa já estiver formalizada, consumiriam **R$ 9.000** (R$ 4.500 iniciais + 3 × R$ 1.500), sem remuneração dos fundadores. Esse dinheiro **não existe hoje**. Antes de iniciar despesa recorrente ou prometer lançamento pago, decidir se haverá aporte dos fundadores, parceiro financeiro ou outra fonte de recursos; conversar com potenciais compradores enquanto isso. Não assumir que o interesse de um avaliador pagará as contas.

**Imposto de renda e tributos.** Para uma empresa optante pelo Simples Nacional, a guia DAS abrange IRPJ e outros tributos; não somar um segundo “IR da empresa” de modo automático. A Receita informa que licenciamento de software pode cair nos Anexos III ou V segundo o **fator R**, ligado à folha/pró-labore; na primeira faixa, as alíquotas nominais são 6% e 15,5%, respectivamente. Enquadramento, atividades, alíquota efetiva, pró-labore e tributação dos sócios devem ser definidos com contador **antes da primeira cobrança**. Não montar folha artificial só para tentar reduzir a alíquota. [Receita: Simples e fator R](https://www8.receita.fazenda.gov.br/simplesnacional/noticias/NoticiaCompleta.aspx?id=415ad600-7d43-4e55-971b-55df99e95ef3) · [Receita: classificação de licenciamento](https://normas.receita.fazenda.gov.br/sijut2consulta/consulta.action?termoBusca=tabelas+simples+nacional) · [Tabela legal](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm) · [Tributos no DAS](https://www8.receita.fazenda.gov.br/SimplesNacional/Documentos/Pagina.aspx?id=3).

**Marketing.** É preciso encontrar e ouvir clientes; inicialmente, os próprios fundadores podem fazer prospecção direcionada, entrevistas, demonstrações e conteúdo básico. Reservar horas para isso; **agência, mídia paga e contratação de marketing não são despesas necessárias para os primeiros pilotos**. Considerar campanha pequena apenas após medir conversão, retenção e custo de aquisição.

**Advogado e privacidade.** A crítica sobre orçamento jurídico tem fundamento prático: são quatro fundadores, um software comercial e dados de clientes. Incluir contratação **pontual antes de vender**, com escopo para sociedade/propriedade do código, termos comerciais, responsabilidades e privacidade; reservar também verba para revisões. O DREI dispensa o visto obrigatório de advogado no ato constitutivo de ME/EPP, mas isso não torna dispensável a revisão de documentos deste negócio. Não há evidência de necessidade de contrato mensal com escritório desde o início; cotar se o escopo real justificar. Pequenos agentes podem ter dispensa de indicar encarregado, mantendo canal com titulares, segurança e demais deveres da LGPD. Fotos e localização associadas a pessoas exigem finalidade clara, minimização e controle de acesso; desativar GPS por padrão até haver caso de uso comprovado. [DREI](https://www.gov.br/empresas-e-negocios/pt-br/drei/arquivos/faq/perguntas-frequentes) · [ANPD: pequeno porte](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022) · [ANPD: localização como dado pessoal](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados).

**Horas, salários e escritório.** Registrar as **20 h/semana para a equipe** e o tempo real por tarefa. A falta de pagamento imediato aos fundadores reduz saída de caixa, mas não torna o trabalho gratuito: 20 × 4,33 ≈ **87 horas por mês**; a R$ 40/h como custo de oportunidade hipotético, são cerca de **R$ 3.460/mês**. Os cenários de **R$ 1.000 ou R$ 2.000 por pessoa por mês** não afirmam que esses valores sejam salários suficientes: servem para dimensionar a distância entre cobrir despesas e remunerar quatro pessoas. Ainda faltam encargos e a definição contábil da retirada; confirmar pró-labore e obrigações com o contador. Escritório físico **não é necessário** para desenvolvimento e venda remotos; custos de endereço/registro, se aplicáveis, entram na cotação da abertura. Uma sociedade de quatro pessoas não deve ser modelada como MEI: MEI não admite sócios. [Portal Empresas & Negócios](https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes/como-e-feita-a-formalizacao-do-mei/o-mei-pode-ter-socio).

## 8. Conta de equilíbrio e regra para aumentar preços

**Cenário mais exigente para discutir caixa:** mensalidade média **R$ 249 por cliente pagante**, custos fixos **R$ 1.500/mês** e reserva variável de **25% da receita**: 15,5% para uma hipótese de tributação do Anexo V na primeira faixa, 4,5% para pagamentos/perdas e 5% para uso incremental de infraestrutura e atendimento. São **margens de planejamento, não alíquota ou tarifa contratada**. Não estão incluídos o gasto inicial de R$ 4.500, encargos da remuneração dos sócios, contratações, crescimento do custo fiscal em faixas superiores nem incidentes relevantes.

`Resultado de caixa mensal = clientes × preço médio × (1 − 0,25) − 1.500 − retiradas dos sócios`

| Clientes pagantes no plano de R$ 249 | Receita bruta | Após reserva variável e custo fixo | Após mais R$ 4.000/mês de retiradas |
| ---: | ---: | ---: | ---: |
| 5 | R$ 1.245 | **−R$ 566,25** | **−R$ 4.566,25** |
| 10 | R$ 2.490 | **R$ 367,50** | **−R$ 3.632,50** |
| 30 | R$ 7.470 | **R$ 4.102,50** | **R$ 102,50** |
| 60 | R$ 14.940 | **R$ 9.705,00** | **R$ 5.705,00** |

Ponto de equilíbrio aproximado: **9 clientes** pagam só os custos fixos; **30 clientes** pagam custos fixos e R$ 4.000/mês de retiradas (R$ 1.000 por fundador); **51 clientes** pagariam custos fixos e R$ 8.000/mês de retiradas (R$ 2.000 por fundador), **antes dos encargos e obrigações sobre essas retiradas**. Se o objetivo for também recuperar os R$ 4.500 iniciais em 12 meses, acrescentar R$ 375/mês ao alvo: com R$ 4.000 em retiradas, o equilíbrio sobe de 30 para **32 clientes**. A R$ 149/mês, o alvo de R$ 1.500 fixos + R$ 4.000 em retiradas seria **50 clientes** com os mesmos 25% variáveis. Essas comparações mostram por que um preço artificialmente baixo dificulta sustentar o negócio.

**Sensibilidade à crítica de custos subestimados:** se cotações elevarem o fixo mensal para **R$ 3.000**, mantendo preço de R$ 249 e reserva variável de 25%, o equilíbrio passa a **17 clientes sem retiradas**, **38 com R$ 4.000 de retiradas** e **59 com R$ 8.000**. O preço proposto não garante viabilidade; a decisão depende do custo verificado, do número de clientes que a equipe consegue conquistar e de quantas horas consegue atendê-los.

**Decisão proposta:** tratar R$ 249 como hipótese central de entrevista e levar a crítica do Startup Garage aos potenciais compradores: quais resultados justificariam esse valor? Obter cotações reais de contador, advogado e infraestrutura; recalcular com mix dos planos, suporte medido e tributação confirmada. Só definir preço público após essas verificações. **Ainda é preciso financiar a abertura**, mesmo que as projeções de operação mensal mostrem equilíbrio futuro. Não confundir receita recorrente com lucro ou dinheiro já disponível para pagar fundadores.

## 9. Decisões e informações pendentes da equipe

1. Há necessidade de retirada mensal desde a primeira venda? Qual valor mínimo por pessoa e há possibilidade de aporte para a formalização?
2. No app atual, câmera, GPS, login, leitura QR e conferência já funcionam? Existe backup externo do servidor?
3. Vocês querem usar registros patrimoniais reais do IFSC? Se sim, quem pode autorizar? O avaliador interessado poderia conversar sobre preço ou indicar uma empresa para piloto?
4. A empresa seria aberta em qual município e qual atividade/forma de cobrança pretendem adotar? Esses detalhes permitem pedir cotações jurídicas e contábeis e simular tributos corretamente.

## Referências consultadas

Fontes e preços públicos acima, acessados em 25/09/2026; os fatos internos têm como origem os dois anexos e as informações fornecidas pela equipe nesta conversa. Cronograma, custos operacionais, reserva de 25%, preços propostos, metas e cenários são **estimativas do plano**, sujeitos à revisão a cada quinzena.
