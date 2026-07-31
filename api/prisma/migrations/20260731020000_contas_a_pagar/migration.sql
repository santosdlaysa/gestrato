CREATE TYPE "StatusContaAPagar" AS ENUM ('PENDENTE', 'PAGA', 'PAGA_PARCIAL', 'CANCELADA');

CREATE TABLE "fornecedores" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contas_a_pagar" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "fornecedorId" TEXT,
    "numeroDocumento" TEXT,
    "descricao" TEXT,
    "valorOriginalCentavos" INTEGER NOT NULL,
    "valorPagoCentavos" INTEGER NOT NULL DEFAULT 0,
    "jurosCentavos" INTEGER NOT NULL DEFAULT 0,
    "multaCentavos" INTEGER NOT NULL DEFAULT 0,
    "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "vencimento" DATE NOT NULL,
    "status" "StatusContaAPagar" NOT NULL DEFAULT 'PENDENTE',
    "pagoEm" DATE,
    "formaPagamento" "FormaPagamento",
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contas_a_pagar_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contas_a_pagar_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "pagamentos_contas_a_pagar" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "contaId" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "jurosCentavos" INTEGER NOT NULL DEFAULT 0,
    "multaCentavos" INTEGER NOT NULL DEFAULT 0,
    "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "pagoEm" DATE NOT NULL,
    "formaPagamento" "FormaPagamento",
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagamentos_contas_a_pagar_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pagamentos_contas_a_pagar_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas_a_pagar"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "fornecedores_origemSiengeId_key" ON "fornecedores"("origemSiengeId");
CREATE UNIQUE INDEX "fornecedores_documento_key" ON "fornecedores"("documento");
CREATE UNIQUE INDEX "contas_a_pagar_origemSiengeId_key" ON "contas_a_pagar"("origemSiengeId");
CREATE UNIQUE INDEX "pagamentos_contas_a_pagar_origemSiengeId_key" ON "pagamentos_contas_a_pagar"("origemSiengeId");
CREATE INDEX "fornecedores_nome_idx" ON "fornecedores"("nome");
CREATE INDEX "contas_a_pagar_vencimento_status_idx" ON "contas_a_pagar"("vencimento", "status");
CREATE INDEX "contas_a_pagar_fornecedorId_idx" ON "contas_a_pagar"("fornecedorId");
CREATE INDEX "pagamentos_contas_a_pagar_contaId_pagoEm_idx" ON "pagamentos_contas_a_pagar"("contaId", "pagoEm");
