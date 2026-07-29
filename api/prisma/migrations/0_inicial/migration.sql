-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('ADMINISTRADOR', 'FINANCEIRO', 'VENDEDOR', 'CONSULTA');

-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "SituacaoLote" AS ENUM ('DISPONIVEL', 'RESERVADO', 'VENDIDO', 'INDISPONIVEL');

-- CreateEnum
CREATE TYPE "Periodicidade" AS ENUM ('MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "StatusContrato" AS ENUM ('ATIVO', 'QUITADO', 'CANCELADO', 'DISTRATADO');

-- CreateEnum
CREATE TYPE "IndiceReajuste" AS ENUM ('NENHUM', 'IGPM', 'IPCA', 'INCC', 'INPC');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'PIX', 'BOLETO', 'TRANSFERENCIA', 'CARTAO', 'CHEQUE', 'PERMUTA');

-- CreateEnum
CREATE TYPE "StatusParcela" AS ENUM ('PENDENTE', 'PAGA', 'PAGA_PARCIAL', 'CANCELADA', 'RENEGOCIADA');

-- CreateEnum
CREATE TYPE "TipoParcela" AS ENUM ('ENTRADA', 'FINANCIAMENTO', 'RENEGOCIACAO');

-- CreateEnum
CREATE TYPE "Gatilho" AS ENUM ('ANTES_DO_VENCIMENTO', 'NO_VENCIMENTO', 'APOS_O_VENCIMENTO');

