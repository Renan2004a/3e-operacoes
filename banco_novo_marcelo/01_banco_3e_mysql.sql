-- ============================================================================
-- 3E FERRO E ACO - BANCO OPERACIONAL NOVO
-- Script de instalacao limpa - MySQL 8.0.46 (InnoDB / utf8mb4)
-- ============================================================================
-- Este script NAO e migracao do banco atual e NAO se conecta ao Top Gerente.
-- Ele cria um banco novo, com nome diferente de `tres_e_operacoes`.
-- Nao ha DROP DATABASE, DROP TABLE ou rotina de exclusao de dados.
--
-- Convencoes:
--   * Instantes: DATETIME(6) gravados em UTC. A sessao deste script usa +00:00.
--     A aplicacao exibe em America/Sao_Paulo; os prazos sao DATE (dia civil).
--   * Quantidades: DECIMAL(18,3). A escala permitida por unidade e validada
--     pela aplicacao/procedures (o banco nao consegue comparar com a tabela
--     de unidades dentro de um CHECK).
--   * Chaves internas: BIGINT UNSIGNED AUTO_INCREMENT, independentes do ERP.
--   * Chaves externas do ERP: colunas explicitas + UNIQUE; nunca descricao
--     ou posicao visual da linha.
--   * Exclusao fisica de historico nao faz parte do desenho: FKs usam
--     ON DELETE RESTRICT e correcoes usam anulacao logica.
--   * Status de execucao/entrega sao DERIVADOS nas views; nao existe tabela
--     `status` nem coluna de "concluido" editavel.
--
-- Execucao no DBeaver:
--   1. Abra uma conexao MySQL 8.0.46 apontando para uma instancia de TESTE
--      ou para a instancia definitiva VAZIA.
--   2. Abra este arquivo e execute como "Execute SQL Script" (Alt+X).
--   3. O script cria o banco `3e_ferro_aco_operacoes`; ele falha de proposito
--      se o banco ja existir. Nao reexecute em banco parcialmente criado.
--   4. As procedures usam DELIMITER $$ ... DELIMITER ; (compativel com
--      DBeaver e com o cliente mysql).
-- ============================================================================

CREATE DATABASE `3e_ferro_aco_operacoes`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `3e_ferro_aco_operacoes`;

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ============================================================================
-- 1. CADASTROS BASICOS
-- ============================================================================

