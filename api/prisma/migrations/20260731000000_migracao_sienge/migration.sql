-- Identificadores de origem tornam a importacao reexecutavel sem duplicar dados.
ALTER TABLE "clientes" ADD COLUMN "origemSiengeId" TEXT;
ALTER TABLE "loteamentos" ADD COLUMN "origemSiengeId" TEXT;
ALTER TABLE "lotes" ADD COLUMN "origemSiengeId" TEXT;
ALTER TABLE "contratos" ADD COLUMN "origemSiengeId" TEXT;
ALTER TABLE "parcelas" ADD COLUMN "origemSiengeId" TEXT;
ALTER TABLE "pagamentos" ADD COLUMN "origemSiengeId" TEXT;

CREATE UNIQUE INDEX "clientes_origemSiengeId_key" ON "clientes"("origemSiengeId");
CREATE UNIQUE INDEX "loteamentos_origemSiengeId_key" ON "loteamentos"("origemSiengeId");
CREATE UNIQUE INDEX "lotes_origemSiengeId_key" ON "lotes"("origemSiengeId");
CREATE UNIQUE INDEX "contratos_origemSiengeId_key" ON "contratos"("origemSiengeId");
CREATE UNIQUE INDEX "parcelas_origemSiengeId_key" ON "parcelas"("origemSiengeId");
CREATE UNIQUE INDEX "pagamentos_origemSiengeId_key" ON "pagamentos"("origemSiengeId");

CREATE TYPE "StatusImportacaoSienge" AS ENUM ('PREVIA', 'EXECUTANDO', 'CONCLUIDA', 'CONCLUIDA_COM_ERROS', 'FALHA');
CREATE TYPE "StatusRegistroImportacaoSienge" AS ENUM ('IMPORTADO', 'IGNORADO', 'ERRO');

CREATE TABLE "importacoes_sienge" (
    "id" TEXT NOT NULL,
    "arquivo" TEXT NOT NULL,
    "bancoOrigem" TEXT,
    "backupEm" TIMESTAMP(3),
    "status" "StatusImportacaoSienge" NOT NULL DEFAULT 'PREVIA',
    "iniciadaEm" TIMESTAMP(3),
    "finalizadaEm" TIMESTAMP(3),
    "totalLidos" INTEGER NOT NULL DEFAULT 0,
    "totalImportados" INTEGER NOT NULL DEFAULT 0,
    "totalIgnorados" INTEGER NOT NULL DEFAULT 0,
    "totalErros" INTEGER NOT NULL DEFAULT 0,
    "resumo" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "importacoes_sienge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "registros_importacao_sienge" (
    "id" TEXT NOT NULL,
    "importacaoId" TEXT NOT NULL,
    "tabela" TEXT NOT NULL,
    "chaveOrigem" TEXT NOT NULL,
    "entidade" TEXT,
    "idDestino" TEXT,
    "status" "StatusRegistroImportacaoSienge" NOT NULL,
    "mensagem" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "registros_importacao_sienge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "registros_importacao_sienge_importacaoId_fkey" FOREIGN KEY ("importacaoId") REFERENCES "importacoes_sienge"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "registros_importacao_sienge_importacaoId_tabela_chaveOrigem_key" ON "registros_importacao_sienge"("importacaoId", "tabela", "chaveOrigem");
CREATE INDEX "importacoes_sienge_status_criadoEm_idx" ON "importacoes_sienge"("status", "criadoEm");
CREATE INDEX "registros_importacao_sienge_tabela_status_idx" ON "registros_importacao_sienge"("tabela", "status");
