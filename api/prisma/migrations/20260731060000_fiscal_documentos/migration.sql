CREATE TABLE "documentos_fiscais" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "origemTabela" TEXT NOT NULL,
    "lancamentoOrigem" INTEGER NOT NULL,
    "empresaId" TEXT,
    "fornecedorId" TEXT,
    "clienteId" TEXT,
    "numero" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "tipoOrigem" INTEGER NOT NULL,
    "origemCodigo" TEXT NOT NULL,
    "emitidoEm" DATE NOT NULL,
    "registradoEm" DATE NOT NULL,
    "valorContabilCentavos" INTEGER NOT NULL DEFAULT 0,
    "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "freteCentavos" INTEGER NOT NULL DEFAULT 0,
    "seguroCentavos" INTEGER NOT NULL DEFAULT 0,
    "outrasDespesasCentavos" INTEGER NOT NULL DEFAULT 0,
    "baseIcmsCentavos" INTEGER NOT NULL DEFAULT 0,
    "icmsCentavos" INTEGER NOT NULL DEFAULT 0,
    "ipiCentavos" INTEGER NOT NULL DEFAULT 0,
    "issCentavos" INTEGER NOT NULL DEFAULT 0,
    "inssCentavos" INTEGER NOT NULL DEFAULT 0,
    "irCentavos" INTEGER NOT NULL DEFAULT 0,
    "pisCentavos" INTEGER NOT NULL DEFAULT 0,
    "cofinsCentavos" INTEGER NOT NULL DEFAULT 0,
    "statusOrigem" TEXT,
    "chaveAcesso" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "documentos_fiscais_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "documentos_fiscais_origemSiengeId_key" ON "documentos_fiscais"("origemSiengeId");
CREATE INDEX "documentos_fiscais_emitidoEm_idx" ON "documentos_fiscais"("emitidoEm");
CREATE INDEX "documentos_fiscais_empresaId_idx" ON "documentos_fiscais"("empresaId");
CREATE INDEX "documentos_fiscais_fornecedorId_idx" ON "documentos_fiscais"("fornecedorId");
CREATE INDEX "documentos_fiscais_clienteId_idx" ON "documentos_fiscais"("clienteId");
ALTER TABLE "documentos_fiscais" ADD CONSTRAINT "documentos_fiscais_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documentos_fiscais" ADD CONSTRAINT "documentos_fiscais_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documentos_fiscais" ADD CONSTRAINT "documentos_fiscais_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "itens_documentos_fiscais" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "documentoId" TEXT NOT NULL,
    "sequenciaOrigem" INTEGER NOT NULL,
    "produto" TEXT,
    "ncm" TEXT,
    "cfop" TEXT,
    "unidadeOrigem" INTEGER,
    "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precoUnitarioCentavos" INTEGER NOT NULL DEFAULT 0,
    "totalCentavos" INTEGER NOT NULL DEFAULT 0,
    "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "freteCentavos" INTEGER NOT NULL DEFAULT 0,
    "seguroCentavos" INTEGER NOT NULL DEFAULT 0,
    "baseIcmsCentavos" INTEGER NOT NULL DEFAULT 0,
    "icmsCentavos" INTEGER NOT NULL DEFAULT 0,
    "ipiCentavos" INTEGER NOT NULL DEFAULT 0,
    "pisCentavos" INTEGER NOT NULL DEFAULT 0,
    "cofinsCentavos" INTEGER NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "itens_documentos_fiscais_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "itens_documentos_fiscais_origemSiengeId_key" ON "itens_documentos_fiscais"("origemSiengeId");
CREATE INDEX "itens_documentos_fiscais_documentoId_idx" ON "itens_documentos_fiscais"("documentoId");
ALTER TABLE "itens_documentos_fiscais" ADD CONSTRAINT "itens_documentos_fiscais_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos_fiscais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
