import type { Cobranca } from '../../../domain/cobranca/cobranca.js';
import type { DocumentoDeCobranca } from '../../../domain/cobranca/documento-de-cobranca.js';
import type { EventoDaRegua } from '../../../domain/cobranca/regua-de-cobranca.js';
import type { Contrato, PosicaoFinanceira } from '../../../domain/contratos/contrato.js';
import type { DemonstrativoDeDebito, Parcela } from '../../../domain/contratos/parcela.js';
import type { SituacaoParcela } from '../../../domain/contratos/tipos.js';
import type { Pagina } from '../../../application/ports/comuns.js';
import type { LinhaDeCobranca } from '../../../application/use-cases/cobranca/listar-parcelas-para-cobranca.js';
import type {
  Inadimplente,
  RelatorioDeInadimplencia,
  ResumoDaInadimplencia,
} from '../../../application/use-cases/cobranca/listar-inadimplentes.js';
import type { Extrato } from '../../../application/use-cases/contratos/obter-extrato-do-contrato.js';

/**
 * Traducao das entidades para o JSON do contrato da API.
 *
 * Dinheiro sai sempre como inteiro em centavos, com o sufixo `Centavos` no nome
 * do campo; data de negocio sai como "AAAA-MM-DD". Deixar isso explicito num so
 * lugar evita o front receber ora reais, ora centavos.
 */

export function apresentarDemonstrativo(demonstrativo: DemonstrativoDeDebito) {
  return {
    saldoPrincipalCentavos: demonstrativo.saldoPrincipal.centavos,
    multaCentavos: demonstrativo.multa.centavos,
    jurosCentavos: demonstrativo.juros.centavos,
    totalCentavos: demonstrativo.total.centavos,
    diasDeAtraso: demonstrativo.diasDeAtraso,
    diasCobrados: demonstrativo.diasCobrados,
  };
}

export function apresentarDocumento(documento: DocumentoDeCobranca) {
  return {
    id: documento.id.paraString(),
    tipo: documento.tipo,
    provedor: documento.provedor,
    identificadorExterno: documento.identificadorExterno,
    nossoNumero: documento.nossoNumero,
    linhaDigitavel: documento.linhaDigitavel,
    codigoDeBarras: documento.codigoDeBarras,
    pixCopiaECola: documento.pixCopiaECola,
    pixQrCodeBase64: documento.pixQrCodeBase64,
    urlDoDocumento: documento.urlDoDocumento,
    valorCentavos: documento.valor.centavos,
    vencimento: documento.vencimento.paraIso(),
    status: documento.status,
    emitidoEm: documento.emitidoEm.toISOString(),
    baixadoEm: documento.baixadoEm?.toISOString() ?? null,
  };
}

export function apresentarParcela(
  parcela: Parcela,
  extras: {
    situacao: SituacaoParcela;
    demonstrativo: DemonstrativoDeDebito;
    documentoVigente: DocumentoDeCobranca | null;
  },
) {
  return {
    id: parcela.id.paraString(),
    contratoId: parcela.contratoId.paraString(),
    numero: parcela.numero,
    tipo: parcela.tipo,
    descricao: parcela.descricao,
    valorOriginalCentavos: parcela.valorOriginal.centavos,
    vencimento: parcela.vencimento.paraIso(),
    status: parcela.status,
    situacao: extras.situacao,
    valorPagoCentavos: parcela.valorPago.centavos,
    jurosRecebidosCentavos: parcela.jurosRecebidos.centavos,
    multaRecebidaCentavos: parcela.multaRecebida.centavos,
    descontoConcedidoCentavos: parcela.descontoConcedido.centavos,
    totalRecebidoCentavos: parcela.totalRecebido.centavos,
    pagoEm: parcela.pagoEm?.paraIso() ?? null,
    formaPagamento: parcela.formaPagamento,
    demonstrativo: apresentarDemonstrativo(extras.demonstrativo),
    documentoVigente: extras.documentoVigente ? apresentarDocumento(extras.documentoVigente) : null,
  };
}

