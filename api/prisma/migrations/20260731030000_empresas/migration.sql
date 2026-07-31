CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "origemSiengeId" TEXT,
    "nome" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "documento" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "empresas_origemSiengeId_key" ON "empresas"("origemSiengeId");
CREATE INDEX "empresas_nome_idx" ON "empresas"("nome");

ALTER TABLE "contas_a_pagar" ADD COLUMN "empresaId" TEXT;
CREATE INDEX "contas_a_pagar_empresaId_idx" ON "contas_a_pagar"("empresaId");
ALTER TABLE "contas_a_pagar" ADD CONSTRAINT "contas_a_pagar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
