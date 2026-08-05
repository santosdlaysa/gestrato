-- AlterEnum: novos status de entrega vindos do provedor de mensagens.
ALTER TYPE "StatusCobranca" ADD VALUE IF NOT EXISTS 'ENTREGUE';
ALTER TYPE "StatusCobranca" ADD VALUE IF NOT EXISTS 'LIDA';
ALTER TYPE "StatusCobranca" ADD VALUE IF NOT EXISTS 'NAO_ENTREGUE';

-- CreateEnum
CREATE TYPE "OrigemDaTransicao" AS ENUM ('SISTEMA', 'PROVEDOR');

-- CreateTable
CREATE TABLE "transicoes_de_cobranca" (
    "id" TEXT NOT NULL,
    "cobrancaId" TEXT NOT NULL,
    "status" "StatusCobranca" NOT NULL,
    "statusProvedor" TEXT,
    "detalhe" TEXT,
    "origem" "OrigemDaTransicao" NOT NULL DEFAULT 'SISTEMA',
    "ocorridoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transicoes_de_cobranca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transicoes_de_cobranca_cobrancaId_ocorridoEm_idx" ON "transicoes_de_cobranca"("cobrancaId", "ocorridoEm");

-- AddForeignKey
ALTER TABLE "transicoes_de_cobranca" ADD CONSTRAINT "transicoes_de_cobranca_cobrancaId_fkey" FOREIGN KEY ("cobrancaId") REFERENCES "cobrancas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
