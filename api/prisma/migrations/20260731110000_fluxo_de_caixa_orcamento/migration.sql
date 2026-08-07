-- CreateTable
CREATE TABLE "orcamentos_financeiros" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "empreendimentoFinanceiroId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "valorPrevistoCentavos" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "orcamentos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orcamentos_financeiros_ano_idx" ON "orcamentos_financeiros"("ano");

-- CreateIndex
CREATE INDEX "orcamentos_financeiros_empreendimentoFinanceiroId_ano_idx" ON "orcamentos_financeiros"("empreendimentoFinanceiroId", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_financeiros_categoria_empreend_ano_mes_key" ON "orcamentos_financeiros"("categoriaId", "empreendimentoFinanceiroId", "ano", "mes");

-- AddForeignKey
ALTER TABLE "orcamentos_financeiros" ADD CONSTRAINT "orcamentos_financeiros_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_financeiras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos_financeiros" ADD CONSTRAINT "orcamentos_financeiros_empreendimentoFinanceiroId_fkey" FOREIGN KEY ("empreendimentoFinanceiroId") REFERENCES "empreendimentos_financeiros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
