-- CreateEnum
CREATE TYPE "TipoLancamentoFinanceiro" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "NaturezaFinanceira" AS ENUM ('RECEBIVEL_VENDA', 'APORTE', 'TRANSFERENCIA', 'DESPESA_FIXA', 'DESPESA_VARIAVEL', 'CUSTO_OBRA', 'OUTRO');

-- CreateTable
CREATE TABLE "contas_bancarias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "instituicao" TEXT,
    "agencia" TEXT,
    "numero" TEXT,
    "saldoInicialCentavos" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socios_aportadores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "socios_aportadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empreendimentos_financeiros" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "loteamentoId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "empreendimentos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_financeiras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoLancamentoFinanceiro" NOT NULL,
    "natureza" "NaturezaFinanceira" NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "categorias_financeiras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contas_bancarias_nome_idx" ON "contas_bancarias"("nome");

-- CreateIndex
CREATE INDEX "socios_aportadores_nome_idx" ON "socios_aportadores"("nome");

-- CreateIndex
CREATE INDEX "empreendimentos_financeiros_nome_idx" ON "empreendimentos_financeiros"("nome");

-- CreateIndex
CREATE INDEX "categorias_financeiras_natureza_idx" ON "categorias_financeiras"("natureza");

-- AddForeignKey
ALTER TABLE "empreendimentos_financeiros" ADD CONSTRAINT "empreendimentos_financeiros_loteamentoId_fkey" FOREIGN KEY ("loteamentoId") REFERENCES "loteamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
