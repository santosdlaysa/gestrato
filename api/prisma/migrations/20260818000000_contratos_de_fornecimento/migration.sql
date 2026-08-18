-- CreateEnum
CREATE TYPE "SituacaoDaEmpresa" AS ENUM ('CONTRATANTE', 'CONTRATADA');

-- CreateEnum
CREATE TYPE "TipoDeItemContrato" AS ENUM ('SERVICO', 'INSUMO');

-- CreateTable
CREATE TABLE "contratos_de_fornecimento" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "documento" TEXT,
    "situacaoDaEmpresa" "SituacaoDaEmpresa" NOT NULL DEFAULT 'CONTRATANTE',
    "tipoDeItem" "TipoDeItemContrato" NOT NULL DEFAULT 'SERVICO',
    "objeto" TEXT NOT NULL,
    "empresa" TEXT,
    "fornecedorId" TEXT,
    "tipoDoContrato" TEXT,
    "responsavel" TEXT,
    "dataDoContrato" DATE,
    "dataBase" DATE,
    "dataDeInicio" DATE,
    "dataDeTermino" DATE,
    "valorCentavos" INTEGER,
    "observacaoInterna" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contratos_de_fornecimento_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contratos_de_fornecimento_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "contratos_de_fornecimento_numero_idx" ON "contratos_de_fornecimento"("numero");
CREATE INDEX "contratos_de_fornecimento_fornecedorId_idx" ON "contratos_de_fornecimento"("fornecedorId");