export function apresentarPosicao(posicao: PosicaoFinanceira) {
  return {
    valorTotalCentavos: posicao.valorTotal.centavos,
    totalRecebidoCentavos: posicao.totalRecebido.centavos,
    saldoDevedorCentavos: posicao.saldoDevedor.centavos,
    totalVencidoCentavos: posicao.totalVencido.centavos,
    totalAVencerCentavos: posicao.totalAVencer.centavos,
    encargosAcumuladosCentavos: posicao.encargosAcumulados.centavos,
    parcelasPagas: posicao.parcelasPagas,
    parcelasEmAberto: posicao.parcelasEmAberto,
    parcelasVencidas: posicao.parcelasVencidas,
    proximoVencimento: posicao.proximoVencimento?.paraIso() ?? null,
    diasDeAtrasoMaximo: posicao.diasDeAtrasoMaximo,
    situacao: posicao.situacao,
    diasAteARetomada: posicao.diasAteARetomada,
  };
}

export function apresentarContrato(contrato: Contrato) {
  const { termos, politicaDeEncargos: politica } = contrato.paraEstado();
  return {
    id: contrato.id.paraString(),
    numero: contrato.numero,
    clienteId: contrato.clienteId.paraString(),
    loteId: contrato.loteId.paraString(),
    corretorId: contrato.corretorId?.paraString() ?? null,
    valorTotalCentavos: termos.valorTotal.centavos,
    valorEntradaCentavos: termos.valorEntrada.centavos,
    dataEntrada: termos.dataEntrada?.paraIso() ?? null,
    formaPagamentoEntrada: termos.formaPagamentoEntrada,
    quantidadeDeParcelas: termos.quantidadeDeParcelas,
    valorDaParcelaCentavos: termos.valorDaParcela?.centavos ?? null,
    primeiroVencimento: termos.primeiroVencimento?.paraIso() ?? null,
    periodicidade: termos.periodicidade,
    multaPorAtrasoPercentual: politica.multaPorAtraso.valor,
    jurosAoMesPercentual: politica.jurosAoMes.valor,
    diasDeCarencia: politica.diasDeCarencia,
    indiceReajuste: contrato.indiceReajuste,
    status: contrato.status,
    dataAssinatura: contrato.dataAssinatura.paraIso(),
    observacoes: contrato.observacoes,
  };
}

export function apresentarExtrato(extrato: Extrato) {
  return {
    contrato: apresentarContrato(extrato.contrato),
    cliente: extrato.cliente
      ? {
          id: extrato.cliente.id.paraString(),
          nome: extrato.cliente.nome,
          documento: extrato.cliente.documento.digitos,
          documentoFormatado: extrato.cliente.documento.formatar(),
          email: extrato.cliente.email?.valor ?? null,
          telefone: extrato.cliente.telefone?.digitos ?? null,
          whatsapp: extrato.cliente.whatsapp?.digitos ?? null,
        }
      : null,
    dataDeReferencia: extrato.dataDeReferencia.paraIso(),
    posicao: apresentarPosicao(extrato.posicao),
    parcelas: extrato.linhas.map((linha) =>
      apresentarParcela(linha.parcela, {
        situacao: linha.situacao,
        demonstrativo: linha.demonstrativo,
        documentoVigente: linha.documentoVigente,
      }),
    ),
  };
}

export function apresentarLinhaDeCobranca(linha: LinhaDeCobranca) {
  return {
    ...apresentarParcela(linha.parcela, {
      situacao: linha.situacao,
      demonstrativo: linha.demonstrativo,
      documentoVigente: linha.documentoVigente,
    }),
    contrato: linha.contexto?.contratoNumero ?? null,
    cliente: linha.contexto
      ? {
          id: linha.contexto.clienteId,
          nome: linha.contexto.clienteNome,
          email: linha.contexto.clienteEmail,
          whatsapp: linha.contexto.clienteWhatsApp,
          telefone: linha.contexto.clienteTelefone,
        }
      : null,
    imovel: linha.contexto
      ? {
          loteamento: linha.contexto.loteamento,
          quadra: linha.contexto.quadra,
          lote: linha.contexto.lote,
        }
      : null,
  };
}

