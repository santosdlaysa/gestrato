import type { Request, Response } from 'express';
import { z } from 'zod';
import type { AtualizarCliente } from '../../../application/use-cases/cadastros/atualizar-cliente.js';
import type { AtualizarLote } from '../../../application/use-cases/cadastros/atualizar-lote.js';
import type { CadastrarCliente } from '../../../application/use-cases/cadastros/cadastrar-cliente.js';
import type { CadastrarLote } from '../../../application/use-cases/cadastros/cadastrar-lote.js';
import type { CadastrarLoteamento } from '../../../application/use-cases/cadastros/cadastrar-loteamento.js';
import type { CadastrarQuadra } from '../../../application/use-cases/cadastros/cadastrar-quadra.js';
import type { ListarClientes } from '../../../application/use-cases/cadastros/listar-clientes.js';
import type { ListarLoteamentos } from '../../../application/use-cases/cadastros/listar-loteamentos.js';
import type { ListarLotes } from '../../../application/use-cases/cadastros/listar-lotes.js';
import type { ListarQuadrasDoLoteamento } from '../../../application/use-cases/cadastros/listar-quadras-do-loteamento.js';
import type { ObterCliente } from '../../../application/use-cases/cadastros/obter-cliente.js';
import type { ObterLote } from '../../../application/use-cases/cadastros/obter-lote.js';
import { SITUACOES_LOTE } from '../../../domain/cadastros/lote.js';
import { Email, Telefone } from '../../../domain/value-objects/contato.js';
import { CpfCnpj } from '../../../domain/value-objects/cpf-cnpj.js';
import {
  apresentarCliente,
  apresentarLote,
  apresentarLoteamento,
  apresentarPagina,
  apresentarQuadra,
} from '../apresentadores/cadastros.apresentador.js';
import {
  esquemaDeCentavos,
  esquemaDeDataCivil,
  esquemaDeIdentificador,
  esquemaDePaginacao,
  textoOpcional,
} from '../validacao/esquemas-comuns.js';

/**
 * Borda HTTP dos cadastros: valida a entrada, converte para os value objects
 * do dominio, chama o caso de uso e apresenta. Nenhuma regra mora aqui.
 */

/** Deixa a mensagem do value object virar um problema de validacao do zod, com o caminho do campo. */
function converterPara<E, S>(fabrica: (valor: E) => S) {
  return (valor: E, contexto: z.RefinementCtx): S => {
    try {
      return fabrica(valor);
    } catch (erro) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        message: erro instanceof Error ? erro.message : 'Valor invalido.',
      });
      return z.NEVER;
    }
  };
}

const esquemaDeDocumento = z.string().transform(converterPara((texto: string) => CpfCnpj.de(texto)));
const esquemaDeEmail = z
  .string()
  .nullable()
  .transform(converterPara((texto: string | null) => Email.opcional(texto)));
const esquemaDeTelefone = z
  .string()
  .nullable()
  .transform(converterPara((texto: string | null) => Telefone.opcional(texto)));

/** Endereco chega completo: campo omitido vira vazio, como a coluna guarda. */
const esquemaDeEndereco = z.object({
  logradouro: z.string().trim().default(''),
  numero: z.string().trim().default(''),
  complemento: z.string().trim().nullable().default(null),
  bairro: z.string().trim().default(''),
  cidade: z.string().trim().default(''),
  uf: z.string().trim().default(''),
  cep: z.string().trim().default(''),
});

const textoNulavelOpcional = z.string().trim().nullable().optional();

const corpoDeCadastroDeCliente = z.object({
  nome: z.string().trim(),
  documento: esquemaDeDocumento,
  email: esquemaDeEmail.optional(),
  telefone: esquemaDeTelefone.optional(),
  whatsapp: esquemaDeTelefone.optional(),
  dataNascimento: esquemaDeDataCivil.nullable().optional(),
  endereco: esquemaDeEndereco.default({}),
  observacoes: textoNulavelOpcional,
});

