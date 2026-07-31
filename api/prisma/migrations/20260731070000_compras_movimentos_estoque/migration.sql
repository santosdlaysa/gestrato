CREATE TABLE "pedidos_compra" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "fornecedorId" TEXT,
    "obraId" TEXT,
    "centroDeCustoId" TEXT,
    "numeroOrigem" INTEGER NOT NULL,
    "pedidoEm" DATE NOT NULL,
    "situacaoOrigem" TEXT,
    "autorizado" BOOLEAN NOT NULL DEFAULT false,
    "valorItensCentavos" INTEGER NOT NULL DEFAULT 0,
    "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "outrasDespesasCentavos" INTEGER NOT NULL DEFAULT 0,
    "freteCentavos" INTEGER NOT NULL DEFAULT 0,
    "valorTotalCentavos" INTEGER NOT NULL DEFAULT 0,
    "condicaoPagamento" TEXT,
    "enderecoEntrega" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pedidos_compra_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pedidos_compra_origemSiengeId_key" ON "pedidos_compra"("origemSiengeId");
CREATE INDEX "pedidos_compra_pedidoEm_idx" ON "pedidos_compra"("pedidoEm");
CREATE INDEX "pedidos_compra_fornecedorId_idx" ON "pedidos_compra"("fornecedorId");
CREATE INDEX "pedidos_compra_obraId_idx" ON "pedidos_compra"("obraId");
ALTER TABLE "pedidos_compra" ADD CONSTRAINT "pedidos_compra_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pedidos_compra" ADD CONSTRAINT "pedidos_compra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pedidos_compra" ADD CONSTRAINT "pedidos_compra_centroDeCustoId_fkey" FOREIGN KEY ("centroDeCustoId") REFERENCES "centros_de_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "itens_pedidos_compra" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "pedidoId" TEXT NOT NULL,
    "sequenciaOrigem" INTEGER NOT NULL,
    "insumoId" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precoUnitarioCentavos" INTEGER NOT NULL DEFAULT 0,
    "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "freteUnitarioCentavos" INTEGER NOT NULL DEFAULT 0,
    "precoEstimadoCentavos" INTEGER NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "itens_pedidos_compra_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "itens_pedidos_compra_origemSiengeId_key" ON "itens_pedidos_compra"("origemSiengeId");
CREATE INDEX "itens_pedidos_compra_pedidoId_idx" ON "itens_pedidos_compra"("pedidoId");
CREATE INDEX "itens_pedidos_compra_insumoId_idx" ON "itens_pedidos_compra"("insumoId");
ALTER TABLE "itens_pedidos_compra" ADD CONSTRAINT "itens_pedidos_compra_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "itens_pedidos_compra" ADD CONSTRAINT "itens_pedidos_compra_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "tipos_movimento_estoque" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "nome" TEXT NOT NULL,
    "movimentoOrigem" TEXT,
    "entrada" BOOLEAN NOT NULL DEFAULT false,
    "saida" BOOLEAN NOT NULL DEFAULT false,
    "calculaCusto" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tipos_movimento_estoque_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tipos_movimento_estoque_origemSiengeId_key" ON "tipos_movimento_estoque"("origemSiengeId");

CREATE TABLE "movimentos_estoque" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "documento" TEXT NOT NULL,
    "numeroOrigem" TEXT NOT NULL,
    "tipoId" TEXT,
    "fornecedorId" TEXT,
    "obraOrigemId" INTEGER,
    "centroOrigemId" INTEGER,
    "obraDestinoId" INTEGER,
    "centroDestinoId" INTEGER,
    "movimentoEm" DATE NOT NULL,
    "consistente" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "movimentos_estoque_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "movimentos_estoque_origemSiengeId_key" ON "movimentos_estoque"("origemSiengeId");
CREATE INDEX "movimentos_estoque_movimentoEm_idx" ON "movimentos_estoque"("movimentoEm");
CREATE INDEX "movimentos_estoque_tipoId_idx" ON "movimentos_estoque"("tipoId");
CREATE INDEX "movimentos_estoque_fornecedorId_idx" ON "movimentos_estoque"("fornecedorId");
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "tipos_movimento_estoque"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "itens_movimentos_estoque" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "movimentoId" TEXT NOT NULL,
    "sequenciaOrigem" INTEGER NOT NULL,
    "insumoId" TEXT,
    "unidadeMovOrigem" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precoUnitarioCentavos" INTEGER NOT NULL DEFAULT 0,
    "contaOrigem" TEXT,
    "contaDestino" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "itens_movimentos_estoque_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "itens_movimentos_estoque_origemSiengeId_key" ON "itens_movimentos_estoque"("origemSiengeId");
CREATE INDEX "itens_movimentos_estoque_movimentoId_idx" ON "itens_movimentos_estoque"("movimentoId");
CREATE INDEX "itens_movimentos_estoque_insumoId_idx" ON "itens_movimentos_estoque"("insumoId");
ALTER TABLE "itens_movimentos_estoque" ADD CONSTRAINT "itens_movimentos_estoque_movimentoId_fkey" FOREIGN KEY ("movimentoId") REFERENCES "movimentos_estoque"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "itens_movimentos_estoque" ADD CONSTRAINT "itens_movimentos_estoque_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