-- CreateEnum
CREATE TYPE "Canal" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "StatusCobranca" AS ENUM ('PENDENTE', 'ENVIADA', 'FALHA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('BOLETO', 'PIX', 'BOLETO_COM_PIX');

-- CreateEnum
CREATE TYPE "StatusDocumento" AS ENUM ('EMITIDO', 'PAGO', 'CANCELADO', 'EXPIRADO', 'FALHA');

-- CreateEnum
CREATE TYPE "StatusRenegociacao" AS ENUM ('VIGENTE', 'CUMPRIDA', 'ROMPIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL DEFAULT 'CONSULTA',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcesso" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "tipoPessoa" "TipoPessoa" NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "dataNascimento" DATE,
    "logradouro" TEXT NOT NULL DEFAULT '',
    "numero" TEXT NOT NULL DEFAULT '',
    "complemento" TEXT,
    "bairro" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL DEFAULT '',
    "uf" TEXT NOT NULL DEFAULT '',
    "cep" TEXT NOT NULL DEFAULT '',
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loteamentos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "registroImobiliario" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loteamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quadras" (
    "id" TEXT NOT NULL,
    "loteamentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quadras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" TEXT NOT NULL,
    "quadraId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "areaEmMetrosQuadrados" DOUBLE PRECISION NOT NULL,
    "valorDeTabelaCentavos" INTEGER,
    "situacao" "SituacaoLote" NOT NULL DEFAULT 'DISPONIVEL',
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corretores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "percentualDeComissao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corretores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "corretorId" TEXT,
    "valorTotalCentavos" INTEGER NOT NULL,
    "valorEntradaCentavos" INTEGER NOT NULL DEFAULT 0,
    "dataEntrada" DATE,
    "formaPagamentoEntrada" "FormaPagamento",
    "quantidadeDeParcelas" INTEGER NOT NULL DEFAULT 0,
    "valorDaParcelaCentavos" INTEGER,
    "primeiroVencimento" DATE,
    "periodicidade" "Periodicidade" NOT NULL DEFAULT 'MENSAL',
    "multaPorAtrasoPercentual" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "jurosAoMesPercentual" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "diasDeCarencia" INTEGER NOT NULL DEFAULT 0,
    "indiceReajuste" "IndiceReajuste" NOT NULL DEFAULT 'NENHUM',
    "status" "StatusContrato" NOT NULL DEFAULT 'ATIVO',
    "dataAssinatura" DATE NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcelas" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" "TipoParcela" NOT NULL DEFAULT 'FINANCIAMENTO',
    "valorOriginalCentavos" INTEGER NOT NULL,
    "vencimento" DATE NOT NULL,
    "status" "StatusParcela" NOT NULL DEFAULT 'PENDENTE',
    "valorPagoCentavos" INTEGER NOT NULL DEFAULT 0,
    "jurosRecebidosCentavos" INTEGER NOT NULL DEFAULT 0,
    "multaRecebidaCentavos" INTEGER NOT NULL DEFAULT 0,
    "descontoConcedidoCentavos" INTEGER NOT NULL DEFAULT 0,
    "pagoEm" DATE,
    "formaPagamento" "FormaPagamento",
    "descricao" TEXT,
    "renegociacaoOrigemId" TEXT,
    "renegociacaoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "valorPrincipalCentavos" INTEGER NOT NULL,
    "valorJurosCentavos" INTEGER NOT NULL DEFAULT 0,
    "valorMultaCentavos" INTEGER NOT NULL DEFAULT 0,
    "valorDescontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "valorTotalCentavos" INTEGER NOT NULL,
    "pagoEm" DATE NOT NULL,
    "formaPagamento" "FormaPagamento" NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'MANUAL',
    "documentoId" TEXT,
    "registradoPor" TEXT,
    "observacoes" TEXT,
    "estornado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_de_regua" (
    "id" TEXT NOT NULL,
    "gatilho" "Gatilho" NOT NULL,
    "dias" INTEGER NOT NULL DEFAULT 0,
    "canais" "Canal"[],
    "modelo" TEXT NOT NULL,
    "emitirDocumento" BOOLEAN NOT NULL DEFAULT true,
    "tipoDeDocumento" "TipoDocumento" NOT NULL DEFAULT 'BOLETO_COM_PIX',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_de_regua_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelos_de_mensagem" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "assunto" TEXT,
    "corpo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modelos_de_mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobrancas" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "chaveDeIdempotencia" TEXT NOT NULL,
    "gatilho" "Gatilho" NOT NULL,
    "dias" INTEGER NOT NULL DEFAULT 0,
    "canal" "Canal" NOT NULL,
    "destino" TEXT NOT NULL,
    "assunto" TEXT,
    "mensagem" TEXT NOT NULL,
    "valorCobradoCentavos" INTEGER NOT NULL,
    "dataDeReferencia" DATE NOT NULL,
    "status" "StatusCobranca" NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimoErro" TEXT,
    "identificadorNoProvedor" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadaEm" TIMESTAMP(3),

    CONSTRAINT "cobrancas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_de_cobranca" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "provedor" TEXT NOT NULL,
    "identificadorExterno" TEXT NOT NULL,
    "nossoNumero" TEXT,
    "linhaDigitavel" TEXT,
    "codigoDeBarras" TEXT,
    "pixCopiaECola" TEXT,
    "pixQrCodeBase64" TEXT,
    "urlDoDocumento" TEXT,
    "valorCentavos" INTEGER NOT NULL,
    "vencimento" DATE NOT NULL,
    "status" "StatusDocumento" NOT NULL DEFAULT 'EMITIDO',
    "emitidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baixadoEm" TIMESTAMP(3),

    CONSTRAINT "documentos_de_cobranca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_de_webhook" (
    "id" TEXT NOT NULL,
    "provedor" TEXT NOT NULL,
    "identificadorExterno" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cargaUtil" JSONB NOT NULL,
    "processadoEm" TIMESTAMP(3),
    "erro" TEXT,
    "recebidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_de_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renegociacoes" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "saldoOriginalCentavos" INTEGER NOT NULL,
    "encargosCentavos" INTEGER NOT NULL DEFAULT 0,
    "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "valorNegociadoCentavos" INTEGER NOT NULL,
    "entradaCentavos" INTEGER NOT NULL DEFAULT 0,
    "dataEntrada" DATE,
    "quantidadeDeParcelas" INTEGER NOT NULL,
    "primeiroVencimento" DATE NOT NULL,
    "periodicidade" "Periodicidade" NOT NULL DEFAULT 'MENSAL',
    "status" "StatusRenegociacao" NOT NULL DEFAULT 'VIGENTE',
    "motivo" TEXT,
    "acordadoEm" DATE NOT NULL,
    "registradoPor" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "renegociacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reajustes" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "indice" "IndiceReajuste" NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "aplicadoAPartirDe" DATE NOT NULL,
    "parcelasAfetadas" INTEGER NOT NULL,
    "registradoPor" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reajustes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_documento_key" ON "clientes"("documento");

-- CreateIndex
CREATE INDEX "clientes_nome_idx" ON "clientes"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "quadras_loteamentoId_nome_key" ON "quadras"("loteamentoId", "nome");

-- CreateIndex
CREATE INDEX "lotes_situacao_idx" ON "lotes"("situacao");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_quadraId_numero_key" ON "lotes"("quadraId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "corretores_documento_key" ON "corretores"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_numero_key" ON "contratos"("numero");

-- CreateIndex
CREATE INDEX "contratos_clienteId_idx" ON "contratos"("clienteId");

-- CreateIndex
CREATE INDEX "contratos_status_idx" ON "contratos"("status");

-- CreateIndex
CREATE INDEX "parcelas_status_vencimento_idx" ON "parcelas"("status", "vencimento");

-- CreateIndex
CREATE INDEX "parcelas_contratoId_vencimento_idx" ON "parcelas"("contratoId", "vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "parcelas_contratoId_numero_tipo_key" ON "parcelas"("contratoId", "numero", "tipo");

-- CreateIndex
CREATE INDEX "pagamentos_contratoId_pagoEm_idx" ON "pagamentos"("contratoId", "pagoEm");

-- CreateIndex
CREATE INDEX "pagamentos_pagoEm_idx" ON "pagamentos"("pagoEm");

-- CreateIndex
CREATE UNIQUE INDEX "eventos_de_regua_gatilho_dias_key" ON "eventos_de_regua"("gatilho", "dias");

-- CreateIndex
CREATE UNIQUE INDEX "modelos_de_mensagem_chave_key" ON "modelos_de_mensagem"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "cobrancas_chaveDeIdempotencia_key" ON "cobrancas"("chaveDeIdempotencia");

-- CreateIndex
CREATE INDEX "cobrancas_contratoId_criadaEm_idx" ON "cobrancas"("contratoId", "criadaEm");

-- CreateIndex
CREATE INDEX "cobrancas_parcelaId_idx" ON "cobrancas"("parcelaId");

-- CreateIndex
CREATE INDEX "cobrancas_status_dataDeReferencia_idx" ON "cobrancas"("status", "dataDeReferencia");

-- CreateIndex
CREATE INDEX "documentos_de_cobranca_parcelaId_status_idx" ON "documentos_de_cobranca"("parcelaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_de_cobranca_provedor_identificadorExterno_key" ON "documentos_de_cobranca"("provedor", "identificadorExterno");

-- CreateIndex
CREATE INDEX "eventos_de_webhook_processadoEm_idx" ON "eventos_de_webhook"("processadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "eventos_de_webhook_provedor_identificadorExterno_tipo_key" ON "eventos_de_webhook"("provedor", "identificadorExterno", "tipo");

-- CreateIndex
CREATE INDEX "renegociacoes_contratoId_idx" ON "renegociacoes"("contratoId");

-- CreateIndex
CREATE INDEX "reajustes_contratoId_idx" ON "reajustes"("contratoId");

-- AddForeignKey
ALTER TABLE "quadras" ADD CONSTRAINT "quadras_loteamentoId_fkey" FOREIGN KEY ("loteamentoId") REFERENCES "loteamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_quadraId_fkey" FOREIGN KEY ("quadraId") REFERENCES "quadras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "corretores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_renegociacaoId_fkey" FOREIGN KEY ("renegociacaoId") REFERENCES "renegociacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_renegociacaoOrigemId_fkey" FOREIGN KEY ("renegociacaoOrigemId") REFERENCES "renegociacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_de_cobranca" ADD CONSTRAINT "documentos_de_cobranca_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_de_cobranca" ADD CONSTRAINT "documentos_de_cobranca_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renegociacoes" ADD CONSTRAINT "renegociacoes_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reajustes" ADD CONSTRAINT "reajustes_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
