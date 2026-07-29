import type { Usuario } from '../../domain/acesso/usuario.js';
import type { Anexo } from '../../domain/arquivos/anexo.js';
import type { EscopoDoAnexo } from '../../domain/arquivos/tipos.js';
import type { Cliente } from '../../domain/cadastros/cliente.js';
import type { Lote, Quadra, SituacaoLote } from '../../domain/cadastros/lote.js';
import type { Loteamento } from '../../domain/cadastros/loteamento.js';
import type { Cobranca } from '../../domain/cobranca/cobranca.js';
import type { DocumentoDeCobranca } from '../../domain/cobranca/documento-de-cobranca.js';
import type { ReguaDeCobranca } from '../../domain/cobranca/regua-de-cobranca.js';
import type { ModeloDeMensagem } from '../../domain/cobranca/redator-de-mensagens.js';
import type { StatusCobranca } from '../../domain/cobranca/tipos.js';
import type { Contrato } from '../../domain/contratos/contrato.js';
import type { Pagamento } from '../../domain/contratos/pagamento.js';
import type { Parcela } from '../../domain/contratos/parcela.js';
import type { PoliticaDeInadimplencia } from '../../domain/contratos/politica-de-inadimplencia.js';
import type { Renegociacao } from '../../domain/contratos/renegociacao.js';
import type { SituacaoContrato, StatusContrato, StatusParcela } from '../../domain/contratos/tipos.js';
import type { DataCivil } from '../../domain/value-objects/data-civil.js';
import type { Pagina, ParametrosDePaginacao } from './comuns.js';

// ------------------------------------------------------------------ acesso

export interface RepositorioDeUsuarios {
  porId(id: string): Promise<Usuario | null>;
  porEmail(email: string): Promise<Usuario | null>;
  listar(): Promise<Usuario[]>;
  salvar(usuario: Usuario): Promise<void>;
}

// --------------------------------------------------------------- cadastros

export interface FiltroDeClientes extends ParametrosDePaginacao {
  readonly busca?: string;
  readonly ativo?: boolean;
}

export interface RepositorioDeClientes {
  porId(id: string): Promise<Cliente | null>;
  porIds(ids: readonly string[]): Promise<Map<string, Cliente>>;
  porDocumento(digitos: string): Promise<Cliente | null>;
  listar(filtro: FiltroDeClientes): Promise<Pagina<Cliente>>;
  salvar(cliente: Cliente): Promise<void>;
}

export interface RepositorioDeLoteamentos {
  porId(id: string): Promise<Loteamento | null>;
  listar(): Promise<Loteamento[]>;
  salvar(loteamento: Loteamento): Promise<void>;
}

export interface RepositorioDeQuadras {
  porId(id: string): Promise<Quadra | null>;
  porLoteamento(loteamentoId: string): Promise<Quadra[]>;
  salvar(quadra: Quadra): Promise<void>;
}

export interface FiltroDeLotes extends ParametrosDePaginacao {
  readonly loteamentoId?: string;
  readonly quadraId?: string;
  readonly situacao?: SituacaoLote;
  readonly busca?: string;
}

export interface RepositorioDeLotes {
  porId(id: string): Promise<Lote | null>;
  listar(filtro: FiltroDeLotes): Promise<Pagina<Lote>>;
  salvar(lote: Lote): Promise<void>;
}

// --------------------------------------------------------------- contratos

export interface FiltroDeContratos extends ParametrosDePaginacao {
  readonly busca?: string;
  readonly status?: StatusContrato;
  /**
   * Situacao e derivada das parcelas, entao filtrar por ela exige saber a data
   * de referencia — "inadimplente" so faz sentido em relacao a um dia.
   */
  readonly situacao?: SituacaoContrato;
  readonly dataDeReferencia?: DataCivil;
  /** Limiares da escala de inadimplencia; sem eles o filtro cai no padrao (8 e 90). */
  readonly diasParaInadimplencia?: number;
  readonly diasParaRetomadaDoLote?: number;
  readonly clienteId?: string;
  readonly loteamentoId?: string;
  readonly corretorId?: string;
}

