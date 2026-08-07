-- CreateTable
CREATE TABLE "lancamentos_financeiros" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "tipo" "TipoLancamentoFinanceiro" NOT NULL,
    "data" DATE NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "numeroDocumento" TEXT,
    "formaPagamento" "FormaPagamento",
    "conciliadoEm" DATE,
    "contaBancariaId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "empreendimentoFinanceiroId" TEXT,
    "socioAportadorId" TEXT,
    "transferenciaId" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lancamentos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lancamentos_financeiros_origemSiengeId_key" ON "lancamentos_financeiros"("origemSiengeId");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_contaBancariaId_data_idx" ON "lancamentos_financeiros"("contaBancariaId", "data");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_categoriaId_idx" ON "lancamentos_financeiros"("categoriaId");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_transferenciaId_idx" ON "lancamentos_financeiros"("transferenciaId");

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_contaBancariaId_fkey" FOREIGN KEY ("contaBancariaId") REFERENCES "contas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_empreendimentoFinanceiroId_fkey" FOREIGN KEY ("empreendimentoFinanceiroId") REFERENCES "empreendimentos_financeiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_socioAportadorId_fkey" FOREIGN KEY ("socioAportadorId") REFERENCES "socios_aportadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
