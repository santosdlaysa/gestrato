import type { LoteDetalhado } from '../../../application/use-cases/cadastros/contexto-de-lotes.js';
import type { Pagina } from '../../../application/ports/comuns.js';
import type { Cliente } from '../../../domain/cadastros/cliente.js';
import type { Quadra, SituacaoLote } from '../../../domain/cadastros/lote.js';
import type { Loteamento } from '../../../domain/cadastros/loteamento.js';
import type { TipoPessoa } from '../../../domain/value-objects/cpf-cnpj.js';

/**
 * Entidade -> JSON do contrato da API.
 *
 * Documento e telefone saem sempre so com digitos (forma canonica para o
 * front-end comparar e reenviar); a versao com mascara vai junto, pronta para
 * exibir, para nenhuma tela precisar reimplementar a formatacao.
 */

export interface EnderecoJson {
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface ClienteJson {
  id: string;
  nome: string;
  documento: string;
  documentoFormatado: string;
  tipoPessoa: TipoPessoa;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  dataNascimento: string | null;
  endereco: EnderecoJson;
  observacoes: string | null;
  ativo: boolean;
}

export interface LoteamentoJson {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  registroImobiliario: string | null;
  ativo: boolean;
}

export interface QuadraJson {
  id: string;
  loteamentoId: string;
  nome: string;
}

export interface LoteJson {
  id: string;
  quadraId: string;
  quadra: string;
  loteamentoId: string;
  loteamento: string;
  numero: string;
  areaEmMetrosQuadrados: number;
  valorDeTabelaCentavos: number | null;
  situacao: SituacaoLote;
  descricao: string | null;
}

export interface PaginaJson<T> {
  itens: T[];
  total: number;
  pagina: number;
  porPagina: number;
  totalDePaginas: number;
}

export function apresentarCliente(cliente: Cliente): ClienteJson {
  const estado = cliente.paraEstado();
  return {
    id: estado.id.paraString(),
    nome: estado.nome,
    documento: estado.documento.digitos,
    documentoFormatado: estado.documento.formatar(),
    tipoPessoa: estado.documento.tipoPessoa,
    email: estado.email?.valor ?? null,
    telefone: estado.telefone?.digitos ?? null,
    whatsapp: estado.whatsapp?.digitos ?? null,
    dataNascimento: estado.dataNascimento?.paraIso() ?? null,
    endereco: { ...estado.endereco },
    observacoes: estado.observacoes,
    ativo: estado.ativo,
  };
}

export function apresentarLoteamento(loteamento: Loteamento): LoteamentoJson {
  const estado = loteamento.paraEstado();
  return {
    id: estado.id.paraString(),
    nome: estado.nome,
    cidade: estado.cidade,
    uf: estado.uf,
    registroImobiliario: estado.registroImobiliario,
    ativo: estado.ativo,
  };
}

export function apresentarQuadra(quadra: Quadra): QuadraJson {
  const estado = quadra.paraEstado();
  return {
    id: estado.id.paraString(),
    loteamentoId: estado.loteamentoId.paraString(),
    nome: estado.nome,
  };
}

export function apresentarLote(detalhado: LoteDetalhado): LoteJson {
  const estado = detalhado.lote.paraEstado();
  return {
    id: estado.id.paraString(),
    quadraId: estado.quadraId.paraString(),
    quadra: detalhado.quadra.nome,
    loteamentoId: detalhado.loteamento.id.paraString(),
    loteamento: detalhado.loteamento.nome,
    numero: estado.numero,
    areaEmMetrosQuadrados: estado.areaEmMetrosQuadrados,
    valorDeTabelaCentavos: estado.valorDeTabela?.centavos ?? null,
    situacao: estado.situacao,
    descricao: estado.descricao,
  };
}

export function apresentarPagina<T, U>(pagina: Pagina<T>, apresentar: (item: T) => U): PaginaJson<U> {
  return {
    itens: pagina.itens.map(apresentar),
    total: pagina.total,
    pagina: pagina.pagina,
    porPagina: pagina.porPagina,
    totalDePaginas: pagina.totalDePaginas,
  };
}