-- Setores de destino. Codigo textual (nao ENUM) para permitir novos setores
-- sem ALTER TABLE. `EXPEDICAO` e um setor de DESTINO possivel; o processo de
-- entrega/expedicao NAO e um segundo setor do item. Ver 03_alteracoes.
CREATE TABLE setor (
  id_setor BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao VARCHAR(255) NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id_setor),
  UNIQUE KEY uk_setor_codigo (codigo),
  CONSTRAINT ck_setor_ativo CHECK (ativo IN (0,1)),
  CONSTRAINT ck_setor_codigo CHECK (CHAR_LENGTH(TRIM(codigo)) > 0),
  CONSTRAINT ck_setor_nome CHECK (CHAR_LENGTH(TRIM(nome)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Perfis de acesso como dados (substitui o enum RoleCode do banco atual).
-- A matriz de permissoes continua no servidor; esta tabela apenas identifica
-- o perfil e permite evoluir sem migration de ENUM.
CREATE TABLE perfil (
  id_perfil BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  nome VARCHAR(80) NOT NULL,
  descricao VARCHAR(255) NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id_perfil),
  UNIQUE KEY uk_perfil_codigo (codigo),
  CONSTRAINT ck_perfil_ativo CHECK (ativo IN (0,1)),
  CONSTRAINT ck_perfil_codigo CHECK (CHAR_LENGTH(TRIM(codigo)) > 0),
  CONSTRAINT ck_perfil_nome CHECK (CHAR_LENGTH(TRIM(nome)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Pessoa que registra/executa. A senha e a sessao ficam na aplicacao; o banco
-- guarda identidade, situacao e vinculos. Nao ha exclusao fisica: `ativo`.
CREATE TABLE usuario (
  id_usuario BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(254) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uk_usuario_email (email),
  CONSTRAINT ck_usuario_ativo CHECK (ativo IN (0,1)),
  CONSTRAINT ck_usuario_nome CHECK (CHAR_LENGTH(TRIM(nome)) > 0),
  CONSTRAINT ck_usuario_email CHECK (CHAR_LENGTH(TRIM(email)) > 3 AND email LIKE '%@%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE usuario_perfil (
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_perfil BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id_usuario, id_perfil),
  CONSTRAINT fk_usuario_perfil_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_usuario_perfil_perfil FOREIGN KEY (id_perfil)
    REFERENCES perfil (id_perfil) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE usuario_setor (
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_setor BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id_usuario, id_setor),
  CONSTRAINT fk_usuario_setor_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_usuario_setor_setor FOREIGN KEY (id_setor)
    REFERENCES setor (id_setor) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Catalogo de unidades. `codigo_normalizado` e a chave estavel (trim + caixa
-- alta, sem acentos de formatacao). A unidade comercial do item e preservada
-- em `pedido_item.unidade_origem_codigo`; nao ha conversao entre unidades.
CREATE TABLE unidade_medida (
  id_unidade BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  codigo_normalizado VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  nome VARCHAR(80) NOT NULL,
  escala VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  casas_decimais TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id_unidade),
  UNIQUE KEY uk_unidade_codigo (codigo),
  UNIQUE KEY uk_unidade_codigo_normalizado (codigo_normalizado),
  CONSTRAINT ck_unidade_escala CHECK (escala IN ('INTEIRA','DECIMAL')),
  CONSTRAINT ck_unidade_casas CHECK (casas_decimais <= 6),
  CONSTRAINT ck_unidade_escala_casas CHECK (
    (escala = 'INTEIRA' AND casas_decimais = 0)
    OR (escala = 'DECIMAL' AND casas_decimais >= 1)
  ),
  CONSTRAINT ck_unidade_ativo CHECK (ativo IN (0,1)),
  CONSTRAINT ck_unidade_codigo CHECK (CHAR_LENGTH(TRIM(codigo)) > 0),
  CONSTRAINT ck_unidade_normalizado CHECK (CHAR_LENGTH(TRIM(codigo_normalizado)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Espelho local minimo do cadastro do ERP. A identidade do produto e o codigo
-- do ERP (PK `cad_produto.Codigo`); a unidade do produto e apenas o padrao.
-- O item SEMPRE guarda o snapshot comercial (descricao/unidade/quantidade).
CREATE TABLE produto (
  id_produto BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sistema_origem VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'TOP_GERENTE',
  codigo_origem VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  descricao VARCHAR(500) NOT NULL,
  categoria_origem VARCHAR(120) NULL,
  id_unidade_medida BIGINT UNSIGNED NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id_produto),
  UNIQUE KEY uk_produto_origem (sistema_origem, codigo_origem),
  KEY ix_produto_descricao (descricao(100)),
  CONSTRAINT fk_produto_unidade FOREIGN KEY (id_unidade_medida)
    REFERENCES unidade_medida (id_unidade) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_produto_ativo CHECK (ativo IN (0,1)),
  CONSTRAINT ck_produto_codigo CHECK (CHAR_LENGTH(TRIM(codigo_origem)) > 0),
  CONSTRAINT ck_produto_descricao CHECK (CHAR_LENGTH(TRIM(descricao)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 2. COMERCIAL IMPORTADO (SNAPSHOT DO ERP)
-- ============================================================================

-- Cabecalho do pedido. A identidade externa e o trio
-- (sistema_origem, empresa_origem, numero_origem). No legado, a PK de
-- `orcamento` e (Emp, Orc); `numero_origem` e o `Orc` visivel.
-- `empresa_origem` e texto para nao presumir que `Emp` seja sempre 1 ou
-- numerico; o contrato do conector deve fixar a coluna real (LG-09).
CREATE TABLE pedido (
  id_pedido BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sistema_origem VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'TOP_GERENTE',
  empresa_origem VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  numero_origem VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  cliente_nome VARCHAR(200) NULL,
  vendedor_codigo VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  data_orcamento DATE NULL,
  observacoes TEXT NULL,
  importado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  sincronizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id_pedido),
  UNIQUE KEY uk_pedido_origem (sistema_origem, empresa_origem, numero_origem),
  KEY ix_pedido_numero (numero_origem),
  KEY ix_pedido_cliente (cliente_nome),
  KEY ix_pedido_sincronizado (sincronizado_em),
  CONSTRAINT ck_pedido_empresa CHECK (CHAR_LENGTH(TRIM(empresa_origem)) > 0),
  CONSTRAINT ck_pedido_numero CHECK (CHAR_LENGTH(TRIM(numero_origem)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Linha comercial importada + atributos operacionais locais.
--
-- Identidade externa da linha:
--   (id_pedido, vendedor_codigo_origem, seq_origem)
-- que espelha a PK legada (Emp, Vend, Orc, Seq). O conector atual envia
-- apenas o `Vend` do cabecalho e usa `Seq` isolado; isso e um defeito de
-- contrato (LG-08), nao uma identidade suficiente. Enquanto o ERP nao provar
-- que `Vend` e constante por pedido, a coluna e obrigatoria e entra na UK.
--
-- Setor de destino: UM unico FK nullable. NULL = pendente de classificacao.
-- Nao existe tabela `atividade` com N setores por item: a fila operacional e
-- o proprio item, no seu unico setor. Prioridade e prazo operacional ficam
-- aqui. O prazo de entrega e independente do prazo operacional.
CREATE TABLE pedido_item (
  id_item_pedido BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_pedido BIGINT UNSIGNED NOT NULL,
  vendedor_codigo_origem VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  seq_origem INT UNSIGNED NOT NULL,
  id_produto BIGINT UNSIGNED NULL,
  codigo_produto_origem VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  descricao_item VARCHAR(500) NOT NULL,
  categoria_origem VARCHAR(120) NULL,
  id_unidade_medida BIGINT UNSIGNED NOT NULL,
  unidade_origem_codigo VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  quantidade_solicitada DECIMAL(18,3) NOT NULL,
  id_setor_destino BIGINT UNSIGNED NULL,
  classificado_em DATETIME(6) NULL,
  classificado_por BIGINT UNSIGNED NULL,
  prioridade_fila INT NOT NULL DEFAULT 0,
  prazo_entrega DATE NULL,
  prazo_operacional DATE NULL,
  cancelado BOOLEAN NOT NULL DEFAULT FALSE,
  cancelado_em DATETIME(6) NULL,
  cancelado_origem VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin NULL,
  observacoes TEXT NULL,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id_item_pedido),
  UNIQUE KEY uk_item_identidade_origem (id_pedido, vendedor_codigo_origem, seq_origem),
  KEY ix_item_pedido (id_pedido),
  KEY ix_item_setor_fila (id_setor_destino, prazo_operacional, prioridade_fila),
  KEY ix_item_produto (id_produto),
  KEY ix_item_unidade (id_unidade_medida),
  KEY ix_item_cancelado (cancelado),
  CONSTRAINT fk_item_pedido FOREIGN KEY (id_pedido)
    REFERENCES pedido (id_pedido) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_item_produto FOREIGN KEY (id_produto)
    REFERENCES produto (id_produto) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_item_unidade FOREIGN KEY (id_unidade_medida)
    REFERENCES unidade_medida (id_unidade) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_item_setor_destino FOREIGN KEY (id_setor_destino)
    REFERENCES setor (id_setor) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_item_classificado_por FOREIGN KEY (classificado_por)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_item_quantidade CHECK (quantidade_solicitada > 0),
  CONSTRAINT ck_item_prioridade CHECK (prioridade_fila >= 0),
  CONSTRAINT ck_item_unidade_origem CHECK (CHAR_LENGTH(TRIM(unidade_origem_codigo)) > 0),
  CONSTRAINT ck_item_codigo_produto CHECK (
    codigo_produto_origem IS NULL OR CHAR_LENGTH(TRIM(codigo_produto_origem)) > 0
  ),
  CONSTRAINT ck_item_produto_codigo CHECK (
    id_produto IS NULL OR codigo_produto_origem IS NOT NULL
  ),
  -- Classificacao: setor, data e autor andam juntos.
  CONSTRAINT ck_item_classificacao CHECK (
    (id_setor_destino IS NULL AND classificado_em IS NULL AND classificado_por IS NULL)
    OR (id_setor_destino IS NOT NULL AND classificado_em IS NOT NULL AND classificado_por IS NOT NULL)
  ),
  -- Cancelamento logico: data e origem andam juntos.
  CONSTRAINT ck_item_cancelamento CHECK (
    (cancelado = 0 AND cancelado_em IS NULL AND cancelado_origem IS NULL)
    OR (cancelado = 1 AND cancelado_em IS NOT NULL AND cancelado_origem IN ('ERP','USUARIO'))
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 3. OPERACAO: APONTAMENTOS, OCORRENCIAS, ENTREGAS E PREVISOES
-- ============================================================================

-- Motivo de ocorrencia. A lista real ainda e pendente (LG-14); a estrutura
-- aceita a carga futura sem migration. `uk_motivo_id_tipo` existe para a FK
-- composta que garante "motivo do mesmo tipo da ocorrencia".
CREATE TABLE motivo_ocorrencia (
  id_motivo BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  codigo VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  descricao VARCHAR(200) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id_motivo),
  UNIQUE KEY uk_motivo_tipo_codigo (tipo, codigo),
  UNIQUE KEY uk_motivo_id_tipo (id_motivo, tipo),
  CONSTRAINT ck_motivo_tipo CHECK (
    tipo IN ('PERDA','REFUGO','INDISPONIBILIDADE','PAUSA','PARADA','DEFEITO')
  ),
  CONSTRAINT ck_motivo_ativo CHECK (ativo IN (0,1)),
  CONSTRAINT ck_motivo_codigo CHECK (CHAR_LENGTH(TRIM(codigo)) > 0),
  CONSTRAINT ck_motivo_descricao CHECK (CHAR_LENGTH(TRIM(descricao)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Apontamento = evento de execucao/separencia concluido. `quantidade_executada`
-- e sempre um incremento positivo; nunca um total acumulado. Varios
-- apontamentos somam. `executado_por` e quem executou; `registrado_por` e quem
-- digitou (podem ser diferentes). O vinculo com ocorrencia e opcional.
--
-- Anulacao: a linha original NUNCA e apagada nem editada em quantidade; ganha
-- anulado_em/anulado_por/motivo. As views somam apenas anulado_em IS NULL.
-- `chave_idempotencia` e o token da acao (reutilizado no retry).
CREATE TABLE apontamento (
  id_apontamento BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_item_pedido BIGINT UNSIGNED NOT NULL,
  id_usuario_executor BIGINT UNSIGNED NOT NULL,
  id_usuario_registro BIGINT UNSIGNED NOT NULL,
  chave_idempotencia VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  quantidade_executada DECIMAL(18,3) NOT NULL,
  iniciado_em DATETIME(6) NULL,
  finalizado_em DATETIME(6) NULL,
  observacoes TEXT NULL,
  registrado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  anulado_em DATETIME(6) NULL,
  anulado_por BIGINT UNSIGNED NULL,
  motivo_anulacao VARCHAR(500) NULL,
  PRIMARY KEY (id_apontamento),
  UNIQUE KEY uk_apontamento_chave (chave_idempotencia),
  UNIQUE KEY uk_apontamento_id_item (id_apontamento, id_item_pedido),
  KEY ix_apontamento_item_data (id_item_pedido, registrado_em),
  KEY ix_apontamento_executor (id_usuario_executor),
  KEY ix_apontamento_anulado (anulado_em),
  CONSTRAINT fk_apontamento_item FOREIGN KEY (id_item_pedido)
    REFERENCES pedido_item (id_item_pedido) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_apontamento_executor FOREIGN KEY (id_usuario_executor)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_apontamento_registro FOREIGN KEY (id_usuario_registro)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_apontamento_anulado_por FOREIGN KEY (anulado_por)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_apontamento_quantidade CHECK (quantidade_executada > 0),
  CONSTRAINT ck_apontamento_periodo CHECK (
    finalizado_em IS NULL OR iniciado_em IS NOT NULL
  ),
  CONSTRAINT ck_apontamento_periodo_ordem CHECK (
    finalizado_em IS NULL OR finalizado_em >= iniciado_em
  ),
  CONSTRAINT ck_apontamento_anulacao CHECK (
    (anulado_em IS NULL AND anulado_por IS NULL AND motivo_anulacao IS NULL)
    OR (anulado_em IS NOT NULL AND anulado_por IS NOT NULL
        AND motivo_anulacao IS NOT NULL AND CHAR_LENGTH(TRIM(motivo_anulacao)) > 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Ocorrencia: perda, refugo, indisponibilidade, pausa, parada ou defeito.
-- Nao entra no saldo a executar (T-10); e registrada separadamente.
-- A FK composta (id_motivo, tipo) garante que o motivo pertence ao tipo.
-- A FK composta (id_apontamento, id_item_pedido) garante que, se vinculada a
-- um apontamento, a ocorrencia e do MESMO item.
CREATE TABLE ocorrencia (
  id_ocorrencia BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_item_pedido BIGINT UNSIGNED NOT NULL,
  id_apontamento BIGINT UNSIGNED NULL,
  id_usuario_registro BIGINT UNSIGNED NOT NULL,
  tipo VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  id_motivo BIGINT UNSIGNED NULL,
  quantidade DECIMAL(18,3) NULL,
  duracao_minutos INT UNSIGNED NULL,
  observacoes TEXT NULL,
  ocorrido_em DATETIME(6) NOT NULL,
  registrado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  chave_idempotencia VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  anulado_em DATETIME(6) NULL,
  anulado_por BIGINT UNSIGNED NULL,
  motivo_anulacao VARCHAR(500) NULL,
  PRIMARY KEY (id_ocorrencia),
  UNIQUE KEY uk_ocorrencia_chave (chave_idempotencia),
  KEY ix_ocorrencia_item_tipo (id_item_pedido, tipo, ocorrido_em),
  KEY ix_ocorrencia_apontamento (id_apontamento, id_item_pedido),
  KEY ix_ocorrencia_motivo (id_motivo, tipo),
  KEY ix_ocorrencia_anulado (anulado_em),
  CONSTRAINT fk_ocorrencia_item FOREIGN KEY (id_item_pedido)
    REFERENCES pedido_item (id_item_pedido) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_ocorrencia_apontamento FOREIGN KEY (id_apontamento, id_item_pedido)
    REFERENCES apontamento (id_apontamento, id_item_pedido) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_ocorrencia_registro FOREIGN KEY (id_usuario_registro)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_ocorrencia_motivo FOREIGN KEY (id_motivo, tipo)
    REFERENCES motivo_ocorrencia (id_motivo, tipo) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_ocorrencia_anulado_por FOREIGN KEY (anulado_por)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_ocorrencia_tipo CHECK (
    tipo IN ('PERDA','REFUGO','INDISPONIBILIDADE','PAUSA','PARADA','DEFEITO')
  ),
  CONSTRAINT ck_ocorrencia_quantidade CHECK (quantidade IS NULL OR quantidade > 0),
  CONSTRAINT ck_ocorrencia_duracao CHECK (duracao_minutos IS NULL OR duracao_minutos > 0),
  -- Regras por tipo documentadas em 03/04:
  --   PERDA/REFUGO/INDISPONIBILIDADE: motivo + quantidade; sem duracao.
  --   PAUSA/PARADA: duracao; sem quantidade; motivo opcional.
  --   DEFEITO: estrutura livre (quantidade/duracao/motivo opcionais).
  CONSTRAINT ck_ocorrencia_tipo_campos CHECK (
    (tipo IN ('PERDA','REFUGO','INDISPONIBILIDADE')
      AND id_motivo IS NOT NULL AND quantidade IS NOT NULL AND duracao_minutos IS NULL)
    OR (tipo IN ('PAUSA','PARADA')
      AND quantidade IS NULL AND duracao_minutos IS NOT NULL)
    OR (tipo = 'DEFEITO')
  ),
  CONSTRAINT ck_ocorrencia_anulacao CHECK (
    (anulado_em IS NULL AND anulado_por IS NULL AND motivo_anulacao IS NULL)
    OR (anulado_em IS NOT NULL AND anulado_por IS NOT NULL
        AND motivo_anulacao IS NOT NULL AND CHAR_LENGTH(TRIM(motivo_anulacao)) > 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Entrega REALIZADA. Nao e remessa/previsao. Varias entregas parciais somam.
-- Regra normal: entregue <= executado. A excecao gerencial permite
-- entregue > disponivel, mas exige motivo, autorizador e o disponivel anterior
-- (guardado para auditoria). A view sinaliza a excecao; ela nao e "conclusao
-- normal". Anulacao e logica, como no apontamento.
CREATE TABLE entrega (
  id_entrega BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_item_pedido BIGINT UNSIGNED NOT NULL,
  id_usuario_registro BIGINT UNSIGNED NOT NULL,
  chave_idempotencia VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  quantidade_entregue DECIMAL(18,3) NOT NULL,
  entregue_em DATETIME(6) NOT NULL,
  comprovante_referencia VARCHAR(200) NULL,
  observacoes TEXT NULL,
  excecao_autorizada BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_excecao VARCHAR(500) NULL,
  autorizado_por BIGINT UNSIGNED NULL,
  disponivel_antes DECIMAL(18,3) NULL,
  registrado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  anulado_em DATETIME(6) NULL,
  anulado_por BIGINT UNSIGNED NULL,
  motivo_anulacao VARCHAR(500) NULL,
  PRIMARY KEY (id_entrega),
  UNIQUE KEY uk_entrega_chave (chave_idempotencia),
  KEY ix_entrega_item_data (id_item_pedido, entregue_em),
  KEY ix_entrega_autorizador (autorizado_por),
  KEY ix_entrega_anulado (anulado_em),
  CONSTRAINT fk_entrega_item FOREIGN KEY (id_item_pedido)
    REFERENCES pedido_item (id_item_pedido) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_entrega_registro FOREIGN KEY (id_usuario_registro)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_entrega_autorizador FOREIGN KEY (autorizado_por)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_entrega_anulado_por FOREIGN KEY (anulado_por)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_entrega_quantidade CHECK (quantidade_entregue > 0),
  CONSTRAINT ck_entrega_excecao CHECK (
    (excecao_autorizada = 0
      AND motivo_excecao IS NULL AND autorizado_por IS NULL AND disponivel_antes IS NULL)
    OR (excecao_autorizada = 1
      AND motivo_excecao IS NOT NULL AND CHAR_LENGTH(TRIM(motivo_excecao)) > 0
      AND autorizado_por IS NOT NULL AND disponivel_antes IS NOT NULL)
  ),
  CONSTRAINT ck_entrega_anulacao CHECK (
    (anulado_em IS NULL AND anulado_por IS NULL AND motivo_anulacao IS NULL)
    OR (anulado_em IS NOT NULL AND anulado_por IS NOT NULL
        AND motivo_anulacao IS NOT NULL AND CHAR_LENGTH(TRIM(motivo_anulacao)) > 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Previsao de entrega (a "remessa" do sistema antigo). NAO baixa saldo e NAO
-- cria entrega. Numero automatico por item; a UK impede repeticao. A
-- confirmacao registra autor e instante (lacuna do modelo antigo). Remocao e
-- logica (anulada_em), nunca DELETE. `quantidade_prevista` e opcional porque
-- o fluxo atual nao a possui (LG-12); quando o negocio decidir, pode ser
-- preenchida sem migration.
CREATE TABLE entrega_prevista (
  id_entrega_prevista BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_item_pedido BIGINT UNSIGNED NOT NULL,
  numero_remessa INT UNSIGNED NOT NULL,
  data_prevista DATE NOT NULL,
  quantidade_prevista DECIMAL(18,3) NULL,
  confirmada_em DATETIME(6) NULL,
  confirmada_por BIGINT UNSIGNED NULL,
  observacoes TEXT NULL,
  criado_por BIGINT UNSIGNED NOT NULL,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  anulada_em DATETIME(6) NULL,
  anulada_por BIGINT UNSIGNED NULL,
  motivo_anulacao VARCHAR(500) NULL,
  PRIMARY KEY (id_entrega_prevista),
  UNIQUE KEY uk_previsao_item_numero (id_item_pedido, numero_remessa),
  KEY ix_previsao_data (data_prevista, confirmada_em),
  KEY ix_previsao_item (id_item_pedido),
  KEY ix_previsao_anulada (anulada_em),
  CONSTRAINT fk_previsao_item FOREIGN KEY (id_item_pedido)
    REFERENCES pedido_item (id_item_pedido) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_previsao_criado_por FOREIGN KEY (criado_por)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_previsao_confirmada_por FOREIGN KEY (confirmada_por)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_previsao_anulada_por FOREIGN KEY (anulada_por)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_previsao_numero CHECK (numero_remessa > 0),
  CONSTRAINT ck_previsao_quantidade CHECK (
    quantidade_prevista IS NULL OR quantidade_prevista > 0
  ),
  CONSTRAINT ck_previsao_confirmacao CHECK (
    (confirmada_em IS NULL AND confirmada_por IS NULL)
    OR (confirmada_em IS NOT NULL AND confirmada_por IS NOT NULL)
  ),
  CONSTRAINT ck_previsao_anulacao CHECK (
    (anulada_em IS NULL AND anulada_por IS NULL AND motivo_anulacao IS NULL)
    OR (anulada_em IS NOT NULL AND anulada_por IS NOT NULL
        AND motivo_anulacao IS NOT NULL AND CHAR_LENGTH(TRIM(motivo_anulacao)) > 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 4. INTEGRACAO, DIVERGENCIAS, CLASSIFICACAO E AUDITORIA
-- ============================================================================

-- Job on-demand de importacao. Uma linha por chave de negocio do pedido
-- (sistema/empresa/numero); cada tentativa vira um evento append-only.
-- A chave de idempotencia e o token estavel da solicitacao.
CREATE TABLE job_integracao (
  id_job BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sistema_origem VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'TOP_GERENTE',
  empresa_origem VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  numero_origem VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  chave_idempotencia VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  situacao VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'PENDENTE',
  tentativas INT UNSIGNED NOT NULL DEFAULT 0,
  id_pedido BIGINT UNSIGNED NULL,
  solicitado_por BIGINT UNSIGNED NOT NULL,
  erro_codigo VARCHAR(60) NULL,
  erro_mensagem TEXT NULL,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  despachado_em DATETIME(6) NULL,
  concluido_em DATETIME(6) NULL,
  atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id_job),
  UNIQUE KEY uk_job_chave (chave_idempotencia),
  KEY ix_job_origem (sistema_origem, empresa_origem, numero_origem),
  KEY ix_job_situacao (situacao, atualizado_em),
  KEY ix_job_pedido (id_pedido),
  CONSTRAINT fk_job_pedido FOREIGN KEY (id_pedido)
    REFERENCES pedido (id_pedido) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_job_solicitante FOREIGN KEY (solicitado_por)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_job_situacao CHECK (
    situacao IN ('PENDENTE','DESPACHADO','EXECUTANDO','SUCESSO','FALHA','CANCELADO')
  ),
  CONSTRAINT ck_job_tentativas CHECK (tentativas >= 0),
  CONSTRAINT ck_job_conclusao CHECK (
    (situacao IN ('PENDENTE','DESPACHADO','EXECUTANDO') AND concluido_em IS NULL)
    OR (situacao IN ('SUCESSO','FALHA','CANCELADO') AND concluido_em IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Trilha cronologica do job. Append-only: a aplicacao so faz INSERT.
CREATE TABLE evento_job_integracao (
  id_evento BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_job BIGINT UNSIGNED NOT NULL,
  tipo VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  detalhe JSON NULL,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id_evento),
  KEY ix_evento_job_data (id_job, criado_em),
  CONSTRAINT fk_evento_job FOREIGN KEY (id_job)
    REFERENCES job_integracao (id_job) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_evento_tipo CHECK (CHAR_LENGTH(TRIM(tipo)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Divergencia comercial/operacional. Estrutura existe para dar visibilidade
-- ao conflito (quantidade menor que executado/entregue, mudanca de unidade,
-- cancelamento); o FLUXO de resolucao (responsaveis, prazos) continua pendente
-- (LG-01). `chave_idempotencia` evita duplicar a mesma divergencia em retries.
CREATE TABLE divergencia (
  id_divergencia BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_item_pedido BIGINT UNSIGNED NOT NULL,
  id_job BIGINT UNSIGNED NULL,
  tipo VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  situacao VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'ABERTA',
  chave_idempotencia VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  valores_antes JSON NULL,
  valores_depois JSON NULL,
  descricao TEXT NULL,
  aberta_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  resolvida_em DATETIME(6) NULL,
  resolvida_por BIGINT UNSIGNED NULL,
  observacoes TEXT NULL,
  PRIMARY KEY (id_divergencia),
  UNIQUE KEY uk_divergencia_chave (chave_idempotencia),
  KEY ix_divergencia_item_situacao (id_item_pedido, situacao),
  KEY ix_divergencia_situacao_data (situacao, aberta_em),
  KEY ix_divergencia_job (id_job),
  CONSTRAINT fk_divergencia_item FOREIGN KEY (id_item_pedido)
    REFERENCES pedido_item (id_item_pedido) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_divergencia_job FOREIGN KEY (id_job)
    REFERENCES job_integracao (id_job) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_divergencia_resolvedor FOREIGN KEY (resolvida_por)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_divergencia_tipo CHECK (
    tipo IN ('QUANTIDADE','UNIDADE','CANCELAMENTO','OUTRO')
  ),
  CONSTRAINT ck_divergencia_situacao CHECK (
    situacao IN ('ABERTA','EM_ANALISE','RESOLVIDA','ACEITA','DESCARTADA')
  ),
  CONSTRAINT ck_divergencia_resolucao CHECK (
    (situacao IN ('ABERTA','EM_ANALISE') AND resolvida_em IS NULL AND resolvida_por IS NULL)
    OR (situacao IN ('RESOLVIDA','ACEITA','DESCARTADA')
        AND resolvida_em IS NOT NULL AND resolvida_por IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Regras de sugestao de setor. Substitui, com menos duplicidade, as antigas
-- `mapeamentos_categoria_setor` + `regras_produto_setor`:
--   * categoria exata  -> tipo=CATEGORIA, operador=IGUAL
--   * codigo/descricao -> tipo=CODIGO_PRODUTO/DESCRICAO, operador=IGUAL/CONTEM/PREFIXO
-- A coluna gerada `categoria_unica` garante no maximo UMA regra de categoria
-- exata por valor (as demais linhas ficam NULL e nao colidem).
CREATE TABLE regra_classificacao (
  id_regra BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo_correspondencia VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  operador VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  valor VARCHAR(160) NOT NULL,
  categoria_unica VARCHAR(160) GENERATED ALWAYS AS (
    CASE
      WHEN tipo_correspondencia = 'CATEGORIA' AND operador = 'IGUAL' THEN valor
      ELSE NULL
    END
  ) STORED,
  id_setor BIGINT UNSIGNED NOT NULL,
  prioridade INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  vigente_de DATE NULL,
  vigente_ate DATE NULL,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id_regra),
  UNIQUE KEY uk_regra_categoria_unica (categoria_unica),
  UNIQUE KEY uk_regra_combinacao (tipo_correspondencia, operador, valor, id_setor),
  KEY ix_regra_ativa_prioridade (ativo, prioridade),
  KEY ix_regra_setor (id_setor),
  CONSTRAINT fk_regra_setor FOREIGN KEY (id_setor)
    REFERENCES setor (id_setor) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_regra_tipo CHECK (
    tipo_correspondencia IN ('CATEGORIA','CODIGO_PRODUTO','DESCRICAO')
  ),
  CONSTRAINT ck_regra_operador CHECK (operador IN ('IGUAL','CONTEM','PREFIXO')),
  CONSTRAINT ck_regra_valor CHECK (CHAR_LENGTH(TRIM(valor)) > 0),
  CONSTRAINT ck_regra_prioridade CHECK (prioridade >= 0),
  CONSTRAINT ck_regra_vigencia CHECK (
    vigente_ate IS NULL OR vigente_de IS NULL OR vigente_ate >= vigente_de
  ),
  CONSTRAINT ck_regra_ativo CHECK (ativo IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Auditoria polimorfica append-only. `entidade_tipo` + `entidade_id` sao
-- referencia LOGICA (sem FK), pois a tabela cobre entidades diferentes.
-- `id_usuario` tem FK; acoes de sistema podem usar NULL.
CREATE TABLE logs_auditoria (
  id_log BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario BIGINT UNSIGNED NULL,
  acao VARCHAR(60) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  entidade_tipo VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  entidade_id BIGINT UNSIGNED NULL,
  antes_json JSON NULL,
  depois_json JSON NULL,
  motivo VARCHAR(500) NULL,
  correlacao_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id_log),
  KEY ix_log_entidade (entidade_tipo, entidade_id, criado_em),
  KEY ix_log_usuario (id_usuario, criado_em),
  KEY ix_log_correlacao (correlacao_id),
  KEY ix_log_acao (acao, criado_em),
  CONSTRAINT fk_log_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_log_acao CHECK (CHAR_LENGTH(TRIM(acao)) > 0),
  CONSTRAINT ck_log_entidade CHECK (CHAR_LENGTH(TRIM(entidade_tipo)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 5. CADASTROS BASICOS INDISPENSAVEIS (SEED)
-- ============================================================================
-- Nao ha seed de usuarios (a aplicacao cria o primeiro administrador), de
-- motivos (lista real pendente - LG-14), de produtos/pedidos (vem do ERP) nem
-- de regras de classificacao (sugestoes pendentes).

INSERT INTO setor (codigo, nome, descricao) VALUES
  ('CORTE_DOBRA', 'Corte e Dobra', 'Producao de pecas conformes. Executado = pecas.'),
  ('TELHAS', 'Telhas', 'Producao de metros conformes. Executado = metros.'),
  ('REVENDA', 'Revenda', 'Separacao de itens de revenda. Executado = itens separados.'),
  ('EXPEDICAO', 'Expedicao', 'Setor de destino para itens cuja operacao e preparo/expedicao. NAO e um segundo setor de itens de producao.');

INSERT INTO perfil (codigo, nome, descricao) VALUES
  ('OPERADOR', 'Operador', 'Executa e registra apontamentos nos setores vinculados.'),
  ('GERENTE_PRODUCAO', 'Gerente de Producao', 'Consulta tudo, define prioridade/prazo, autoriza excecoes e corrige setor com justificativa.'),
  ('VENDEDOR', 'Vendedor', 'Consulta pedidos, define prazo de entrega, classifica/corrige setor sem registro operacional e solicita importacao.'),
  ('EXPEDICAO', 'Expedicao', 'Registra entregas e programa previsoes de entrega.'),
  ('RESPONSAVEL_SISTEMA', 'Responsavel pelo Sistema', 'Administra cadastros, usuarios, setores e perfis.'),
  ('RESPONSAVEL_TECNICO', 'Responsavel Tecnico', 'Monitora integracao, jobs e logs.');

INSERT INTO unidade_medida (codigo, codigo_normalizado, nome, escala, casas_decimais) VALUES
  ('UN', 'UN', 'Unidade', 'INTEIRA', 0),
  ('PC', 'PC', 'Peca', 'INTEIRA', 0),
  ('M',  'M',  'Metro', 'DECIMAL', 2),
  ('M2', 'M2', 'Metro quadrado', 'DECIMAL', 2),
  ('KG', 'KG', 'Quilograma', 'DECIMAL', 3);

-- ============================================================================
-- 6. VIEWS DERIVADAS (SALDOS, ANDAMENTO, FILA, PEDIDO, DIVERGENCIAS)
-- ============================================================================
-- As views usam subconsultas agregadas SEPARADAS por fato (apontamento,
-- entrega, ocorrencia). Isso evita multiplicar somas ao juntar N apontamentos
-- com M entregas do mesmo item. Nenhuma view grava dado.

-- 6.1 Saldos por item.
CREATE VIEW vw_item_saldos AS
SELECT
  i.id_item_pedido,
  i.id_pedido,
  p.sistema_origem,
  p.empresa_origem,
  p.numero_origem,
  p.cliente_nome,
  i.vendedor_codigo_origem,
  i.seq_origem,
  i.codigo_produto_origem,
  i.descricao_item,
  i.categoria_origem,
  u.codigo AS unidade_codigo,
  u.escala AS unidade_escala,
  u.casas_decimais AS unidade_casas_decimais,
  i.quantidade_solicitada,
  COALESCE(a.qtd_executada, 0) AS quantidade_executada,
  COALESCE(e.qtd_entregue, 0) AS quantidade_entregue,
  COALESCE(o.qtd_perdida, 0) AS quantidade_perdida,
  COALESCE(o.qtd_refugada, 0) AS quantidade_refugada,
  COALESCE(o.qtd_indisponivel, 0) AS quantidade_indisponivel,
  GREATEST(i.quantidade_solicitada - COALESCE(a.qtd_executada, 0), 0) AS saldo_executar,
  GREATEST(COALESCE(a.qtd_executada, 0) - COALESCE(e.qtd_entregue, 0), 0) AS disponivel_entrega,
  GREATEST(i.quantidade_solicitada - COALESCE(e.qtd_entregue, 0), 0) AS saldo_entregar,
  GREATEST(COALESCE(a.qtd_executada, 0) - i.quantidade_solicitada, 0) AS excedente_executado,
  GREATEST(COALESCE(e.qtd_entregue, 0) - i.quantidade_solicitada, 0) AS excedente_entregue,
  -- Formula historica da Revenda (RN031), exposta SEPARADAMENTE porque a
  -- inclusao de indisponibilidade no pendente ainda depende de LG-11/T00.4.
  CASE WHEN s.codigo = 'REVENDA' THEN
    GREATEST(i.quantidade_solicitada - COALESCE(a.qtd_executada, 0)
             - COALESCE(o.qtd_indisponivel, 0), 0)
  END AS saldo_revenda_rn031,
  CASE s.codigo
    WHEN 'CORTE_DOBRA' THEN 'PRODUZIR'
    WHEN 'TELHAS' THEN 'PRODUZIR'
    WHEN 'REVENDA' THEN 'SEPARAR'
    WHEN 'EXPEDICAO' THEN 'PREPARAR'
    ELSE 'EXECUTAR'
  END AS rotulo_execucao,
  i.id_setor_destino,
  s.codigo AS setor_destino_codigo,
  s.nome AS setor_destino_nome,
  i.prioridade_fila,
  i.prazo_entrega,
  i.prazo_operacional,
  i.cancelado AS item_cancelado,
  (i.id_setor_destino IS NULL) AS item_sem_setor,
  EXISTS (
    SELECT 1 FROM entrega ex
    WHERE ex.id_item_pedido = i.id_item_pedido
      AND ex.anulado_em IS NULL
      AND ex.excecao_autorizada = 1
  ) AS possui_entrega_com_excecao,
  (COALESCE(e.qtd_entregue, 0) > COALESCE(a.qtd_executada, 0)) AS entrega_excede_execucao,
  (
    COALESCE(e.qtd_entregue, 0) > COALESCE(a.qtd_executada, 0)
    AND NOT EXISTS (
      SELECT 1 FROM entrega ex2
      WHERE ex2.id_item_pedido = i.id_item_pedido
        AND ex2.anulado_em IS NULL
        AND ex2.excecao_autorizada = 1
    )
  ) AS entrega_inconsistente,
  i.criado_em
FROM pedido_item i
JOIN pedido p ON p.id_pedido = i.id_pedido
JOIN unidade_medida u ON u.id_unidade = i.id_unidade_medida
LEFT JOIN setor s ON s.id_setor = i.id_setor_destino
LEFT JOIN (
  SELECT id_item_pedido, SUM(quantidade_executada) AS qtd_executada
  FROM apontamento
  WHERE anulado_em IS NULL
  GROUP BY id_item_pedido
) a ON a.id_item_pedido = i.id_item_pedido
LEFT JOIN (
  SELECT id_item_pedido, SUM(quantidade_entregue) AS qtd_entregue
  FROM entrega
  WHERE anulado_em IS NULL
  GROUP BY id_item_pedido
) e ON e.id_item_pedido = i.id_item_pedido
LEFT JOIN (
  SELECT
    id_item_pedido,
    SUM(CASE WHEN tipo = 'PERDA' THEN quantidade ELSE 0 END) AS qtd_perdida,
    SUM(CASE WHEN tipo = 'REFUGO' THEN quantidade ELSE 0 END) AS qtd_refugada,
    SUM(CASE WHEN tipo = 'INDISPONIBILIDADE' THEN quantidade ELSE 0 END) AS qtd_indisponivel
  FROM ocorrencia
  WHERE anulado_em IS NULL
  GROUP BY id_item_pedido
) o ON o.id_item_pedido = i.id_item_pedido;

-- 6.2 Andamento derivado: execucao, entrega e atendimento sao eixos distintos.
-- Nao ha um unico "status" que apague informacao. `exige_atencao` sinaliza
-- excedentes, entrega inconsistente e divergencia aberta.
CREATE VIEW vw_item_andamento AS
SELECT
  q.*,
  CASE
    WHEN q.quantidade_executada = 0 THEN 'NAO_INICIADA'
    WHEN q.quantidade_executada > q.quantidade_solicitada THEN 'CONCLUIDA_COM_EXCEDENTE'
    WHEN q.quantidade_executada = q.quantidade_solicitada THEN 'CONCLUIDA_TOTAL'
    ELSE 'CONCLUIDA_PARCIAL'
  END AS situacao_execucao,
  CASE
    WHEN q.quantidade_entregue = 0 THEN 'NAO_ENTREGUE'
    WHEN q.quantidade_entregue > q.quantidade_executada
         AND q.possui_entrega_com_excecao = 1 THEN 'ENTREGUE_COM_EXCECAO_AUTORIZADA'
    WHEN q.quantidade_entregue > q.quantidade_executada THEN 'ENTREGA_INCONSISTENTE'
    WHEN q.quantidade_entregue < q.quantidade_executada THEN 'ENTREGUE_PARCIAL'
    ELSE 'ENTREGUE_TOTAL'
  END AS situacao_entrega,
  CASE
    WHEN q.quantidade_entregue >= q.quantidade_solicitada THEN 'ATENDIDO'
    WHEN q.quantidade_entregue > 0 THEN 'ATENDIDO_PARCIAL'
    ELSE 'NAO_ATENDIDO'
  END AS situacao_atendimento,
  CASE
    WHEN q.prazo_entrega IS NULL THEN 'SEM_PRAZO'
    WHEN q.prazo_entrega < DATE(UTC_TIMESTAMP() - INTERVAL 3 HOUR)
         AND q.quantidade_entregue < q.quantidade_solicitada THEN 'ATRASADO'
    ELSE 'EM_DIA'
  END AS situacao_prazo_entrega,
  CASE
    WHEN q.prazo_operacional IS NULL THEN 'SEM_PRAZO'
    WHEN q.prazo_operacional < DATE(UTC_TIMESTAMP() - INTERVAL 3 HOUR)
         AND q.quantidade_executada < q.quantidade_solicitada THEN 'ATRASADO'
    ELSE 'EM_DIA'
  END AS situacao_prazo_operacional,
  EXISTS (
    SELECT 1 FROM divergencia d
    WHERE d.id_item_pedido = q.id_item_pedido
      AND d.situacao IN ('ABERTA','EM_ANALISE')
  ) AS possui_divergencia_aberta,
  (
    q.excedente_executado > 0
    OR q.entrega_inconsistente = 1
    OR q.excedente_entregue > 0
    OR EXISTS (
      SELECT 1 FROM divergencia d2
      WHERE d2.id_item_pedido = q.id_item_pedido
        AND d2.situacao IN ('ABERTA','EM_ANALISE')
    )
  ) AS exige_atencao
FROM vw_item_saldos q;

-- 6.3 Fila operacional por setor (itens ainda nao executados e nao cancelados).
CREATE VIEW vw_fila_setor AS
SELECT
  a.id_item_pedido,
  a.id_pedido,
  a.numero_origem,
  a.cliente_nome,
  a.seq_origem,
  a.codigo_produto_origem,
  a.descricao_item,
  a.unidade_codigo,
  a.quantidade_solicitada,
  a.quantidade_executada,
  a.saldo_executar,
  a.rotulo_execucao,
  a.id_setor_destino,
  a.setor_destino_codigo,
  a.setor_destino_nome,
  a.prioridade_fila,
  a.prazo_operacional,
  a.situacao_execucao,
  a.situacao_prazo_operacional,
  a.possui_divergencia_aberta,
  a.exige_atencao,
  a.criado_em
FROM vw_item_andamento a
WHERE a.id_setor_destino IS NOT NULL
  AND a.item_cancelado = 0
  AND a.quantidade_executada < a.quantidade_solicitada;

-- 6.4 Resumo do pedido por CONTAGENS (nunca soma quantidades de unidades
-- diferentes). Nao substitui a decisao final de status do pedido (LG-05):
-- expoe os fatos e booleanos derivados.
CREATE VIEW vw_pedido_resumo AS
SELECT
  p.id_pedido,
  p.sistema_origem,
  p.empresa_origem,
  p.numero_origem,
  p.cliente_nome,
  p.vendedor_codigo,
  p.data_orcamento,
  p.importado_em,
  p.sincronizado_em,
  COUNT(i.id_item_pedido) AS total_itens,
  COALESCE(SUM(i.cancelado = 0), 0) AS itens_ativos,
  COALESCE(SUM(i.cancelado = 1), 0) AS itens_cancelados,
  COALESCE(SUM(i.cancelado = 0 AND i.id_setor_destino IS NULL), 0) AS itens_nao_classificados,
  COALESCE(SUM(i.cancelado = 0 AND a.situacao_execucao IN ('CONCLUIDA_TOTAL','CONCLUIDA_COM_EXCEDENTE')), 0) AS itens_execucao_concluida,
  COALESCE(SUM(i.cancelado = 0 AND a.situacao_entrega IN ('ENTREGUE_TOTAL','ENTREGUE_COM_EXCECAO_AUTORIZADA')), 0) AS itens_entrega_concluida,
  COALESCE(SUM(i.cancelado = 0 AND a.situacao_atendimento = 'ATENDIDO'), 0) AS itens_atendidos,
  COALESCE(SUM(i.cancelado = 0 AND a.possui_divergencia_aberta = 1), 0) AS itens_com_divergencia,
  COALESCE(SUM(i.cancelado = 0 AND a.situacao_prazo_entrega = 'ATRASADO'), 0) AS itens_atrasados,
  (
    COALESCE(SUM(i.cancelado = 0), 0) > 0
    AND COALESCE(SUM(i.cancelado = 0 AND i.id_setor_destino IS NULL), 0) = 0
    AND COALESCE(SUM(i.cancelado = 0 AND a.situacao_execucao IN ('CONCLUIDA_TOTAL','CONCLUIDA_COM_EXCEDENTE')), 0)
        = COALESCE(SUM(i.cancelado = 0), 0)
  ) AS todos_itens_executados,
  (
    COALESCE(SUM(i.cancelado = 0), 0) > 0
    AND COALESCE(SUM(i.cancelado = 0 AND a.situacao_atendimento = 'ATENDIDO'), 0)
        = COALESCE(SUM(i.cancelado = 0), 0)
  ) AS todos_itens_atendidos
FROM pedido p
LEFT JOIN pedido_item i ON i.id_pedido = p.id_pedido
LEFT JOIN vw_item_andamento a ON a.id_item_pedido = i.id_item_pedido
GROUP BY
  p.id_pedido, p.sistema_origem, p.empresa_origem, p.numero_origem,
  p.cliente_nome, p.vendedor_codigo, p.data_orcamento, p.importado_em, p.sincronizado_em;

-- 6.5 Divergencias abertas/em analise, com contexto do item/pedido.
CREATE VIEW vw_divergencia_aberta AS
SELECT
  d.id_divergencia,
  d.id_item_pedido,
  d.id_job,
  d.tipo,
  d.situacao,
  d.chave_idempotencia,
  d.valores_antes,
  d.valores_depois,
  d.descricao,
  d.aberta_em,
  d.resolvida_em,
  d.resolvida_por,
  p.id_pedido,
  p.numero_origem,
  p.empresa_origem,
  i.seq_origem,
  i.vendedor_codigo_origem,
  i.descricao_item
FROM divergencia d
JOIN pedido_item i ON i.id_item_pedido = d.id_item_pedido
JOIN pedido p ON p.id_pedido = i.id_pedido
WHERE d.situacao IN ('ABERTA','EM_ANALISE');

-- 6.6 Previsoes de entrega ativas (a "remessa" como previsao, nao realizado).
CREATE VIEW vw_entrega_prevista AS
SELECT
  ep.id_entrega_prevista,
  ep.id_item_pedido,
  p.id_pedido,
  p.numero_origem,
  p.empresa_origem,
  i.seq_origem,
  i.descricao_item,
  i.id_setor_destino,
  ep.numero_remessa,
  ep.data_prevista,
  ep.quantidade_prevista,
  ep.confirmada_em,
  ep.confirmada_por,
  ep.criado_por,
  ep.criado_em,
  ep.anulada_em
FROM entrega_prevista ep
JOIN pedido_item i ON i.id_item_pedido = ep.id_item_pedido
JOIN pedido p ON p.id_pedido = i.id_pedido
WHERE ep.anulada_em IS NULL;

-- ============================================================================
-- 7. PROCEDURES DE ESCRITA CRITICA (TRANSACAO + LOCK + IDEMPOTENCIA)
-- ============================================================================
-- As procedures abaixo sao o caminho canonico para as operacoes que dependem
-- de soma entre varias linhas. Elas:
--   * abrem a propria transacao;
--   * bloqueiam o item com SELECT ... FOR UPDATE (mesma ordem em todas);
--   * validam idempotencia pela chave;
--   * gravam e confirmam, ou fazem ROLLBACK e propagam o erro.
--
-- LIMITACAO CONSCIA: se a aplicacao chamar a procedure dentro de uma transacao
-- externa, o START TRANSACTION interno faz commit implicito da transacao
-- externa. Chame as procedures FORA de transacao explicita ou use o protocolo
-- documentado em 07_LEIA_PRIMEIRO.md com SQL direto + FOR UPDATE. A aplicacao
-- nunca deve misturar as duas formas na mesma operacao.
-- ============================================================================

DELIMITER $$

-- 7.1 Registrar apontamento (execucao/separencia).
CREATE PROCEDURE sp_registrar_apontamento(
  IN  p_id_item BIGINT UNSIGNED,
  IN  p_id_usuario_executor BIGINT UNSIGNED,
  IN  p_id_usuario_registro BIGINT UNSIGNED,
  IN  p_chave_idempotencia VARCHAR(100),
  IN  p_quantidade DECIMAL(18,3),
  IN  p_iniciado_em DATETIME(6),
  IN  p_finalizado_em DATETIME(6),
  IN  p_observacoes TEXT,
  OUT p_id_apontamento BIGINT UNSIGNED,
  OUT p_resultado VARCHAR(30)
)
MODIFIES SQL DATA
BEGIN
  DECLARE v_cancelado TINYINT;
  DECLARE v_id_setor BIGINT UNSIGNED;
  DECLARE v_id_unidade BIGINT UNSIGNED;
  DECLARE v_casas TINYINT UNSIGNED;
  DECLARE v_existente_id BIGINT UNSIGNED;
  DECLARE v_existente_qtd DECIMAL(18,3);
  DECLARE v_existente_item BIGINT UNSIGNED;
  DECLARE v_existente_exec BIGINT UNSIGNED;
  DECLARE v_existente_reg BIGINT UNSIGNED;
  DECLARE v_existente_inicio DATETIME(6);
  DECLARE v_existente_fim DATETIME(6);
  DECLARE v_existente_obs TEXT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_id_apontamento = NULL;
  SET p_resultado = 'ERRO';
  SET v_cancelado = NULL;
  SET v_id_setor = NULL;
  SET v_id_unidade = NULL;
  SET v_casas = NULL;
  SET v_existente_id = NULL;
  SET v_existente_item = NULL;
  SET v_existente_exec = NULL;
  SET v_existente_reg = NULL;
  SET v_existente_inicio = NULL;
  SET v_existente_fim = NULL;
  SET v_existente_obs = NULL;

  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'quantidade_executada deve ser maior que zero';
  END IF;
  IF p_chave_idempotencia IS NULL OR CHAR_LENGTH(TRIM(p_chave_idempotencia)) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'chave_idempotencia obrigatoria';
  END IF;

  START TRANSACTION;

  SELECT cancelado, id_setor_destino, id_unidade_medida
    INTO v_cancelado, v_id_setor, v_id_unidade
    FROM pedido_item
   WHERE id_item_pedido = p_id_item
   FOR UPDATE;

  IF v_cancelado IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'item inexistente';
  END IF;
  IF v_cancelado = 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'item cancelado nao aceita apontamento';
  END IF;
  IF v_id_setor IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'item sem setor de destino';
  END IF;

  SELECT casas_decimais INTO v_casas
    FROM unidade_medida
   WHERE id_unidade = v_id_unidade;

  IF p_quantidade <> ROUND(p_quantidade, v_casas) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'quantidade incompativel com as casas decimais da unidade do item';
  END IF;

  SELECT id_apontamento, quantidade_executada, id_item_pedido,
         id_usuario_executor, id_usuario_registro,
         iniciado_em, finalizado_em, observacoes
    INTO v_existente_id, v_existente_qtd, v_existente_item,
         v_existente_exec, v_existente_reg,
         v_existente_inicio, v_existente_fim, v_existente_obs
    FROM apontamento
   WHERE chave_idempotencia = p_chave_idempotencia
   FOR UPDATE;

  IF v_existente_id IS NOT NULL THEN
    IF v_existente_item = p_id_item
       AND v_existente_qtd = p_quantidade
       AND v_existente_exec = p_id_usuario_executor
       AND v_existente_reg = p_id_usuario_registro
       AND v_existente_inicio <=> p_iniciado_em
       AND v_existente_fim <=> p_finalizado_em
       AND v_existente_obs <=> p_observacoes THEN
      SET p_id_apontamento = v_existente_id;
      SET p_resultado = 'JA_EXISTE';
      COMMIT;
    ELSE
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'chave_idempotencia reutilizada com conteudo diferente';
    END IF;
  ELSE
    INSERT INTO apontamento (
      id_item_pedido, id_usuario_executor, id_usuario_registro,
      chave_idempotencia, quantidade_executada, iniciado_em, finalizado_em,
      observacoes
    ) VALUES (
      p_id_item, p_id_usuario_executor, p_id_usuario_registro,
      p_chave_idempotencia, p_quantidade, p_iniciado_em, p_finalizado_em,
      p_observacoes
    );
    SET p_id_apontamento = LAST_INSERT_ID();
    SET p_resultado = 'INSERIDO';
    COMMIT;
  END IF;
END$$

-- 7.2 Anular apontamento (logico). Nao apaga a linha original.
CREATE PROCEDURE sp_anular_apontamento(
  IN  p_id_apontamento BIGINT UNSIGNED,
  IN  p_id_usuario BIGINT UNSIGNED,
  IN  p_motivo VARCHAR(500),
  IN  p_anulado_em DATETIME(6),
  OUT p_resultado VARCHAR(30)
)
MODIFIES SQL DATA
BEGIN
  DECLARE v_id_item BIGINT UNSIGNED;
  DECLARE v_anulado_em DATETIME(6);
  DECLARE v_qtd DECIMAL(18,3);
  DECLARE v_exec_depois DECIMAL(18,3);
  DECLARE v_entregue DECIMAL(18,3);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_resultado = 'ERRO';
  SET v_id_item = NULL;
  SET v_anulado_em = NULL;

  IF p_motivo IS NULL OR CHAR_LENGTH(TRIM(p_motivo)) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'motivo_anulacao obrigatorio';
  END IF;

  SELECT id_item_pedido INTO v_id_item
    FROM apontamento
   WHERE id_apontamento = p_id_apontamento;

  IF v_id_item IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'apontamento inexistente';
  END IF;

  START TRANSACTION;

  -- Ordem de lock: item -> apontamento (igual as demais procedures).
  SELECT id_item_pedido INTO v_id_item
    FROM pedido_item
   WHERE id_item_pedido = v_id_item
   FOR UPDATE;

  SELECT anulado_em, quantidade_executada INTO v_anulado_em, v_qtd
    FROM apontamento
   WHERE id_apontamento = p_id_apontamento
   FOR UPDATE;

  IF v_anulado_em IS NOT NULL THEN
    SET p_resultado = 'JA_ANULADO';
    COMMIT;
  ELSE
    SELECT COALESCE(SUM(quantidade_executada), 0) INTO v_exec_depois
      FROM apontamento
     WHERE id_item_pedido = v_id_item
       AND anulado_em IS NULL
       AND id_apontamento <> p_id_apontamento;

    SELECT COALESCE(SUM(quantidade_entregue), 0) INTO v_entregue
      FROM entrega
     WHERE id_item_pedido = v_id_item
       AND anulado_em IS NULL;

    IF v_entregue > v_exec_depois THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'anulacao deixaria quantidade entregue maior que a executada';
    END IF;

    SET v_anulado_em = COALESCE(p_anulado_em, UTC_TIMESTAMP(6));

    UPDATE apontamento
       SET anulado_em = v_anulado_em,
           anulado_por = p_id_usuario,
           motivo_anulacao = p_motivo
     WHERE id_apontamento = p_id_apontamento
       AND anulado_em IS NULL;

    INSERT INTO logs_auditoria (
      id_usuario, acao, entidade_tipo, entidade_id,
      antes_json, depois_json, motivo, correlacao_id, criado_em
    ) VALUES (
      p_id_usuario, 'APONTAMENTO_ANULADO', 'apontamento', p_id_apontamento,
      JSON_OBJECT('anulado_em', NULL, 'quantidade_executada', v_qtd),
      JSON_OBJECT('anulado_em', v_anulado_em, 'motivo_anulacao', p_motivo),
      p_motivo, UUID(), UTC_TIMESTAMP(6)
    );

    SET p_resultado = 'ANULADO';
    COMMIT;
  END IF;
END$$

-- 7.3 Registrar entrega (com bloqueio de disponibilidade e excecao gerencial).
CREATE PROCEDURE sp_registrar_entrega(
  IN  p_id_item BIGINT UNSIGNED,
  IN  p_id_usuario_registro BIGINT UNSIGNED,
  IN  p_chave_idempotencia VARCHAR(100),
  IN  p_quantidade DECIMAL(18,3),
  IN  p_entregue_em DATETIME(6),
  IN  p_comprovante_referencia VARCHAR(200),
  IN  p_observacoes TEXT,
  IN  p_excecao_autorizada BOOLEAN,
  IN  p_motivo_excecao VARCHAR(500),
  IN  p_autorizado_por BIGINT UNSIGNED,
  OUT p_id_entrega BIGINT UNSIGNED,
  OUT p_resultado VARCHAR(30)
)
MODIFIES SQL DATA
BEGIN
  DECLARE v_cancelado TINYINT;
  DECLARE v_id_setor BIGINT UNSIGNED;
  DECLARE v_id_unidade BIGINT UNSIGNED;
  DECLARE v_casas TINYINT UNSIGNED;
  DECLARE v_existente_id BIGINT UNSIGNED;
  DECLARE v_existente_qtd DECIMAL(18,3);
  DECLARE v_existente_item BIGINT UNSIGNED;
  DECLARE v_existente_reg BIGINT UNSIGNED;
  DECLARE v_existente_exc TINYINT;
  DECLARE v_existente_em DATETIME(6);
  DECLARE v_existente_motivo VARCHAR(500);
  DECLARE v_existente_autorizador BIGINT UNSIGNED;
  DECLARE v_existente_comprovante VARCHAR(200);
  DECLARE v_existente_obs TEXT;
  DECLARE v_executado DECIMAL(18,3);
  DECLARE v_entregue DECIMAL(18,3);
  DECLARE v_disponivel DECIMAL(18,3);
  DECLARE v_disponivel_antes DECIMAL(18,3);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_id_entrega = NULL;
  SET p_resultado = 'ERRO';
  SET v_cancelado = NULL;
  SET v_id_setor = NULL;
  SET v_id_unidade = NULL;
  SET v_casas = NULL;
  SET v_existente_id = NULL;
  SET v_existente_em = NULL;
  SET v_existente_motivo = NULL;
  SET v_existente_autorizador = NULL;
  SET v_existente_comprovante = NULL;
  SET v_existente_obs = NULL;
  SET v_disponivel_antes = NULL;

  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'quantidade_entregue deve ser maior que zero';
  END IF;
  IF p_entregue_em IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'entregue_em obrigatorio';
  END IF;
  IF p_chave_idempotencia IS NULL OR CHAR_LENGTH(TRIM(p_chave_idempotencia)) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'chave_idempotencia obrigatoria';
  END IF;
  IF p_excecao_autorizada IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'excecao_autorizada obrigatoria (0 ou 1)';
  END IF;
  IF p_excecao_autorizada = 0
     AND (p_motivo_excecao IS NOT NULL OR p_autorizado_por IS NOT NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'dados de excecao informados sem excecao_autorizada';
  END IF;
  IF p_excecao_autorizada = 1
     AND (p_motivo_excecao IS NULL OR CHAR_LENGTH(TRIM(p_motivo_excecao)) = 0
          OR p_autorizado_por IS NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'excecao exige motivo e autorizador';
  END IF;

  START TRANSACTION;

  SELECT cancelado, id_setor_destino, id_unidade_medida
    INTO v_cancelado, v_id_setor, v_id_unidade
    FROM pedido_item
   WHERE id_item_pedido = p_id_item
   FOR UPDATE;

  IF v_cancelado IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'item inexistente';
  END IF;
  IF v_cancelado = 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'item cancelado nao aceita entrega';
  END IF;
  IF v_id_setor IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'item sem setor de destino';
  END IF;

  SELECT casas_decimais INTO v_casas
    FROM unidade_medida
   WHERE id_unidade = v_id_unidade;

  IF p_quantidade <> ROUND(p_quantidade, v_casas) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'quantidade incompativel com as casas decimais da unidade do item';
  END IF;

  SELECT id_entrega, quantidade_entregue, id_item_pedido,
         id_usuario_registro, excecao_autorizada,
         entregue_em, motivo_excecao, autorizado_por,
         comprovante_referencia, observacoes
    INTO v_existente_id, v_existente_qtd, v_existente_item,
         v_existente_reg, v_existente_exc,
         v_existente_em, v_existente_motivo, v_existente_autorizador,
         v_existente_comprovante, v_existente_obs
    FROM entrega
   WHERE chave_idempotencia = p_chave_idempotencia
   FOR UPDATE;

  IF v_existente_id IS NOT NULL THEN
    IF v_existente_item = p_id_item
       AND v_existente_qtd = p_quantidade
       AND v_existente_reg = p_id_usuario_registro
       AND v_existente_exc = p_excecao_autorizada
       AND v_existente_em <=> p_entregue_em
       AND v_existente_motivo <=> p_motivo_excecao
       AND v_existente_autorizador <=> p_autorizado_por
       AND v_existente_comprovante <=> p_comprovante_referencia
       AND v_existente_obs <=> p_observacoes THEN
      SET p_id_entrega = v_existente_id;
      SET p_resultado = 'JA_EXISTE';
      COMMIT;
    ELSE
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'chave_idempotencia reutilizada com conteudo diferente';
    END IF;
  ELSE
    SELECT COALESCE(SUM(quantidade_executada), 0) INTO v_executado
      FROM apontamento
     WHERE id_item_pedido = p_id_item
       AND anulado_em IS NULL;

    SELECT COALESCE(SUM(quantidade_entregue), 0) INTO v_entregue
      FROM entrega
     WHERE id_item_pedido = p_id_item
       AND anulado_em IS NULL;

    SET v_disponivel = v_executado - v_entregue;

    IF p_quantidade > v_disponivel THEN
      IF p_excecao_autorizada = 0 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'quantidade entregue acima do disponivel sem autorizacao';
      END IF;
    END IF;

    IF p_excecao_autorizada = 1 THEN
      SET v_disponivel_antes = v_disponivel;
    END IF;

    INSERT INTO entrega (
      id_item_pedido, id_usuario_registro, chave_idempotencia,
      quantidade_entregue, entregue_em, comprovante_referencia, observacoes,
      excecao_autorizada, motivo_excecao, autorizado_por, disponivel_antes
    ) VALUES (
      p_id_item, p_id_usuario_registro, p_chave_idempotencia,
      p_quantidade, p_entregue_em, p_comprovante_referencia, p_observacoes,
      p_excecao_autorizada, p_motivo_excecao, p_autorizado_por, v_disponivel_antes
    );
    SET p_id_entrega = LAST_INSERT_ID();

    IF p_excecao_autorizada = 1 THEN
      INSERT INTO logs_auditoria (
        id_usuario, acao, entidade_tipo, entidade_id,
        antes_json, depois_json, motivo, correlacao_id, criado_em
      ) VALUES (
        p_id_usuario_registro, 'ENTREGA_COM_EXCECAO', 'entrega', p_id_entrega,
        JSON_OBJECT('id_item_pedido', p_id_item,
                    'quantidade_entregue', p_quantidade,
                    'disponivel_antes', v_disponivel_antes),
        JSON_OBJECT('autorizado_por', p_autorizado_por,
                    'motivo_excecao', p_motivo_excecao),
        p_motivo_excecao, UUID(), UTC_TIMESTAMP(6)
      );
    END IF;

    SET p_resultado = 'INSERIDO';
    COMMIT;
  END IF;
END$$

-- 7.4 Anular entrega (logico).
CREATE PROCEDURE sp_anular_entrega(
  IN  p_id_entrega BIGINT UNSIGNED,
  IN  p_id_usuario BIGINT UNSIGNED,
  IN  p_motivo VARCHAR(500),
  IN  p_anulado_em DATETIME(6),
  OUT p_resultado VARCHAR(30)
)
MODIFIES SQL DATA
BEGIN
  DECLARE v_id_item BIGINT UNSIGNED;
  DECLARE v_anulado_em DATETIME(6);
  DECLARE v_qtd DECIMAL(18,3);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_resultado = 'ERRO';
  SET v_id_item = NULL;
  SET v_anulado_em = NULL;
  SET v_qtd = NULL;

  IF p_motivo IS NULL OR CHAR_LENGTH(TRIM(p_motivo)) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'motivo_anulacao obrigatorio';
  END IF;

  SELECT id_item_pedido INTO v_id_item
    FROM entrega
   WHERE id_entrega = p_id_entrega;

  IF v_id_item IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'entrega inexistente';
  END IF;

  START TRANSACTION;

  SELECT id_item_pedido INTO v_id_item
    FROM pedido_item
   WHERE id_item_pedido = v_id_item
   FOR UPDATE;

  SELECT anulado_em, quantidade_entregue INTO v_anulado_em, v_qtd
    FROM entrega
   WHERE id_entrega = p_id_entrega
   FOR UPDATE;

  IF v_anulado_em IS NOT NULL THEN
    SET p_resultado = 'JA_ANULADA';
    COMMIT;
  ELSE
    SET v_anulado_em = COALESCE(p_anulado_em, UTC_TIMESTAMP(6));

    UPDATE entrega
       SET anulado_em = v_anulado_em,
           anulado_por = p_id_usuario,
           motivo_anulacao = p_motivo
     WHERE id_entrega = p_id_entrega
       AND anulado_em IS NULL;

    INSERT INTO logs_auditoria (
      id_usuario, acao, entidade_tipo, entidade_id,
      antes_json, depois_json, motivo, correlacao_id, criado_em
    ) VALUES (
      p_id_usuario, 'ENTREGA_ANULADA', 'entrega', p_id_entrega,
      JSON_OBJECT('anulado_em', NULL, 'quantidade_entregue', v_qtd),
      JSON_OBJECT('anulado_em', v_anulado_em, 'motivo_anulacao', p_motivo),
      p_motivo, UUID(), UTC_TIMESTAMP(6)
    );

    SET p_resultado = 'ANULADA';
    COMMIT;
  END IF;
END$$

-- 7.5 Definir/corrigir o setor de destino do item.
-- Regra: correcao somente sem QUALQUER registro operacional (apontamento,
-- ocorrencia ou entrega); previsao de entrega NAO bloqueia (T-08). O motivo
-- e gravado quando informado; a exigencia por perfil (vendedor x gerente)
-- permanece na aplicacao. A auditoria guarda setor antes/depois com codigo e
-- nome para sobreviver a renomeacoes.
CREATE PROCEDURE sp_definir_setor_item(
  IN  p_id_item BIGINT UNSIGNED,
  IN  p_id_setor BIGINT UNSIGNED,
  IN  p_id_usuario BIGINT UNSIGNED,
  IN  p_motivo VARCHAR(500),
  OUT p_resultado VARCHAR(30)
)
MODIFIES SQL DATA
BEGIN
  DECLARE v_cancelado TINYINT;
  DECLARE v_setor_atual BIGINT UNSIGNED;
  DECLARE v_codigo_atual VARCHAR(30);
  DECLARE v_nome_atual VARCHAR(100);
  DECLARE v_codigo_novo VARCHAR(30);
  DECLARE v_nome_novo VARCHAR(100);
  DECLARE v_tem_operacao INT DEFAULT 0;
  DECLARE v_acao VARCHAR(60);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_resultado = 'ERRO';
  SET v_codigo_atual = NULL;
  SET v_nome_atual = NULL;
  SET v_cancelado = NULL;
  SET v_setor_atual = NULL;

  START TRANSACTION;

  SELECT cancelado, id_setor_destino
    INTO v_cancelado, v_setor_atual
    FROM pedido_item
   WHERE id_item_pedido = p_id_item
   FOR UPDATE;

  IF v_cancelado IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'item inexistente';
  END IF;
  IF v_cancelado = 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'item cancelado nao aceita classificacao';
  END IF;

  SELECT codigo, nome INTO v_codigo_novo, v_nome_novo
    FROM setor
   WHERE id_setor = p_id_setor AND ativo = 1;

  IF v_codigo_novo IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'setor inexistente ou inativo';
  END IF;

  IF v_setor_atual = p_id_setor THEN
    SET p_resultado = 'SEM_ALTERACAO';
    COMMIT;
  ELSE
    SELECT
      (SELECT COUNT(*) FROM apontamento WHERE id_item_pedido = p_id_item)
      + (SELECT COUNT(*) FROM ocorrencia WHERE id_item_pedido = p_id_item)
      + (SELECT COUNT(*) FROM entrega WHERE id_item_pedido = p_id_item)
      INTO v_tem_operacao;

    IF v_tem_operacao > 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'item com registro operacional nao permite correcao de setor';
    END IF;

    IF v_setor_atual IS NOT NULL THEN
      SELECT codigo, nome INTO v_codigo_atual, v_nome_atual
        FROM setor
       WHERE id_setor = v_setor_atual;
      SET v_acao = 'SETOR_CORRIGIDO';
    ELSE
      SET v_acao = 'ITEM_CLASSIFICADO';
    END IF;

    UPDATE pedido_item
       SET id_setor_destino = p_id_setor,
           classificado_em = UTC_TIMESTAMP(6),
           classificado_por = p_id_usuario
     WHERE id_item_pedido = p_id_item;

    INSERT INTO logs_auditoria (
      id_usuario, acao, entidade_tipo, entidade_id,
      antes_json, depois_json, motivo, correlacao_id, criado_em
    ) VALUES (
      p_id_usuario, v_acao, 'pedido_item', p_id_item,
      JSON_OBJECT('id_setor', v_setor_atual, 'codigo', v_codigo_atual, 'nome', v_nome_atual),
      JSON_OBJECT('id_setor', p_id_setor, 'codigo', v_codigo_novo, 'nome', v_nome_novo),
      p_motivo, UUID(), UTC_TIMESTAMP(6)
    );

    SET p_resultado = 'ALTERADO';
    COMMIT;
  END IF;
END$$

DELIMITER ;

-- ============================================================================
-- 8. CONSULTAS DE CONFERENCIA (NAO SAO REGRAS)
-- ============================================================================
-- Andamento por item:
--   SELECT * FROM vw_item_andamento ORDER BY numero_origem, seq_origem;
-- Fila de um setor:
--   SELECT * FROM vw_fila_setor WHERE setor_destino_codigo = 'CORTE_DOBRA';
-- Resumo por pedido:
--   SELECT * FROM vw_pedido_resumo ORDER BY numero_origem;
-- Divergencias abertas:
--   SELECT * FROM vw_divergencia_aberta;
-- Previsoes de entrega:
--   SELECT * FROM vw_entrega_prevista ORDER BY data_prevista;

-- Fim do script.
