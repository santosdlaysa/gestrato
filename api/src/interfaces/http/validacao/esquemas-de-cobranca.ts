import { z } from 'zod';
import {
  esquemaDeCanal,
  esquemaDeCentavosNaoNegativos,
  esquemaDeDataCivil,
  esquemaDeFormaPagamento,
  esquemaDeGatilho,
  esquemaDeIdentificador,
  esquemaDePaginacao,
  esquemaDeSituacaoParcela,
  esquemaDeStatusCobranca,
  esquemaDeTipoDocumento,
} from './esquemas-comuns.js';

export const esquemaDeFiltroDeParcelas = esquemaDePaginacao.extend({
  situacao: esquemaDeSituacaoParcela.optional(),
  de: esquemaDeDataCivil.optional(),
  ate: esquemaDeDataCivil.optional(),
  contratoId: esquemaDeIdentificador.optional(),
  clienteId: esquemaDeIdentificador.optional(),
  loteamentoId: esquemaDeIdentificador.optional(),
  data: esquemaDeDataCivil.optional(),
});

/**
 * Baixa manual. Todos os componentes sao informados separadamente de proposito:
 * o financeiro precisa registrar quanto entrou de principal, de multa e de
 * juros — jogar tudo num "valor pago" destruiria o relatorio de recebimentos.
 */
export const esquemaDeBaixa = z.object({
  valorPrincipalCentavos: esquemaDeCentavosNaoNegativos,
  valorJurosCentavos: esquemaDeCentavosNaoNegativos.default(0),
  valorMultaCentavos: esquemaDeCentavosNaoNegativos.default(0),
  valorDescontoCentavos: esquemaDeCentavosNaoNegativos.default(0),
  pagoEm: esquemaDeDataCivil,
  formaPagamento: esquemaDeFormaPagamento,
  observacoes: z.string().trim().max(500).nullable().default(null),
});

export const esquemaDeEmissao = z.object({
  tipo: esquemaDeTipoDocumento.default('BOLETO_COM_PIX'),
  data: esquemaDeDataCivil.optional(),
});

export const esquemaDeCobrancaAvulsa = z.object({
  canais: z.array(esquemaDeCanal).optional(),
  modelo: z.string().trim().min(1).max(60).optional(),
  data: esquemaDeDataCivil.optional(),
});

export const esquemaDeFiltroDeCobrancas = esquemaDePaginacao.extend({
  contratoId: esquemaDeIdentificador.optional(),
  parcelaId: esquemaDeIdentificador.optional(),
  clienteId: esquemaDeIdentificador.optional(),
  status: esquemaDeStatusCobranca.optional(),
  de: esquemaDeDataCivil.optional(),
  ate: esquemaDeDataCivil.optional(),
});

export const esquemaDaRegua = z.object({
  eventos: z
    .array(
      z.object({
        gatilho: esquemaDeGatilho,
        dias: z.number().int().min(0).max(3650).default(0),
        canais: z.array(esquemaDeCanal).min(1, 'Informe ao menos um canal.'),
        modelo: z.string().trim().min(1).max(60),
        emitirDocumento: z.boolean().default(true),
        tipoDeDocumento: esquemaDeTipoDocumento.default('BOLETO_COM_PIX'),
        ativo: z.boolean().default(true),
      }),
    )
    .max(50, 'Uma regua com mais de 50 etapas e sinal de erro de configuracao.'),
});

export const esquemaDeExecucaoDaRegua = z.object({
  data: esquemaDeDataCivil.optional(),
  simular: z.boolean().default(false),
});

export const esquemaDeModeloDeMensagem = z.object({
  assunto: z.string().trim().max(200).nullable().default(null),
  corpo: z.string().trim().min(1, 'O corpo da mensagem nao pode ficar vazio.').max(4000),
});

/**
 * Escala de inadimplencia. Os dois limiares andam juntos porque um sem o outro
 * nao faz sentido — a retomada precisa vir depois da inadimplencia, e essa
 * relacao e validada no dominio.
 */
export const esquemaDaPoliticaDeInadimplencia = z.object({
  diasParaInadimplencia: z.number().int().min(1).max(3650),
  diasParaRetomadaDoLote: z.number().int().min(1).max(3650),
});

export const esquemaDeLogin = z.object({
  email: z.string().trim().email('Informe um e-mail valido.'),
  senha: z.string().min(1, 'Informe a senha.'),
});