export interface RepositorioDeContratos {
  porId(id: string): Promise<Contrato | null>;
  porNumero(numero: string): Promise<Contrato | null>;
  porIds(ids: readonly string[]): Promise<Map<string, Contrato>>;
  listar(filtro: FiltroDeContratos): Promise<Pagina<Contrato>>;
  /** Todos os ativos — usado pelo dashboard e pelos relatorios de posicao. */
  ativos(): Promise<Contrato[]>;
  salvar(contrato: Contrato): Promise<void>;
  /** Maior numero de parcela ja usado no contrato, para a renegociacao continuar a serie. */
  maiorNumeroDeParcela(contratoId: string): Promise<number>;
}

export interface FiltroDeParcelas extends ParametrosDePaginacao {
  readonly contratoId?: string;
  readonly clienteId?: string;
  readonly loteamentoId?: string;
  readonly status?: readonly StatusParcela[];
  readonly vencendoDe?: DataCivil;
  readonly vencendoAte?: DataCivil;
  /** Somente parcelas ainda em aberto (PENDENTE ou PAGA_PARCIAL). */
  readonly somenteEmAberto?: boolean;
}

export interface RepositorioDeParcelas {
  porId(id: string): Promise<Parcela | null>;
  porIds(ids: readonly string[]): Promise<Parcela[]>;
  porContrato(contratoId: string): Promise<Parcela[]>;
  /** Carrega as parcelas de varios contratos de uma vez, evitando N+1 nos paineis. */
  porContratos(contratoIds: readonly string[]): Promise<Map<string, Parcela[]>>;
  listar(filtro: FiltroDeParcelas): Promise<Pagina<Parcela>>;
  /**
   * Todas as parcelas em aberto que vencem na janela — sem paginacao, porque a
   * regua precisa avaliar o ciclo inteiro do dia de uma vez.
   */
  emAbertoComVencimentoEntre(de: DataCivil, ate: DataCivil): Promise<Parcela[]>;
  salvar(parcela: Parcela): Promise<void>;
  salvarVarias(parcelas: readonly Parcela[]): Promise<void>;
  criarVarias(parcelas: readonly Parcela[]): Promise<void>;
}

export interface FiltroDePagamentos extends ParametrosDePaginacao {
  readonly contratoId?: string;
  readonly de?: DataCivil;
  readonly ate?: DataCivil;
  readonly incluirEstornados?: boolean;
}

export interface RepositorioDePagamentos {
  porId(id: string): Promise<Pagamento | null>;
  porParcela(parcelaId: string): Promise<Pagamento[]>;
  listar(filtro: FiltroDePagamentos): Promise<Pagina<Pagamento>>;
  registrar(pagamento: Pagamento): Promise<void>;
  salvar(pagamento: Pagamento): Promise<void>;
  /** Marca todos os pagamentos da parcela como estornados. */
  estornarDaParcela(parcelaId: string): Promise<void>;
}

export interface RepositorioDeRenegociacoes {
  porId(id: string): Promise<Renegociacao | null>;
  porContrato(contratoId: string): Promise<Renegociacao[]>;
  salvar(renegociacao: Renegociacao): Promise<void>;
}

export interface RegistroDeReajuste {
  readonly id: string;
  readonly contratoId: string;
  readonly indice: string;
  readonly percentual: number;
  readonly aplicadoAPartirDe: DataCivil;
  readonly parcelasAfetadas: number;
  readonly registradoPor: string | null;
}

export interface RepositorioDeReajustes {
  porContrato(contratoId: string): Promise<RegistroDeReajuste[]>;
  registrar(reajuste: RegistroDeReajuste): Promise<void>;
}

// ---------------------------------------------------------------- cobranca

export interface FiltroDeCobrancas extends ParametrosDePaginacao {
  readonly contratoId?: string;
  readonly parcelaId?: string;
  readonly clienteId?: string;
  readonly status?: StatusCobranca;
  readonly de?: DataCivil;
  readonly ate?: DataCivil;
}

export interface RepositorioDeCobrancas {
  porId(id: string): Promise<Cobranca | null>;
  listar(filtro: FiltroDeCobrancas): Promise<Pagina<Cobranca>>;
  porContrato(contratoId: string): Promise<Cobranca[]>;
  salvar(cobranca: Cobranca): Promise<void>;
  /**
   * Quais destas chaves ja foram registradas. E o que impede a regua de enviar
   * a mesma etapa duas vezes quando o job roda de novo no mesmo dia.
   */
  chavesJaRegistradas(chaves: readonly string[]): Promise<Set<string>>;
}