export function apresentarInadimplente(linha: Inadimplente) {
  return {
    clienteId: linha.clienteId,
    cliente: {
      id: linha.clienteId,
      nome: linha.clienteNome,
      documento: linha.clienteDocumento,
      email: linha.clienteEmail,
      whatsapp: linha.clienteWhatsApp,
      telefone: linha.clienteTelefone,
    },
    totalEmAtrasoCentavos: linha.totalEmAtrasoCentavos,
    principalCentavos: linha.principalCentavos,
    encargosCentavos: linha.encargosCentavos,
    parcelasVencidas: linha.parcelasVencidas,
    contratosEmAtraso: linha.contratosEmAtraso,
    diasDeAtrasoMaximo: linha.diasDeAtrasoMaximo,
    vencimentoMaisAntigo: linha.vencimentoMaisAntigo,
    diasAteARetomada: linha.diasAteARetomada,
    risco: linha.risco,
    unidadePrincipal: linha.unidadePrincipal,
    contratoIds: linha.contratoIds,
  };
}

export function apresentarResumoDeInadimplencia(resumo: ResumoDaInadimplencia) {
  return {
    clientes: resumo.clientes,
    totalEmAtrasoCentavos: resumo.totalEmAtrasoCentavos,
    principalCentavos: resumo.principalCentavos,
    encargosCentavos: resumo.encargosCentavos,
    parcelasVencidas: resumo.parcelasVencidas,
    porRisco: resumo.porRisco,
  };
}

export function apresentarRelatorioDeInadimplencia(relatorio: RelatorioDeInadimplencia) {
  return {
    ...apresentarPagina(relatorio.pagina, apresentarInadimplente),
    resumo: apresentarResumoDeInadimplencia(relatorio.resumo),
  };
}

export function apresentarCobranca(cobranca: Cobranca) {
  return {
    id: cobranca.id.paraString(),
    contratoId: cobranca.contratoId.paraString(),
    parcelaId: cobranca.parcelaId.paraString(),
    clienteId: cobranca.clienteId.paraString(),
    evento: `${cobranca.gatilho}:${cobranca.dias}`,
    gatilho: cobranca.gatilho,
    dias: cobranca.dias,
    canal: cobranca.canal,
    destino: cobranca.destino,
    assunto: cobranca.assunto,
    mensagem: cobranca.mensagem,
    valorCobradoCentavos: cobranca.valorCobrado.centavos,
    dataDeReferencia: cobranca.dataDeReferencia.paraIso(),
    status: cobranca.status,
    tentativas: cobranca.tentativas,
    ultimoErro: cobranca.ultimoErro,
    criadaEm: cobranca.criadaEm.toISOString(),
    enviadaEm: cobranca.enviadaEm?.toISOString() ?? null,
  };
}

export function apresentarEventoDaRegua(evento: EventoDaRegua) {
  return {
    gatilho: evento.gatilho,
    dias: evento.dias,
    canais: [...evento.canais],
    modelo: evento.modelo,
    emitirDocumento: evento.emitirDocumento,
    tipoDeDocumento: evento.tipoDeDocumento,
    ativo: evento.ativo,
    chave: evento.chave,
    descricao: evento.descricao,
  };
}

/** Preserva os metadados da pagina ao trocar o tipo dos itens. */
export function apresentarPagina<T, R>(pagina: Pagina<T>, apresentar: (item: T) => R) {
  return {
    itens: pagina.itens.map(apresentar),
    total: pagina.total,
    pagina: pagina.pagina,
    porPagina: pagina.porPagina,
    totalDePaginas: pagina.totalDePaginas,
  };
}
