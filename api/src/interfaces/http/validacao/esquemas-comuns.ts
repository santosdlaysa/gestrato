import { z } from 'zod';
import { DataCivil } from '../../../domain/value-objects/data-civil.js';
import { Dinheiro } from '../../../domain/value-objects/dinheiro.js';
import {
  FORMAS_PAGAMENTO,
  INDICES_REAJUSTE,
  PERIODICIDADES,
  SITUACOES_PARCELA,
  STATUS_CONTRATO,
} from '../../../domain/contratos/tipos.js';
import { CANAIS, GATILHOS, STATUS_COBRANCA, TIPOS_DOCUMENTO } from '../../../domain/cobranca/tipos.js';

/**
 * Esquemas de borda: validam e ja convertem para os value objects do dominio.
 *
 * Fazer a conversao aqui significa que o caso de uso recebe `Dinheiro` e
 * `DataCivil`, nunca `number` solto que pode ser reais ou centavos.
 */

export const esquemaDeIdentificador = z.string().uuid('Identificador deve ser um UUID.');

/** Dinheiro trafega sempre em centavos inteiros, conforme o contrato da API. */
export const esquemaDeCentavos = z
  .number({ invalid_type_error: 'Valor deve ser um numero inteiro em centavos.' })
  .int('Valor deve ser inteiro em centavos (sem casas decimais).')
  .transform((centavos) => Dinheiro.deCentavos(centavos));

export const esquemaDeCentavosNaoNegativos = z
  .number()
  .int('Valor deve ser inteiro em centavos.')
  .nonnegative('Valor nao pode ser negativo.')
  .transform((centavos) => Dinheiro.deCentavos(centavos));

export const esquemaDeDataCivil = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD.')
  .transform((texto, contexto) => {
    try {
      return DataCivil.deIso(texto);
    } catch (erro) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        message: erro instanceof Error ? erro.message : 'Data invalida.',
      });
      return z.NEVER;
    }
  });

export const esquemaDePercentual = z
  .number()
  .min(0, 'Percentual nao pode ser negativo.')
  .max(100, 'Percentual nao pode passar de 100.');

export const esquemaDePaginacao = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(200).default(25),
});

export const esquemaDePeriodicidade = z.enum(PERIODICIDADES);
export const esquemaDeFormaPagamento = z.enum(FORMAS_PAGAMENTO);
export const esquemaDeIndiceReajuste = z.enum(INDICES_REAJUSTE);
export const esquemaDeStatusContrato = z.enum(STATUS_CONTRATO);
export const esquemaDeSituacaoParcela = z.enum(SITUACOES_PARCELA);
export const esquemaDeCanal = z.enum(CANAIS);
export const esquemaDeGatilho = z.enum(GATILHOS);
export const esquemaDeStatusCobranca = z.enum(STATUS_COBRANCA);
export const esquemaDeTipoDocumento = z.enum(TIPOS_DOCUMENTO);

/** String opcional que trata "" como ausente — querystring vazia e comum. */
export const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor === '' ? undefined : valor));
