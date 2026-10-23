-- Organização padrão (multiempresa): todos os dados ficam isolados por organizacao_id
INSERT INTO organizacao (id, nome, slug, ativo) VALUES
    (1, 'IFSC Campus São José', 'ifsc-sj', TRUE);

INSERT INTO tipo_material (id, organizacao_id, nome) VALUES
    (1, 1, 'Equipamento de Informática'),
    (2, 1, 'Mobiliário'),
    (3, 1, 'Material Didático'),
    (4, 1, 'Equipamento de Laboratório'),
    (5, 1, 'Equipamento Audiovisual');

INSERT INTO estado_item (id, organizacao_id, nome, descricao) VALUES
    (1, 1, 'Em condições', 'Item em perfeito estado de uso'),
    (2, 1, 'Em manutenção', 'Item sob reparo ou manutenção preventiva'),
    (3, 1, 'Inservível', 'Item sem condições de uso ou recuperação'),
    (4, 1, 'Descarte pendente', 'Item aguardando processo de descarte');

INSERT INTO fornecedor (id, organizacao_id, nome, cnpj, telefone, email) VALUES
    (1, 1, 'TechSupply Informática', '12.345.678/0001-90', '(48) 3333-4444', 'contato@techsupply.com.br'),
    (2, 1, 'Móveis Escolares Ltda', '98.765.432/0001-10', '(48) 3333-5555', 'vendas@moveisescolares.com.br'),
    (3, 1, 'Áudio Video Soluções', '11.222.333/0001-44', '(48) 3333-6666', 'comercial@avsolucoes.com.br'),
    (4, 1, 'LabEquip Científica', '44.555.666/0001-77', '(48) 3333-7777', 'suporte@labequip.com.br');

INSERT INTO responsavel (id, organizacao_id, nome, email, cargo, departamento, telefone) VALUES
    (1, 1, 'Ana Beatriz Souza', 'ana.souza@zelar.com', 'Gerente de TI', 'Tecnologia', '(48) 99999-1001'),
    (2, 1, 'Carlos Eduardo Lima', 'carlos.lima@zelar.com', 'Coordenador', 'Administrativo', '(48) 99999-1002'),
    (3, 1, 'Mariana Costa Oliveira', 'mariana.oliveira@zelar.com', 'Analista de Sistemas', 'Tecnologia', '(48) 99999-1003'),
    (4, 1, 'Fernando Roberto Alves', 'fernando.alves@zelar.com', 'Diretor', 'Diretoria', '(48) 99999-1004');

INSERT INTO conferente (id, organizacao_id, nome, email, cargo, telefone) VALUES
    (1, 1, 'Patrícia Martins', 'patricia.martins@zelar.com', 'Assistente Administrativo', '(48) 99999-2001'),
    (2, 1, 'Rogério Fernandes', 'rogerio.fernandes@zelar.com', 'Auxiliar de Patrimônio', '(48) 99999-2002'),
    (3, 1, 'Juliana Santos', 'juliana.santos@zelar.com', 'Assistente de TI', '(48) 99999-2003');

INSERT INTO ambiente (id, organizacao_id, nome, bloco, andar, responsavel_id) VALUES
    (1, 1, 'Sala 10 - Laboratório de Informática', 'Bloco A', '1º andar', 1),
    (2, 1, 'Sala 15 - Sala de Aula', 'Bloco A', '1º andar', 2),
    (3, 1, 'Sala 22 - Laboratório de Eletrônica', 'Bloco B', '2º andar', 3),
    (4, 1, 'Biblioteca', 'Bloco C', 'Térreo', 4),
    (5, 1, 'Auditório', 'Bloco A', 'Térreo', 1),
    (6, 1, 'Sala 30 - Coordenação', 'Bloco B', '2º andar', 2);

INSERT INTO patrimonio (id, organizacao_id, numero_patrimonio, descricao, valor, observacoes, tipo_material_id, estado_item_id, ambiente_id, responsavel_id, fornecedor_id) VALUES
    (1, 1, '2024/001', 'Computador Desktop Dell OptiPlex 7090', 4500.00, 'I7-11700, 16GB RAM, 512GB SSD', 1, 1, 1, 1, 1),
    (2, 1, '2024/002', 'Monitor LG 24" Full HD', 1200.00, 'Modelo 24MK430H', 1, 1, 1, 1, 1),
    (3, 1, '2024/003', 'Mesa de trabalho em L', 850.00, NULL, 2, 1, 2, 2, 2),
    (4, 1, '2024/004', 'Projetor Epson PowerLite X49', 3200.00, 'Lâmpada com 800h de uso', 5, 1, 5, 1, 3),
    (5, 1, '2024/005', 'Osciloscópio Tektronix TBS1052B', 6800.00, 'Canal 2 com calibração vencida', 4, 2, 3, 3, 4),
    (6, 1, '2024/006', 'Cadeira estofada giratória', 450.00, 'Com braços reguláveis', 2, 1, 6, 2, 2),
    (7, 1, '2024/007', 'Notebook Lenovo ThinkPad E14', 5100.00, 'I5-1235U, 8GB RAM, 256GB SSD', 1, 1, 2, 2, 1),
    (8, 1, '2024/008', 'Impressora HP LaserJet Pro M404dn', 2800.00, NULL, 1, 4, 4, 4, 1),
    (9, 1, '2024/009', 'Armário de aço 2 portas', 950.00, 'Chave reserva no setor de patrimônio', 2, 3, 4, 4, 2),
    (10, 1, '2024/010', 'Micro-ondas Electrolux ME41S', 650.00, 'Uso na copa da coordenação', 4, 1, 6, 2, 4);

SELECT setval('tipo_material_id_seq', (SELECT MAX(id) FROM tipo_material));
SELECT setval('estado_item_id_seq', (SELECT MAX(id) FROM estado_item));
SELECT setval('fornecedor_id_seq', (SELECT MAX(id) FROM fornecedor));
SELECT setval('responsavel_id_seq', (SELECT MAX(id) FROM responsavel));
SELECT setval('conferente_id_seq', (SELECT MAX(id) FROM conferente));
SELECT setval('ambiente_id_seq', (SELECT MAX(id) FROM ambiente));
SELECT setval('patrimonio_id_seq', (SELECT MAX(id) FROM patrimonio));

-- Usuários iniciais (senha padrão: Zelium@2026 — troque no primeiro acesso)
INSERT INTO usuario (id, nome, email, senha_hash, papel, ativo, organizacao_id) VALUES
    (1, 'Gestor Zelium', 'gestor@zelium.com', '$2b$10$cbRZLPMpC5p2.q1EsYT38.eCQTlTCsonhEMvOGAsNkoCnKRrQpJ82', 'gestor', TRUE, 1),
    (2, 'Responsável Zelium', 'responsavel@zelium.com', '$2b$10$cbRZLPMpC5p2.q1EsYT38.eCQTlTCsonhEMvOGAsNkoCnKRrQpJ82', 'responsavel', TRUE, 1),
    (3, 'Conferente Zelium', 'conferente@zelium.com', '$2b$10$cbRZLPMpC5p2.q1EsYT38.eCQTlTCsonhEMvOGAsNkoCnKRrQpJ82', 'conferente', TRUE, 1);

SELECT setval('usuario_id_seq', (SELECT MAX(id) FROM usuario));
SELECT setval('organizacao_id_seq', (SELECT MAX(id) FROM organizacao));
