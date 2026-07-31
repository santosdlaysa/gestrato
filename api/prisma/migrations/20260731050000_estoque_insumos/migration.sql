CREATE TABLE "unidades_medida" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "nome" TEXT NOT NULL,
    "simbolo" TEXT NOT NULL,
    "grandeza" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "unidades_medida_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "unidades_medida_origemSiengeId_key" ON "unidades_medida"("origemSiengeId");
CREATE INDEX "unidades_medida_simbolo_idx" ON "unidades_medida"("simbolo");

CREATE TABLE "grupos_insumo" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "nome" TEXT NOT NULL,
    "referencia" TEXT,
    "tipoOrigem" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "grupos_insumo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "grupos_insumo_origemSiengeId_key" ON "grupos_insumo"("origemSiengeId");

CREATE TABLE "insumos" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "tabelaOrigem" INTEGER NOT NULL,
    "codigoOrigem" INTEGER NOT NULL,
    "unidadeId" TEXT,
    "grupoId" TEXT,
    "nome" TEXT NOT NULL,
    "sinonimo" TEXT,
    "classificacaoFiscal" TEXT,
    "tempoEntregaDias" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "controlaPreco" BOOLEAN NOT NULL DEFAULT false,
    "controlaQuantidade" BOOLEAN NOT NULL DEFAULT false,
    "controlaEstoque" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "insumos_origemSiengeId_key" ON "insumos"("origemSiengeId");
CREATE INDEX "insumos_nome_idx" ON "insumos"("nome");
CREATE INDEX "insumos_grupoId_idx" ON "insumos"("grupoId");
CREATE INDEX "insumos_unidadeId_idx" ON "insumos"("unidadeId");
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades_medida"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos_insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "precos_insumo" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "insumoId" TEXT NOT NULL,
    "codigoPrecoOrigem" INTEGER NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "precoAutorizadoCentavos" INTEGER NOT NULL DEFAULT 0,
    "custoMedioCentavos" INTEGER NOT NULL DEFAULT 0,
    "ultimoCustoCentavos" INTEGER NOT NULL DEFAULT 0,
    "dataPreco" DATE,
    "dataAutorizacao" DATE,
    "dataUltimoCusto" DATE,
    "orcado" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "precos_insumo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "precos_insumo_origemSiengeId_key" ON "precos_insumo"("origemSiengeId");
CREATE INDEX "precos_insumo_insumoId_dataPreco_idx" ON "precos_insumo"("insumoId", "dataPreco");
ALTER TABLE "precos_insumo" ADD CONSTRAINT "precos_insumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