export interface RepositorioDeDocumentos {
  porId(id: string): Promise<DocumentoDeCobranca | null>;
  /** O documento ainda valido da parcela, se houver. */
  vigenteDaParcela(parcelaId: string): Promise<DocumentoDeCobranca | null>;
  /** Documentos vigentes de varias parcelas de uma vez. */
  vigentesDasParcelas(parcelaIds: readonly string[]): Promise<Map<string, DocumentoDeCobranca>>;
  porParcela(parcelaId: string): Promise<DocumentoDeCobranca[]>;
  porIdentificadorExterno(provedor: string, identificador: string): Promise<DocumentoDeCobranca | null>;
  salvar(documento: DocumentoDeCobranca): Promise<void>;
}

/** Escala de inadimplencia da loteadora: quando vira inadimplente, quando o lote volta. */
export interface RepositorioDaPoliticaDeInadimplencia {
  obter(): Promise<PoliticaDeInadimplencia>;
  salvar(politica: PoliticaDeInadimplencia): Promise<void>;
}

export interface RepositorioDaRegua {
  obter(): Promise<ReguaDeCobranca>;
  substituir(regua: ReguaDeCobranca): Promise<void>;
}

export interface RepositorioDeModelosDeMensagem {
  porChave(chave: string): Promise<ModeloDeMensagem | null>;
  listar(): Promise<ModeloDeMensagem[]>;
  /** Todos os modelos indexados por chave — a regua usa varios num unico ciclo. */
  mapa(): Promise<Map<string, ModeloDeMensagem>>;
  salvar(modelo: ModeloDeMensagem): Promise<void>;
}

export interface RepositorioDeEventosDeWebhook {
  /** `true` se este evento ja foi gravado antes (webhook duplicado). */
  jaRecebido(provedor: string, identificadorExterno: string, tipo: string): Promise<boolean>;
  registrar(evento: {
    id: string;
    provedor: string;
    identificadorExterno: string;
    tipo: string;
    cargaUtil: unknown;
  }): Promise<void>;
  marcarComoProcessado(id: string, erro?: string): Promise<void>;
}

// ------------------------------------------------------------------ anexos

export interface RepositorioDeAnexos {
  porId(id: string): Promise<Anexo | null>;
  porDono(escopo: EscopoDoAnexo, donoId: string): Promise<Anexo[]>;
  salvar(anexo: Anexo): Promise<void>;
  remover(id: string): Promise<void>;
}

// ------------------------------------------------------------- transacoes

/** Conjunto de repositorios disponivel dentro de uma transacao. */
export interface Repositorios {
  readonly usuarios: RepositorioDeUsuarios;
  readonly clientes: RepositorioDeClientes;
  readonly loteamentos: RepositorioDeLoteamentos;
  readonly quadras: RepositorioDeQuadras;
  readonly lotes: RepositorioDeLotes;
  readonly contratos: RepositorioDeContratos;
  readonly parcelas: RepositorioDeParcelas;
  readonly pagamentos: RepositorioDePagamentos;
  readonly renegociacoes: RepositorioDeRenegociacoes;
  readonly reajustes: RepositorioDeReajustes;
  readonly cobrancas: RepositorioDeCobrancas;
  readonly documentos: RepositorioDeDocumentos;
  readonly regua: RepositorioDaRegua;
  readonly politicaDeInadimplencia: RepositorioDaPoliticaDeInadimplencia;
  readonly modelos: RepositorioDeModelosDeMensagem;
  readonly eventosDeWebhook: RepositorioDeEventosDeWebhook;
  readonly anexos: RepositorioDeAnexos;
}

/**
 * Transacao explicita.
 *
 * Criar contrato e gerar 120 parcelas, ou dar baixa e quitar o contrato, tem
 * que ser tudo ou nada. Esta porta deixa isso visivel no caso de uso sem que
 * ele saiba que por baixo existe um `$transaction` do Prisma.
 */
export interface UnidadeDeTrabalho {
  executar<T>(operacao: (repositorios: Repositorios) => Promise<T>): Promise<T>;
}
