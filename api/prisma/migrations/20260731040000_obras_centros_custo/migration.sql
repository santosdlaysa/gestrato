CREATE TABLE "obras" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "empresaId" TEXT,
    "nome" TEXT NOT NULL,
    "situacaoOrigem" TEXT,
    "tipoObraOrigem" INTEGER,
    "areaTotal" DOUBLE PRECISION,
    "areaTerreno" DOUBLE PRECISION,
    "pavimentos" INTEGER,
    "orcamentoBaseCentavos" INTEGER,
    "inicio" DATE,
    "termino" DATE,
    "enderecoEntrega" TEXT,
    "bairroEntrega" TEXT,
    "cepEntrega" TEXT,
    "observacoes" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "obras_origemSiengeId_key" ON "obras"("origemSiengeId");
CREATE INDEX "obras_empresaId_idx" ON "obras"("empresaId");
CREATE INDEX "obras_nome_idx" ON "obras"("nome");
ALTER TABLE "obras" ADD CONSTRAINT "obras_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "centros_de_custo" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "empresaId" TEXT,
    "obraId" TEXT,
    "nome" TEXT NOT NULL,
    "categoria" TEXT,
    "situacaoOrigem" TEXT,
    "usaNaObra" BOOLEAN NOT NULL DEFAULT false,
    "controlaEstoque" BOOLEAN NOT NULL DEFAULT false,
    "percentualAdministracao" DOUBLE PRECISION,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "centros_de_custo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "centros_de_custo_origemSiengeId_key" ON "centros_de_custo"("origemSiengeId");
CREATE INDEX "centros_de_custo_empresaId_idx" ON "centros_de_custo"("empresaId");
CREATE INDEX "centros_de_custo_obraId_idx" ON "centros_de_custo"("obraId");
ALTER TABLE "centros_de_custo" ADD CONSTRAINT "centros_de_custo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "centros_de_custo" ADD CONSTRAINT "centros_de_custo_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
