CREATE TABLE organizacao (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE tipo_material (
    id SERIAL PRIMARY KEY,
    organizacao_id INT NOT NULL DEFAULT 1 REFERENCES organizacao(id),
    nome VARCHAR(50) NOT NULL,
    versao INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE estado_item (
    id SERIAL PRIMARY KEY,
    organizacao_id INT NOT NULL DEFAULT 1 REFERENCES organizacao(id),
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    avaria BOOLEAN NOT NULL DEFAULT FALSE,
    versao INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE fornecedor (
    id SERIAL PRIMARY KEY,
    organizacao_id INT NOT NULL DEFAULT 1 REFERENCES organizacao(id),
    nome VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18),
    telefone VARCHAR(20),
    email VARCHAR(100),
    versao INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

------

CREATE TABLE responsavel (
    id SERIAL PRIMARY KEY,
    organizacao_id INT NOT NULL DEFAULT 1 REFERENCES organizacao(id),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    cargo VARCHAR(50),
    departamento VARCHAR(50),
    telefone VARCHAR(20),
    versao INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE conferente (
    id SERIAL PRIMARY KEY,
    organizacao_id INT NOT NULL DEFAULT 1 REFERENCES organizacao(id),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    cargo VARCHAR(50),
    telefone VARCHAR(20),
    versao INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

------

CREATE TABLE ambiente (
    id SERIAL PRIMARY KEY,
    organizacao_id INT NOT NULL DEFAULT 1 REFERENCES organizacao(id),
    nome VARCHAR(100) NOT NULL,
    bloco VARCHAR(50),
    andar VARCHAR(20),
    responsavel_id INT NOT NULL REFERENCES responsavel(id),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    precisao_metros DOUBLE PRECISION,
    localizacao_observacao VARCHAR(255),
    localizacao_atualizada_em TIMESTAMP,
    versao INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE patrimonio (
    id SERIAL PRIMARY KEY,
    organizacao_id INT NOT NULL DEFAULT 1 REFERENCES organizacao(id),
    numero_patrimonio VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(14,2) NOT NULL,
    observacoes TEXT,
    data_aquisicao DATE,
    vida_util_anos INT,
    valor_residual NUMERIC(14,2),
    tipo_material_id INT NOT NULL REFERENCES tipo_material(id),
    estado_item_id INT NOT NULL REFERENCES estado_item(id),
    ambiente_id INT NOT NULL REFERENCES ambiente(id),
    responsavel_id INT NOT NULL REFERENCES responsavel(id),
    fornecedor_id INT REFERENCES fornecedor(id),
    CONSTRAINT patrimonio_organizacao_numero_key UNIQUE (organizacao_id, numero_patrimonio),
    CONSTRAINT patrimonio_valor_check CHECK (valor >= 0 AND valor < 100000000000000),
    CONSTRAINT patrimonio_valor_residual_check
      CHECK (valor_residual IS NULL OR (valor_residual >= 0 AND valor_residual <= valor)),
    CONSTRAINT patrimonio_vida_util_check
      CHECK (vida_util_anos IS NULL OR (vida_util_anos >= 1 AND vida_util_anos <= 100)),
    versao INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE patrimonio_fotos (
    id SERIAL PRIMARY KEY,
    organizacao_id INT NOT NULL DEFAULT 1 REFERENCES organizacao(id),
    patrimonio_id INT NOT NULL REFERENCES patrimonio(id),
    url VARCHAR(255) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    nome_original VARCHAR(255),
    mime_type VARCHAR(50) NOT NULL,
    tamanho_bytes INT NOT NULL,
    largura INT,
    altura INT,
    descricao TEXT,
    ordem INT NOT NULL DEFAULT 0,
    principal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX patrimonio_fotos_patrimonio_id_idx ON patrimonio_fotos (patrimonio_id);

CREATE TABLE solicitacao (
    id SERIAL PRIMARY KEY,
    organizacao_id INT NOT NULL DEFAULT 1 REFERENCES organizacao(id),
    patrimonio_id INT NOT NULL REFERENCES patrimonio(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('manutencao', 'substituicao')),
    status VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'concluida', 'cancelada')),
    descricao TEXT,
    conferente_id INT REFERENCES conferente(id),
    versao INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    organizacao_id INT,
    tabela VARCHAR(100) NOT NULL,
    registro_id INT NOT NULL,
    acao VARCHAR(20) NOT NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    campos_alterados JSONB,
    usuario VARCHAR(100) NOT NULL DEFAULT 'sistema',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha_hash VARCHAR(100) NOT NULL,
    papel VARCHAR(20) NOT NULL DEFAULT 'conferente' CHECK (papel IN ('gestor', 'responsavel', 'conferente')),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    organizacao_id INT NOT NULL REFERENCES organizacao(id),
    versao INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE TABLE notificacao (
    id SERIAL PRIMARY KEY,
    organizacao_id INT NOT NULL REFERENCES organizacao(id),
    tipo VARCHAR(40) NOT NULL,
    assunto VARCHAR(200) NOT NULL,
    corpo TEXT NOT NULL,
    destinatarios JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    erro TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE conferencia (
    id SERIAL PRIMARY KEY,
    organizacao_id INT NOT NULL REFERENCES organizacao(id),
    patrimonio_id INT NOT NULL REFERENCES patrimonio(id),
    usuario_id INT NOT NULL REFERENCES usuario(id),
    estado_item_id INT REFERENCES estado_item(id),
    observacao TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
