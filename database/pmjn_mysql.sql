-- =============================================================================
-- Módulo PMJN — Transparência e Prestação de Contas (MySQL / XAMPP)
-- Prefixo de tabelas e rotinas: pmjn
-- Execute no phpMyAdmin ou: mysql -u root -p < pmjn_mysql.sql
--
-- Alternativa com Prisma (recomendado para este projeto): crie só o banco vazio
-- `pmjn_transparencia`, copie .env.example para .env, depois:
--   npx prisma db push
--   npm run db:seed
-- Em seguida execute APENAS o bloco das funções (pmjnCalcularSaldo / pmjnValidarNF)
-- deste arquivo no MySQL, se quiser as rotinas no banco também.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS pmjn_transparencia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pmjn_transparencia;

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------

CREATE TABLE pmjn_usuario (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(200) NOT NULL,
  papel ENUM('GESTOR', 'AUDITOR') NOT NULL DEFAULT 'GESTOR',
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE pmjn_repasse (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  valor DECIMAL(15,2) NOT NULL,
  data_recebimento DATE NOT NULL,
  numero_ordem_bancaria VARCHAR(120) NOT NULL,
  extrato_caminho VARCHAR(500) NULL,
  observacoes TEXT NULL,
  usuario_id VARCHAR(191) NOT NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_repasse_usuario FOREIGN KEY (usuario_id) REFERENCES pmjn_usuario(id)
) ENGINE=InnoDB;

CREATE TABLE pmjn_categoria_despesa (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  ativa TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE pmjn_despesa (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  repasse_id VARCHAR(191) NOT NULL,
  categoria_id VARCHAR(191) NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data_despesa DATE NOT NULL,
  descricao TEXT NULL,
  nota_fiscal_caminho VARCHAR(500) NULL,
  comprovante_caminho VARCHAR(500) NULL,
  usuario_id VARCHAR(191) NOT NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_despesa_repasse FOREIGN KEY (repasse_id) REFERENCES pmjn_repasse(id),
  CONSTRAINT fk_despesa_categoria FOREIGN KEY (categoria_id) REFERENCES pmjn_categoria_despesa(id),
  CONSTRAINT fk_despesa_usuario FOREIGN KEY (usuario_id) REFERENCES pmjn_usuario(id)
) ENGINE=InnoDB;

CREATE TABLE pmjn_fechamento_mensal (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  ano INT NOT NULL,
  mes INT NOT NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  usuario_id VARCHAR(191) NOT NULL,
  CONSTRAINT fk_fechamento_usuario FOREIGN KEY (usuario_id) REFERENCES pmjn_usuario(id),
  CONSTRAINT uq_fechamento_ano_mes UNIQUE (ano, mes)
) ENGINE=InnoDB;

CREATE TABLE pmjn_log (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  mensagem TEXT NOT NULL,
  usuario_id VARCHAR(191) NULL,
  metadata JSON NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_log_usuario FOREIGN KEY (usuario_id) REFERENCES pmjn_usuario(id)
) ENGINE=InnoDB;

CREATE INDEX idx_despesa_repasse ON pmjn_despesa(repasse_id);
CREATE INDEX idx_repasse_data ON pmjn_repasse(data_recebimento);
CREATE INDEX idx_despesa_data ON pmjn_despesa(data_despesa);
CREATE INDEX idx_log_criado ON pmjn_log(criado_em);

-- -----------------------------------------------------------------------------
-- Função: saldo disponível de um repasse (recebido − despesas)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS pmjnCalcularSaldo;
DELIMITER //
CREATE FUNCTION pmjnCalcularSaldo(p_repasse_id VARCHAR(191))
RETURNS DECIMAL(15,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_recebido DECIMAL(15,2);
  DECLARE v_gasto DECIMAL(15,2);
  SELECT COALESCE(valor, 0) INTO v_recebido FROM pmjn_repasse WHERE id = p_repasse_id LIMIT 1;
  IF v_recebido IS NULL THEN
    RETURN 0;
  END IF;
  SELECT COALESCE(SUM(valor), 0) INTO v_gasto FROM pmjn_despesa WHERE repasse_id = p_repasse_id;
  RETURN v_recebido - v_gasto;
END//
DELIMITER ;

-- -----------------------------------------------------------------------------
-- Função: valida extensão de NF (PDF ou XML) — espelho da regra de negócio
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS pmjnValidarNF;
DELIMITER //
CREATE FUNCTION pmjnValidarNF(p_caminho VARCHAR(500))
RETURNS TINYINT(1)
DETERMINISTIC
NO SQL
BEGIN
  IF p_caminho IS NULL OR p_caminho = '' THEN
    RETURN 0;
  END IF;
  IF LOWER(p_caminho) REGEXP '\\.(pdf|xml)$' THEN
    RETURN 1;
  END IF;
  RETURN 0;
END//
DELIMITER ;

-- Usuários demo: após criar o banco, rode na pasta do projeto:
--   npx prisma db push
--   npm run db:seed
-- (gestor@hospital.local / gestor123 e auditor@prefeitura.local / auditor123)
