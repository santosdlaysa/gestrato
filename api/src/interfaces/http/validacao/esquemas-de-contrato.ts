import { z } from 'zod';
import {
  esquemaDeCentavos,
  esquemaDeCentavosNaoNegativos,
  esquemaDeDataCivil,
  esquemaDeFormaPagamento,
  esquemaDeIdentificador,
  esquemaDeIndiceReajuste,
  esquemaDePaginacao,
  esquemaDePercentual,
  esquemaDePeriodicidade,
  esquemaDeStatusContrato,
  textoOpcional,
} from './esquemas-comuns.js';
import { SITUACOES_CONTRATO } from '../../../domain/contratos/tipos.js';

/** Condicoes comerciais — compartilhadas por simular e criar contrato. */
const condicoesComerciais = {
  valorTotalCentavos: esquemaDeCentavos,
  valorEntradaCentavos: esquemaDeCentavosNaoNegativos.default(0),
  dataEntrada: esquemaDeDataCivil.nullable().default(null),
  formaPagamentoEntrada: esquemaDeFormaPagamento.nullable().default(null),
  quantidadeDeParcelas: z.number().int().min(0).max(600),
  valorDaParcelaCentavos: esquemaDeCentavos.nullable().default(null),
  primeiroVencimento: esquemaDeDataCivil.nullable().default(null),
  periodicidade: esquemaDePeriodicidade.default('MENSAL'),
  multaPorAtrasoPercentual: esquemaDePercentual.default(2),
  jurosAoMesPercentual: esquemaDePercentual.default(1),
  diasDeCarencia: z.number().int().min(0).max(90).default(0),
  indiceReajuste: esquemaDeIndiceReajuste.default('NENHUM'),
};

export const esquemaDeSimulacao = z.object(condicoesComerciais);

export const esquemaDeCriacaoDeContrato = z.object({
  ...condicoesComerciais,
  numero: z.string().trim().min(1, 'Numero do contrato e obrigatorio.').max(40),
  clienteId: esquemaDeIdentificador,
  loteId: esquemaDeIdentificador,
  corretorId: esquemaDeIdentificador.nullable().default(null),
  dataAssinatura: esquemaDeDataCivil,
  observacoes: z.string().trim().max(2000).nullable().default(null),
});

export const esquemaDeFiltroDeContratos = esquemaDePaginacao.extend({
  busca: textoOpcional,
  status: esquemaDeStatusContrato.optional(),
  situacao: z.enum(SITUACOES_CONTRATO).optional(),
  clienteId: esquemaDeIdentificador.optional(),
  loteamentoId: esquemaDeIdentificador.optional(),
  corretorId: esquemaDeIdentificador.optional(),
  data: esquemaDeDataCivil.optional(),
});

export const esquemaDeReajuste = z.object({
  indice: esquemaDeIndiceReajuste,
  percentual: z.number().gt(0, 'Percentual de reajuste deve ser maior que zero.').max(100),
  aplicadoAPartirDe: esquemaDeDataCivil,
});

export const esquemaDeRenegociacao = z.object({
  parcelaIds: z.array(esquemaDeIdentificador).min(1, 'Selecione ao menos uma parcela.'),
  incluirEncargos: z.boolean().default(true),
  descontoCentavos: esquemaDeCentavosNaoNegativos.default(0),
  entradaCentavos: esquemaDeCentavosNaoNegativos.default(0),
  dataEntrada: esquemaDeDataCivil.nullable().default(null),
  quantidadeDeParcelas: z.number().int().min(1).max(600),
  primeiroVencimento: esquemaDeDataCivil,
  periodicidade: esquemaDePeriodicidade.default('MENSAL'),
  acordadoEm: esquemaDeDataCivil,
  motivo: z.string().trim().max(500).nullable().default(null),
});

export const esquemaDeApuracaoDeAcordo = z.object({
  parcelaIds: z.array(esquemaDeIdentificador).min(1),
  incluirEncargos: z.boolean().default(true),
  descontoCentavos: esquemaDeCentavosNaoNegativos.default(0),
  dataDeApuracao: esquemaDeDataCivil.optional(),
});

export const esquemaDeAtualizacaoDeContrato = z.object({
  observacoes: z.string().trim().max(2000).nullable().optional(),
  multaPorAtrasoPercentual: esquemaDePercentual.optional(),
  jurosAoMesPercentual: esquemaDePercentual.optional(),
  diasDeCarencia: z.number().int().min(0).max(90).optional(),
});