const corpoDeAtualizacaoDeCliente = z.object({
  nome: z.string().trim().optional(),
  email: esquemaDeEmail.optional(),
  telefone: esquemaDeTelefone.optional(),
  whatsapp: esquemaDeTelefone.optional(),
  dataNascimento: esquemaDeDataCivil.nullable().optional(),
  endereco: esquemaDeEndereco.optional(),
  observacoes: textoNulavelOpcional,
  ativo: z.boolean().optional(),
});

const corpoDeCadastroDeLoteamento = z.object({
  nome: z.string().trim(),
  cidade: z.string().trim(),
  uf: z.string().trim(),
  registroImobiliario: textoNulavelOpcional,
});

const corpoDeCadastroDeQuadra = z.object({ nome: z.string().trim() });

// `situacao` nao aparece de proposito: quem muda a situacao do lote e o
// contrato (venda/distrato). Campo desconhecido no corpo e simplesmente ignorado.
const corpoDeCadastroDeLote = z.object({
  quadraId: esquemaDeIdentificador,
  numero: z.string().trim(),
  areaEmMetrosQuadrados: z.number(),
  valorDeTabelaCentavos: esquemaDeCentavos.nullable().optional(),
  descricao: textoNulavelOpcional,
});

const corpoDeAtualizacaoDeLote = z.object({
  numero: z.string().trim().optional(),
  areaEmMetrosQuadrados: z.number().optional(),
  valorDeTabelaCentavos: esquemaDeCentavos.nullable().optional(),
  descricao: textoNulavelOpcional,
});

/** Querystring nao tem tipos: "" significa filtro ausente, nao valor invalido. */
const identificadorNaConsulta = textoOpcional.pipe(esquemaDeIdentificador.optional());
const booleanoNaConsulta = textoOpcional
  .pipe(z.enum(['true', 'false']).optional())
  .transform((valor) => (valor === undefined ? undefined : valor === 'true'));

const consultaDeClientes = esquemaDePaginacao.extend({
  busca: textoOpcional,
  ativo: booleanoNaConsulta,
});

const consultaDeLotes = esquemaDePaginacao.extend({
  loteamentoId: identificadorNaConsulta,
  quadraId: identificadorNaConsulta,
  situacao: textoOpcional.pipe(z.enum(SITUACOES_LOTE).optional()),
  busca: textoOpcional,
});

const parametroDeId = z.object({ id: esquemaDeIdentificador });

export interface CasosDeUsoDeCadastros {
  readonly cadastrarCliente: CadastrarCliente;
  readonly atualizarCliente: AtualizarCliente;
  readonly listarClientes: ListarClientes;
  readonly obterCliente: ObterCliente;
  readonly cadastrarLoteamento: CadastrarLoteamento;
  readonly listarLoteamentos: ListarLoteamentos;
  readonly cadastrarQuadra: CadastrarQuadra;
  readonly listarQuadrasDoLoteamento: ListarQuadrasDoLoteamento;
  readonly cadastrarLote: CadastrarLote;
  readonly atualizarLote: AtualizarLote;
  readonly listarLotes: ListarLotes;
  readonly obterLote: ObterLote;
}

export class ControladorDeCadastros {
  constructor(private readonly casosDeUso: CasosDeUsoDeCadastros) {}

  // ------------------------------------------------------------- clientes

  async listarClientes(requisicao: Request, resposta: Response): Promise<void> {
    const filtro = consultaDeClientes.parse(requisicao.query);
    const pagina = await this.casosDeUso.listarClientes.executar(filtro);
    resposta.json(apresentarPagina(pagina, apresentarCliente));
  }

  async cadastrarCliente(requisicao: Request, resposta: Response): Promise<void> {
    const corpo = corpoDeCadastroDeCliente.parse(requisicao.body);
    const cliente = await this.casosDeUso.cadastrarCliente.executar(corpo);
    resposta.status(201).json(apresentarCliente(cliente));
  }

