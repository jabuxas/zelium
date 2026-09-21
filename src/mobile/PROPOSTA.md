# Proposta de projeto

## 1. Nome provisório do aplicativo

**Zelium**

## 2. Problema que o App pretende resolver

A dificuldade na gestão, rastreabilidade e auditoria de patrimônios em pequenas e médias empresas (PMEs). A ausência de um sistema faz com que inventários dependam de planilhas manuais ou anotações em papel, resultando em:
* Perda financeira por extravio de equipamentos;
* Falta de histórico sobre o estado de conservação e manutenções de cada item;
* Lentidão e erros humanos no momento de auditar o estoque ou transferir a responsabilidade de um equipamento entre funcionários.

## 3. Público-alvo

* **Gestores de operações / Administradores de PMEs:** Profissionais que precisam auditar periodicamente o inventário físico e mitigar perdas financeiras.
* **Colaboradores responsáveis por setores:** Funcionários encarregados de receber, zelar e movimentar materiais ou ferramentas dentro de salas, escritórios ou galpões da empresa.

## 4. Entidade principal do sistema

* **Patrimônio** 
(Campos principais: `numero_patrimonio`, `descricao`, `tipo_material_id`, `estado_item_id`, `ambiente_id`, `responsavel_id`).

## 5. Principais telas previstas

O aplicativo será composto por um fluxo de 8 telas principais para visualização, cadastro e controle:

1. **Tela de Dashboard**
   * **Função:** Resumo com visão analítica e gerencial rápida do ecossistema da empresa.

2. **Tela de Patrimônio**
   * **Função:** Listagem geral dos bens com busca e visualização da ficha técnica.

3. **Tela de Ambientes**
   * **Função:** Cadastro e consulta dos locais físicos da empresa.

4. **Tela de Responsáveis**
   * **Função:** Gerenciamento das pessoas responsáveis pela cautela dos bens.

5. **Tela de Conferentes**
   * **Função:** Controle do Painel de Auditores autorizados a realizar as rondas de inventário.

6. **Tela de Fornecedores**
   * **Função:** Cadastro e consulta de fabricantes, lojas ou assistências técnicas parceiras.

7. **Tela de Tipos de Material**
   * **Função:** Parametrização e categorização dos bens.

8. **Tela de Estados do Item**
   * **Função:** Controle do ciclo de vida do ativo.

## 6. API externa pretendida

* **API do zelium**

A API que será utilizada neste projeto é uma API REST própria, desenvolvida pela equipe especificamente para o sistema Zelium. Ela serve como a camada de backend que conecta o frontend ao banco de dados.

## 7. Recurso nativo pretendido

* **Câmera** (utilizando a biblioteca `expo-camera` para fotos e escaneamento de QR Code / Código de Barras).
* **Localização** (utilizando a biblioteca `expo-location` para rastreamento geográfico exato dos ativos e auditoria de vistorias).

## 8. Justificativa para uso da API e do recurso nativo

**Justificativa da API:**
* **Desacoplamento cliente-servidor:** Mantém o app (React Native/Expo) independente da lógica de negócios e do banco de dados, comunicando-se apenas por requisições HTTP (JSON).
* **Eficiência mobile:** Permite filtrar e paginar os dados no servidor, reduzindo o consumo de internet (3G/4G/5G) e de bateria nos dispositivos.
* **Segurança centralizada:** Evita o acesso direto do app ao banco PostgreSQL, concentrando a autenticação, validação e controle de permissões no backend.

**Justificativa dos recursos nativos:**
* **Expo Camera:** Utilizado para capturar fotos dos patrimônios no momento da conferência, permitindo o registro visual do estado de conservação e o escaneamento de códigos de identificação.
* **Expo Location:** Utilizado para rastrear a localização geográfica exata dos ativos no momento em que são vistoriados, garantindo precisão e auditoria no mapeamento dos ambientes.
