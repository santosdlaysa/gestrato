-- CreateEnum
CREATE TYPE "EscopoDoAnexo" AS ENUM ('CLIENTE', 'CONTRATO');

-- CreateEnum
CREATE TYPE "CategoriaDeAnexo" AS ENUM ('RG', 'CPF', 'COMPROVANTE_RESIDENCIA', 'COMPROVANTE_RENDA', 'CERTIDAO', 'CONTRATO_ASSINADO', 'ADITIVO', 'TERMO_DE_RENEGOCIACAO', 'DISTRATO', 'TERMO_DE_QUITACAO', 'COMPROVANTE_PAGAMENTO', 'OUTRO');

-- CreateTable
CREATE TABLE "anexos" (
    "id" TEXT NOT NULL,
    "escopo" "EscopoDoAnexo" NOT NULL,
    "donoId" TEXT NOT NULL,
    "categoria" "CategoriaDeAnexo" NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "chaveNoArmazenamento" TEXT NOT NULL,
    "tipoMime" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "descricao" TEXT,
    "enviadoPor" TEXT,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "anexos_chaveNoArmazenamento_key" ON "anexos"("chaveNoArmazenamento");

-- CreateIndex
CREATE INDEX "anexos_escopo_donoId_idx" ON "anexos"("escopo", "donoId");