  async obterCliente(requisicao: Request, resposta: Response): Promise<void> {
    const { id } = parametroDeId.parse(requisicao.params);
    const cliente = await this.casosDeUso.obterCliente.executar({ id });
    resposta.json(apresentarCliente(cliente));
  }

  async atualizarCliente(requisicao: Request, resposta: Response): Promise<void> {
    const { id } = parametroDeId.parse(requisicao.params);
    const corpo = corpoDeAtualizacaoDeCliente.parse(requisicao.body);
    const cliente = await this.casosDeUso.atualizarCliente.executar({ id, ...corpo });
    resposta.json(apresentarCliente(cliente));
  }

  // ---------------------------------------------------------- loteamentos

  async listarLoteamentos(_requisicao: Request, resposta: Response): Promise<void> {
    const loteamentos = await this.casosDeUso.listarLoteamentos.executar();
    resposta.json(loteamentos.map(apresentarLoteamento));
  }

  async cadastrarLoteamento(requisicao: Request, resposta: Response): Promise<void> {
    const corpo = corpoDeCadastroDeLoteamento.parse(requisicao.body);
    const loteamento = await this.casosDeUso.cadastrarLoteamento.executar(corpo);
    resposta.status(201).json(apresentarLoteamento(loteamento));
  }

  async listarQuadras(requisicao: Request, resposta: Response): Promise<void> {
    const { id } = parametroDeId.parse(requisicao.params);
    const quadras = await this.casosDeUso.listarQuadrasDoLoteamento.executar({ loteamentoId: id });
    resposta.json(quadras.map(apresentarQuadra));
  }

  async cadastrarQuadra(requisicao: Request, resposta: Response): Promise<void> {
    const { id } = parametroDeId.parse(requisicao.params);
    const corpo = corpoDeCadastroDeQuadra.parse(requisicao.body);
    const quadra = await this.casosDeUso.cadastrarQuadra.executar({ loteamentoId: id, nome: corpo.nome });
    resposta.status(201).json(apresentarQuadra(quadra));
  }

  // ---------------------------------------------------------------- lotes

  async listarLotes(requisicao: Request, resposta: Response): Promise<void> {
    const filtro = consultaDeLotes.parse(requisicao.query);
    const pagina = await this.casosDeUso.listarLotes.executar(filtro);
    resposta.json(apresentarPagina(pagina, apresentarLote));
  }

  async cadastrarLote(requisicao: Request, resposta: Response): Promise<void> {
    const corpo = corpoDeCadastroDeLote.parse(requisicao.body);
    const detalhado = await this.casosDeUso.cadastrarLote.executar({
      quadraId: corpo.quadraId,
      numero: corpo.numero,
      areaEmMetrosQuadrados: corpo.areaEmMetrosQuadrados,
      valorDeTabela: corpo.valorDeTabelaCentavos,
      descricao: corpo.descricao,
    });
    resposta.status(201).json(apresentarLote(detalhado));
  }

  async obterLote(requisicao: Request, resposta: Response): Promise<void> {
    const { id } = parametroDeId.parse(requisicao.params);
    const detalhado = await this.casosDeUso.obterLote.executar({ id });
    resposta.json(apresentarLote(detalhado));
  }

  async atualizarLote(requisicao: Request, resposta: Response): Promise<void> {
    const { id } = parametroDeId.parse(requisicao.params);
    const corpo = corpoDeAtualizacaoDeLote.parse(requisicao.body);
    const detalhado = await this.casosDeUso.atualizarLote.executar({
      id,
      numero: corpo.numero,
      areaEmMetrosQuadrados: corpo.areaEmMetrosQuadrados,
      valorDeTabela: corpo.valorDeTabelaCentavos,
      descricao: corpo.descricao,
    });
    resposta.json(apresentarLote(detalhado));
  }
}
